import React, { useState, useEffect, useCallback } from 'react';
import { Pizza, Plus, Trash2, Lightbulb, Check, ArrowRightLeft, BookPlus } from 'lucide-react';
import api from '../services/api';
import LabShell from '../components/lab/LabShell';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { Portal } from '../utils/autoPlacement';

const GROUPS = [
  { key: 'vegetables', label: 'Veggies', emoji: '🥦', color: 'bg-green-500' },
  { key: 'fruits', label: 'Fruits', emoji: '🍎', color: 'bg-red-400' },
  { key: 'protein', label: 'Protein', emoji: '🍗', color: 'bg-orange-500' },
  { key: 'grains', label: 'Grains', emoji: '🍞', color: 'bg-amber-400' },
  { key: 'dairy', label: 'Dairy', emoji: '🥛', color: 'bg-sky-400' },
  { key: 'extras', label: 'Extras', emoji: '🍪', color: 'bg-fuchsia-400' },
  { key: 'beverages', label: 'Drinks', emoji: '🥤', color: 'bg-cyan-400' },
];

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const groupMeta = (k) => GROUPS.find((g) => g.key === k) || { label: k, emoji: '🍽️', color: 'bg-gray-400' };

const PlateLab = () => {
  const { success, error: showError, toasts, hideToast } = useToast();
  const [members, setMembers] = useState([]);
  const [services, setServices] = useState([]);
  const [memberId, setMemberId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recommend, setRecommend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ item_name: '', meal_type: 'lunch', servings: '1' });
  const [detected, setDetected] = useState(null);
  const [adding, setAdding] = useState(false);

  const loadPlate = useCallback(async (mid = memberId) => {
    try {
      const q = mid ? `?member_id=${mid}` : '';
      const { data } = await api.get(`/plate/today${q}`);
      setEntries(data.entries || []);
      setSummary(data.summary || null);
    } catch { showError('Could not load plate'); }
  }, [memberId, showError]);

  const loadRecommend = useCallback(async (mid = memberId) => {
    try {
      const q = mid ? `?member_id=${mid}` : '';
      const { data } = await api.get(`/plate/recommend${q}`);
      setRecommend(data);
    } catch { /* recommendations are nice-to-have */ }
  }, [memberId]);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: m }, { data: s }] = await Promise.all([
          api.get('/plate/members'), api.get('/plate/services'),
        ]);
        setMembers(m || []);
        setServices((s || []).filter((x) => x.active));
        await Promise.all([loadPlate(null), loadRecommend(null)]);
      } catch { showError('Could not load Plate Lab'); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectMember = async (mid) => {
    setMemberId(mid);
    await Promise.all([loadPlate(mid), loadRecommend(mid)]);
  };

  const setService = async (mid, service) => {
    try {
      await api.put(`/plate/member/${mid}/service`, { service });
      setMembers((p) => p.map((m) => (m.id === mid ? { ...m, health_service: service } : m)));
      await loadPlate(mid);
      success(`Scoring switched to ${service}`);
    } catch { showError('Could not switch scoring service'); }
  };

  // Live group preview as the user types
  useEffect(() => {
    const t = setTimeout(async () => {
      const name = form.item_name.trim();
      if (name.length < 3) { setDetected(null); return; }
      try {
        const { data } = await api.get(`/mdl/categorize/${encodeURIComponent(name)}`);
        setDetected(data?.category || null);
      } catch { setDetected(null); }
    }, 350);
    return () => clearTimeout(t);
  }, [form.item_name]);

  const addEntry = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) return;
    setAdding(true);
    try {
      const { data } = await api.post('/plate/entry', {
        member_id: memberId,
        meal_type: form.meal_type,
        item_name: form.item_name.trim(),
        servings: parseFloat(form.servings) || 1,
        category: detected,
      });
      setEntries((p) => [...p, data]);
      setForm({ item_name: '', meal_type: form.meal_type, servings: '1' });
      setDetected(null);
      await Promise.all([loadPlate(), loadRecommend()]);
      success('Added to plate');
    } catch { showError('Could not add entry'); }
    finally { setAdding(false); }
  };

  const removeEntry = async (id) => {
    try {
      await api.delete(`/plate/entry/${id}`);
      setEntries((p) => p.filter((e) => e.id !== id));
      await loadPlate();
    } catch { showError('Could not remove entry'); }
  };

  const [savingMeal, setSavingMeal] = useState(null);

  /** Save a meal group's logged items as a recipe in the Recipe Book. */
  const saveMealAsRecipe = async (meal, mealEntries) => {
    setSavingMeal(meal);
    try {
      const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const name = `${meal[0].toUpperCase() + meal.slice(1)} — ${today}`;
      await api.post('/recipes', {
        name,
        description: `Logged in Plate Lab on ${today}`,
        category: meal,
        difficulty: 'easy',
        servings: 1,
        image_url: `emoji:${{ breakfast: '🍳', lunch: '🥗', dinner: '🍽️', snack: '🍿' }[meal] || '🍽️'}`,
        tags: ['plate-lab'],
        ingredients: mealEntries.map((e) => ({
          item_name: e.item_name,
          quantity: parseFloat(e.servings) || 1,
          unit: 'serving',
        })),
      });
      success(`"${name}" saved to Recipe Book`);
    } catch { showError('Could not save meal to Recipe Book'); }
    finally { setSavingMeal(null); }
  };

  const current = members.find((m) => m.id === memberId) || members[0];
  const totalServings = summary?.totalServings || 0;
  const score = summary?.plate_score;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading plates...</div>
      </div>
    );
  }

  return (
    <LabShell
      icon={Pizza}
      gradient="from-violet-500 to-purple-600"
      accent="purple"
      title="Plate"
      subtitle={current ? `${current.name}'s plate today${summary ? ` · ${summary.calories} kcal${score != null ? ` · score ${score}` : ''}` : ''}` : 'Balanced plates, per person'}
      tabs={[{ id: 'plate', label: "Today's Plate", icon: Pizza, count: entries.length }]}
      activeTab="plate"
      onTabChange={() => {}}
      maxWidth="max-w-5xl"
    >
      {/* Member chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {members.map((m) => (
          <button
            key={m.id ?? 'you'}
            onClick={() => selectMember(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
              m.id === memberId
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-violet-300'
            }`}
          >
            <span>{m.avatar_emoji || '😀'}</span>{m.name}
          </button>
        ))}
        {current?.id && services.length > 1 && (
          <select
            value={current.health_service || 'legacy'}
            onChange={(e) => setService(current.id, e.target.value)}
            title="Health-scoring service"
            className="ml-auto text-[11px] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            {services.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Plate visualization */}
      <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Today's balance</h3>
          {score != null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : score >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
              Plate score {score}
            </span>
          )}
        </div>

        {totalServings === 0 ? (
          <p className="text-xs text-gray-400 py-3">Nothing logged yet — add the first item below.</p>
        ) : (
          <>
            <div className="flex h-6 rounded-full overflow-hidden mb-2">
              {GROUPS.map((g) => {
                const s = summary.groupServings[g.key] || 0;
                if (!s) return null;
                return (
                  <div key={g.key} title={`${g.label}: ${s} serving${s > 1 ? 's' : ''}`}
                    className={`${g.color} transition-all`}
                    style={{ width: `${(s / totalServings) * 100}%` }} />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
              {GROUPS.map((g) => {
                const s = summary.groupServings[g.key] || 0;
                if (!s) return null;
                return <span key={g.key}>{g.emoji} {g.label} {Math.round(s * 10) / 10}</span>;
              })}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full"
                  style={{ width: `${Math.min(100, (summary.calories / (summary.target || 2000)) * 100)}%` }} />
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {summary.calories} / {summary.target} kcal
              </span>
            </div>
            <div className="mt-2 flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
              <div className="bg-orange-400" style={{ width: `${summary.macros.protein_pct}%` }} title={`Protein ${summary.macros.protein_pct}%`} />
              <div className="bg-amber-500" style={{ width: `${summary.macros.fat_pct}%` }} title={`Fat ${summary.macros.fat_pct}%`} />
              <div className="bg-sky-400" style={{ width: `${summary.macros.carb_pct}%` }} title={`Carbs ${summary.macros.carb_pct}%`} />
            </div>
            <p className="mt-1 text-[10px] text-gray-400">
              protein {summary.macros.protein_pct}% · fat {summary.macros.fat_pct}% · carbs {summary.macros.carb_pct}% (estimated)
            </p>
          </>
        )}
      </div>

      {/* Add entry */}
      <form onSubmit={addEntry} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap gap-2">
          <input
            value={form.item_name}
            onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
            placeholder="What did you eat? (e.g. grilled chicken)"
            className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
          />
          <select value={form.meal_type} onChange={(e) => setForm((f) => ({ ...f, meal_type: e.target.value }))}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
            {MEALS.map((m) => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
          </select>
          <input value={form.servings} onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))}
            type="number" min="0.25" step="0.25" className="w-20 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" />
          <button type="submit" disabled={adding || !form.item_name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-40 transition-colors">
            <Plus className="w-4 h-4" /> {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        {detected && <p className="mt-1.5 text-[11px] text-gray-400">Detected category: {detected} — food group resolved automatically</p>}
      </form>

      {/* Entries by meal */}
      {entries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4">
          {MEALS.map((meal) => {
            const mealEntries = entries.filter((e) => e.meal_type === meal);
            if (!mealEntries.length) return null;
            return (
              <div key={meal} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-1">{meal}</p>
                  <button
                    onClick={() => saveMealAsRecipe(meal, mealEntries)}
                    disabled={savingMeal === meal}
                    title="Save this meal as a recipe"
                    className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-40 transition-colors"
                  >
                    <BookPlus className="w-3 h-3" /> {savingMeal === meal ? 'Saving…' : 'To Recipe Book'}
                  </button>
                </div>
                {mealEntries.map((e) => {
                  const g = groupMeta(e.food_group);
                  return (
                    <div key={e.id} className="flex items-center gap-2 py-1 text-sm text-gray-800 dark:text-gray-100">
                      <span>{g.emoji}</span>
                      <span className="flex-1 truncate">{e.item_name}
                        <span className="ml-1 text-[10px] text-gray-400">×{parseFloat(e.servings)} · {e.calories} kcal</span>
                      </span>
                      <button onClick={() => removeEntry(e.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      {recommend && (recommend.suggestions.length > 0 || recommend.swaps.length > 0 || recommend.missing_groups?.length > 0) && (
        <div className="bg-white dark:bg-gray-800 border-2 border-violet-200 dark:border-violet-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Balance suggestions</h3>
          </div>
          {recommend.missing_groups?.length > 0 && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
              Missing today: {recommend.missing_groups.map((g) => `${groupMeta(g).emoji} ${groupMeta(g).label}`).join('  ')}
            </p>
          )}
          <div className="space-y-1.5">
            {recommend.suggestions.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                <span className={`w-4 text-center ${s.canMake ? 'text-green-500' : 'text-gray-300'}`}>
                  {s.canMake ? <Check className="w-3.5 h-3.5 inline" /> : '·'}
                </span>
                <span className="flex-1 truncate">{s.name}
                  <span className="ml-1 text-[10px] text-violet-500">covers {groupMeta(s.covers).label}</span>
                  {s.canMake && <span className="ml-1 text-[10px] text-green-500">makeable now</span>}
                </span>
              </div>
            ))}
          </div>
          {recommend.swaps.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
              {recommend.swaps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <ArrowRightLeft className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  <span className="truncate">{s.from} → try {s.to}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Portal><div className="fixed bottom-4 right-4 z-[120] space-y-2">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => hideToast(t.id)} />
        ))}
      </div></Portal>
    </LabShell>
  );
};

export default PlateLab;
