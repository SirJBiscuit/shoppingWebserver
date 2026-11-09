import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Pencil, ChevronLeft, ChevronRight,
  TrendingUp, DollarSign, Leaf, X, RotateCcw
} from 'lucide-react';
import householdAPI from '../../services/householdAPI';
import CustomDatePicker from '../CustomDatePicker';
import ConfirmModal from '../../limbo/modals/ConfirmModal';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const inputCls = 'w-full px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none text-sm transition-colors';

const emptyForm = () => ({
  id: null, member_id: '', restaurant: '', items: [{ name: '', price: '' }],
  total_cost: '', ordered_for: '', notes: '', eaten_on: new Date().toISOString().slice(0, 10)
});

const EatOutPanel = ({ members }) => {
  const [logs, setLogs] = useState([]);
  const [patterns, setPatterns] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [deleteLog, setDeleteLog] = useState(null);
  const [houseRoll, setHouseRoll] = useState(null);
  const [rolling, setRolling] = useState(false);

  const load = useCallback(async () => {
    const [l, p] = await Promise.all([
      householdAPI.getEatOutLogs(),
      householdAPI.getEatOutPatterns().catch(() => ({ data: null }))
    ]);
    setLogs(l.data);
    setPatterns(p.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveLog = async (e) => {
    e.preventDefault();
    if (!form.restaurant.trim()) return;
    const payload = {
      member_id: form.member_id || null,
      restaurant: form.restaurant,
      items: form.items.filter(i => i.name.trim()).map(i => ({
        name: i.name.trim(), price: i.price ? parseFloat(i.price) : null
      })),
      total_cost: form.total_cost ? parseFloat(form.total_cost) : null,
      ordered_for: form.ordered_for || null,
      notes: form.notes || null,
      eaten_on: form.eaten_on
    };
    if (form.id) await householdAPI.updateEatOut(form.id, payload);
    else await householdAPI.logEatOut(payload);
    setForm(emptyForm());
    setShowForm(false);
    await load();
  };

  const editLog = (log) => {
    setForm({
      id: log.id, member_id: log.member_id || '', restaurant: log.restaurant,
      items: (log.items?.length ? log.items : [{ name: '', price: '' }])
        .map(i => ({ name: i.name || i, price: i.price ?? '' })),
      total_cost: log.total_cost ?? '', ordered_for: log.ordered_for || '',
      notes: log.notes || '', eaten_on: log.eaten_on?.slice(0, 10)
    });
    setShowForm(true);
  };

  // "Order the usual" — prefill from a learned pattern's top dishes
  const repeatOrder = (p) => {
    setForm({
      ...emptyForm(),
      member_id: p.member_id || '',
      restaurant: p.restaurant,
      items: p.top_dishes.length
        ? p.top_dishes.map(d => ({ name: d.name, price: '' }))
        : [{ name: '', price: '' }],
      total_cost: p.avg_spend ?? '',
      ordered_for: p.ordered_for || ''
    });
    setShowForm(true);
  };

  const rollHousehold = async () => {
    setRolling(true);
    setHouseRoll(null);
    try {
      const res = await householdAPI.getHouseholdRandomFood();
      setTimeout(() => { setHouseRoll(res.data); setRolling(false); }, 650);
    } catch { setRolling(false); }
  };

  // ---- calendar grid ----
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDow = month.getDay();
  const logsByDay = {};
  logs.forEach(l => {
    const key = l.eaten_on.slice(0, 10);
    (logsByDay[key] = logsByDay[key] || []).push(l);
  });
  const monthKey = (d) =>
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const predictedSet = new Set((patterns?.predicted_days || []).map(d => d.dow));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          🍔 Eating Out Planner
        </h3>
        <button onClick={() => { setForm(emptyForm()); setShowForm(!showForm); }}
          className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Close' : 'Log a run'}
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Track restaurant/delivery runs — the app learns your household's usual nights, who orders what, and how to save.
      </p>

      {/* ---------- log form ---------- */}
      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} onSubmit={saveLog}
            className="overflow-hidden bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4 mb-4 border border-orange-200 dark:border-orange-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <input className={inputCls} placeholder="Restaurant (e.g. Taco Bell)" value={form.restaurant}
                onChange={(e) => setForm({ ...form, restaurant: e.target.value })} />
              <select className={inputCls} value={form.member_id}
                onChange={(e) => setForm({ ...form, member_id: e.target.value })}>
                <option value="">🏠 Whole household</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.avatar_emoji} {m.name}</option>)}
              </select>
              <input className={inputCls} placeholder="Ordered for (optional, e.g. kids)" value={form.ordered_for}
                onChange={(e) => setForm({ ...form, ordered_for: e.target.value })} />
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomDatePicker value={form.eaten_on} onChange={(v) => setForm({ ...form, eaten_on: v })} />
                </div>
                <input className={`${inputCls} w-24`} type="number" step="0.01" placeholder="$ total" value={form.total_cost}
                  onChange={(e) => setForm({ ...form, total_cost: e.target.value })} />
              </div>
            </div>
            {form.items.map((it, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className={`${inputCls} flex-1`} placeholder={`Item ${i + 1} (e.g. Crunchwrap)`} value={it.name}
                  onChange={(e) => setForm({ ...form, items: form.items.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} />
                <input className={`${inputCls} w-20`} type="number" step="0.01" placeholder="$" value={it.price}
                  onChange={(e) => setForm({ ...form, items: form.items.map((x, j) => j === i ? { ...x, price: e.target.value } : x) })} />
                {form.items.length > 1 && (
                  <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}
                    className="p-2 text-red-400"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { name: '', price: '' }] })}
                className="px-3 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors">
                + item
              </button>
              <button type="submit" className="ml-auto px-5 py-2 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors">
                {form.id ? 'Update' : 'Log it'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ---------- calendar ---------- */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
              {month.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {DOW.map((d, i) => (
              <div key={d} className={`text-[10px] font-bold py-1 ${predictedSet.has(i) ? 'text-orange-500' : 'text-gray-400'}`}>
                {d}{predictedSet.has(i) && '⭐'}
              </div>
            ))}
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayLogs = logsByDay[monthKey(day)] || [];
              const isPredicted = predictedSet.has(new Date(month.getFullYear(), month.getMonth(), day).getDay());
              return (
                <div key={day} title={dayLogs.map(l => `${l.restaurant}${l.member_name ? ` (${l.member_name})` : ''}`).join('\n')}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative
                    ${dayLogs.length ? 'font-bold' : ''} ${isPredicted && !dayLogs.length ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' : 'text-gray-600 dark:text-gray-400'}`}>
                  {day}
                  {dayLogs.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayLogs.slice(0, 3).map((l, j) => (
                        <span key={j} className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: l.member_color || '#f97316' }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            ⭐ = usual eat-out days · dots colored by member · hover a day for details
          </p>
        </div>

        {/* ---------- patterns ---------- */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {(patterns?.monthly_estimate?.monthly_spend > 0) && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white">
              <p className="text-sm font-bold flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> Eat-out spend ≈ ${patterns.monthly_estimate.monthly_spend}/mo
              </p>
              <p className="text-xs opacity-90 mt-1">
                Cooking similar meals at home could save ~<b>${Math.max(0, patterns.monthly_estimate.potential_savings)}/mo</b> — no pressure, just math!
              </p>
            </div>
          )}

          {(patterns?.restaurant_patterns || []).map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.avatar_emoji || '🏠'}</span>
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      {p.restaurant}
                      {p.member_name && <span className="font-normal text-gray-500"> · {p.member_name}</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.visits}× · {p.usual_day ? `usually ${p.usual_day}s` : 'no usual day yet'}
                      {p.avg_spend != null && ` · ~$${p.avg_spend}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => repeatOrder(p)} title="Order the usual again"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-semibold hover:bg-orange-200 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> the usual
                </button>
              </div>
              {p.top_dishes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {p.top_dishes.map(d => (
                    <span key={d.name} title={d.swap ? `Lighter idea: ${d.swap}` : null}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      {d.name}
                      {d.swap && <Leaf className="w-3 h-3 text-green-500" title={`Lighter: ${d.swap}`} />}
                    </span>
                  ))}
                </div>
              )}
              {p.top_dishes.some(d => d.swap) && (
                <p className="text-[10px] text-green-600 dark:text-green-400 mt-1.5">
                  🌿 {p.top_dishes.find(d => d.swap)?.name} → {p.top_dishes.find(d => d.swap)?.swap}
                </p>
              )}
            </motion.div>
          ))}

          {(patterns?.restaurant_patterns || []).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              Log your first restaurant run and patterns will appear here.
            </p>
          )}

          {/* Household randomizer */}
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white">
            <p className="text-sm font-bold flex items-center gap-1.5 mb-1"><TrendingUp className="w-4 h-4" /> Can't decide? Stay in!</p>
            <p className="text-xs opacity-90 mb-3">Weighted pick across everyone's liked foods.</p>
            <div className="flex items-center gap-3 flex-wrap">
              <motion.button whileTap={{ scale: 0.9, rotate: 12 }} onClick={rollHousehold} disabled={rolling}
                className="px-4 py-2 bg-white text-purple-600 rounded-lg text-sm font-bold disabled:opacity-60">
                {rolling ? '🎲 Rolling…' : '🎲 Household pick'}
              </motion.button>
              <AnimatePresence>
                {houseRoll?.food && (
                  <motion.div key={houseRoll.food.food_name + Date.now()}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}
                    className="bg-white/20 rounded-lg px-3 py-2">
                    <p className="font-bold text-sm">{houseRoll.food.food_name}</p>
                    <p className="text-[10px] opacity-90">
                      for {(houseRoll.food.fans || []).map(f => f.emoji).join(' ')}
                    </p>
                  </motion.div>
                )}
                {houseRoll && !houseRoll.food && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs">{houseRoll.message}</motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- recent log list ---------- */}
      {logs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Recent runs</h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {logs.slice(0, 10).map(l => (
              <div key={l.id} className="group flex items-center gap-2 text-sm">
                <span className="text-base">{l.avatar_emoji || '🏠'}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{l.restaurant}</span>
                <span className="text-xs text-gray-400 flex-1">
                  {new Date(l.eaten_on + 'T00:00:00').toLocaleDateString()}
                  {l.items?.length > 0 && ` · ${l.items.map(i => i.name || i).filter(Boolean).slice(0, 2).join(', ')}`}
                </span>
                {l.total_cost != null && <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">${parseFloat(l.total_cost).toFixed(2)}</span>}
                <button onClick={() => editLog(l)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-500 transition-opacity">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteLog(l)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteLog}
        title={`Delete ${deleteLog?.restaurant} run?`}
        message="This removes it from your pattern history."
        confirmText="Delete" type="danger"
        onConfirm={async () => {
          await householdAPI.deleteEatOut(deleteLog.id);
          setDeleteLog(null); load();
        }}
        onCancel={() => setDeleteLog(null)}
      />
    </div>
  );
};

export default EatOutPanel;
