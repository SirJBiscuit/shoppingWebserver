import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Droplets, Flame, Activity, ArrowLeft, Dices,
  Trash2, Plus, Check, ShoppingBag, Heart, Frown, Zap, Repeat,
  Pencil, Scale, AlertTriangle
} from 'lucide-react';
import householdAPI from '../services/householdAPI';
import HouseholdMemberModal from '../components/HouseholdMemberModal';
import ConfirmModal from '../limbo/modals/ConfirmModal';
import EatOutPanel from '../components/household/EatOutPanel';
import Sidebar from '../components/Sidebar';

const TIER_COLORS = {
  S: 'bg-yellow-400 text-yellow-900',
  A: 'bg-orange-400 text-orange-900',
  B: 'bg-green-400 text-green-900',
  C: 'bg-sky-400 text-sky-900',
  D: 'bg-purple-400 text-purple-900',
  F: 'bg-gray-400 text-gray-900'
};
const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'];
const BMI_COLORS = {
  underweight: 'text-sky-500',
  healthy: 'text-green-500',
  overweight: 'text-amber-500',
  obese: 'text-red-500'
};
const TRAIT_SECTIONS = [
  { key: 'like', label: 'Likes', icon: Heart, color: 'text-green-500' },
  { key: 'dislike', label: 'Dislikes', icon: Frown, color: 'text-red-500' },
  { key: 'pet_peeve', label: 'Pet Peeves', icon: Zap, color: 'text-amber-500' },
  { key: 'habit', label: 'Habits', icon: Repeat, color: 'text-purple-500' }
];

const kgToLbs = (kg) => kg != null ? Math.round(kg * 2.20462) : null;
const cmToFtIn = (cm) => {
  if (!cm) return null;
  const totalIn = cm / 2.54;
  return `${Math.floor(totalIn / 12)}'${Math.round(totalIn % 12)}"`;
};
const todayStr = () => new Date().toDateString();
const wasDoneToday = (ts) => ts && new Date(ts).toDateString() === todayStr();
const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DayPicker = ({ days, onToggle }) => (
  <div className="flex gap-1">
    {DOW_LABELS.map((d, i) => {
      const on = days.includes(i);
      return (
        <button key={d} type="button" onClick={() => onToggle(i)}
          className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-colors ${
            on ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
          {d}
        </button>
      );
    })}
  </div>
);

const Household = () => {
  const [members, setMembers] = useState([]);
  const [guide, setGuide] = useState(null);
  const [selected, setSelected] = useState(null); // full detail object
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // per-tab form state
  const [foodForm, setFoodForm] = useState({ food_name: '', preference: 'like', tier: 'B', calories_per_serving: '', serving_unit: '' });
  const [traitInputs, setTraitInputs] = useState({ like: '', dislike: '', pet_peeve: '', habit: '' });
  const [choreForm, setChoreForm] = useState({ title: '', frequency: 'daily', repeat_days: [] });
  const [editingChore, setEditingChore] = useState(null);
  const [editingFood, setEditingFood] = useState(null);
  const [editingTrait, setEditingTrait] = useState(null);
  const [calorieInput, setCalorieInput] = useState('');
  const [waterCustom, setWaterCustom] = useState('');
  const [healthForm, setHealthForm] = useState({ weight_lbs: '', body_fat_pct: '', muscle_pct: '' });
  const [randomFood, setRandomFood] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [waterParty, setWaterParty] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const [m, g] = await Promise.all([
        householdAPI.getMembers(),
        householdAPI.getShoppingGuide().catch(() => ({ data: null }))
      ]);
      setMembers(m.data);
      setGuide(g.data);
    } catch (err) {
      console.error('Error loading household:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const openMember = async (id) => {
    const res = await householdAPI.getMember(id);
    setSelected(res.data);
    setActiveTab('overview');
    setRandomFood(null);
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const res = await householdAPI.getMember(selected.id);
    setSelected(res.data);
  };

  const handleSave = async (data) => {
    try {
      if (editingMember) {
        await householdAPI.updateMember(editingMember.id, data);
      } else {
        await householdAPI.createMember(data);
      }
      setShowModal(false);
      setEditingMember(null);
      await loadMembers();
      if (selected) await refreshSelected();
    } catch (err) {
      console.error('Error saving member:', err);
    }
  };

  const confirmDeleteMember = (member) => {
    setConfirmState({
      title: `Remove ${member.name}?`,
      message: 'This deletes their profile, food prefs, chores, and logs.',
      type: 'danger',
      confirmText: 'Remove',
      onConfirm: async () => {
        await householdAPI.deleteMember(member.id);
        setConfirmState(null);
        setSelected(null);
        loadMembers();
      }
    });
  };

  // ---------- Foods ----------
  const saveFood = async (e) => {
    e.preventDefault();
    if (!foodForm.food_name.trim()) return;
    const payload = {
      ...foodForm,
      calories_per_serving: foodForm.calories_per_serving ? parseInt(foodForm.calories_per_serving, 10) : null
    };
    if (editingFood) await householdAPI.updateFoodPref(editingFood.id, payload);
    else await householdAPI.saveFoodPref(selected.id, payload);
    setFoodForm({ food_name: '', preference: 'like', tier: 'B', calories_per_serving: '', serving_unit: '' });
    setEditingFood(null);
    refreshSelected(); loadMembers();
  };

  const editFood = (f) => {
    setEditingFood(f);
    setFoodForm({
      food_name: f.food_name, preference: f.preference, tier: f.tier,
      calories_per_serving: f.calories_per_serving ?? '', serving_unit: f.serving_unit || ''
    });
  };

  // ---------- Traits ----------
  const addTrait = async (category) => {
    const text = traitInputs[category].trim();
    if (!text) return;
    if (editingTrait) {
      await householdAPI.updateTrait(editingTrait.id, { category, description: text });
      setEditingTrait(null);
    } else {
      await householdAPI.addTrait(selected.id, category, text);
    }
    setTraitInputs({ ...traitInputs, [category]: '' });
    refreshSelected();
  };

  const editTrait = (t) => {
    setEditingTrait(t);
    setTraitInputs({ ...traitInputs, [t.category]: t.description });
  };

  // ---------- Chores ----------
  const saveChore = async (e) => {
    e.preventDefault();
    if (!choreForm.title.trim()) return;
    const payload = { ...choreForm, repeat_days: choreForm.repeat_days.length ? choreForm.repeat_days : null };
    if (editingChore) {
      await householdAPI.updateChore(editingChore.id, payload);
      setEditingChore(null);
    } else {
      await householdAPI.addChore(selected.id, payload);
    }
    setChoreForm({ title: '', frequency: 'daily', repeat_days: [] });
    refreshSelected(); loadMembers();
  };

  const editChore = (c) => {
    setEditingChore(c);
    setChoreForm({ title: c.title, frequency: c.frequency, repeat_days: c.repeat_days || [] });
  };

  // ---------- Calories ----------
  const logCalories = async () => {
    const cal = parseInt(calorieInput, 10);
    if (!cal || cal <= 0) return;
    await householdAPI.logCalories(selected.id, cal);
    setCalorieInput('');
    refreshSelected(); loadMembers();
  };

  // ---------- Water ----------
  const logWater = async (oz) => {
    const before = selected.water_today_oz;
    const goal = selected.stats?.water_goal_oz || 64;
    await householdAPI.logWater(selected.id, oz);
    const res = await householdAPI.getMember(selected.id);
    setSelected(res.data);
    loadMembers();
    // Celebrate only when crossing the finish line
    if (before < goal && res.data.water_today_oz >= goal) {
      setWaterParty(true);
      setTimeout(() => setWaterParty(false), 2600);
    }
  };

  // ---------- Health ----------
  const logHealth = async (e) => {
    e.preventDefault();
    if (!healthForm.weight_lbs && !healthForm.body_fat_pct && !healthForm.muscle_pct) return;
    await householdAPI.logHealth(selected.id, {
      weight_kg: healthForm.weight_lbs ? Math.round(parseFloat(healthForm.weight_lbs) / 2.20462 * 10) / 10 : null,
      body_fat_pct: healthForm.body_fat_pct || null,
      muscle_pct: healthForm.muscle_pct || null
    });
    setHealthForm({ weight_lbs: '', body_fat_pct: '', muscle_pct: '' });
    refreshSelected(); loadMembers();
  };

  // ---------- Random food ----------
  const rollFood = async () => {
    setSpinning(true);
    setRandomFood(null);
    const res = await householdAPI.getRandomFood(selected.id);
    setTimeout(() => {
      setRandomFood(res.data.food);
      setSpinning(false);
    }, 700);
  };

  // ---------- Renders ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const stats = selected?.stats || {};

  const memberCard = (m) => {
    const s = m.stats || {};
    const waterPct = Math.min(100, Math.round(((m.water_today_oz || 0) / (s.water_goal_oz || 64)) * 100));
    return (
      <motion.div
        key={m.id}
        layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4, scale: 1.02 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer"
        onClick={() => openMember(m.id)}
      >
        <div className="h-2" style={{ backgroundColor: m.color }} />
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${m.color}22` }}>
                {m.avatar_emoji}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{m.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {m.relationship}{s.age != null ? ` · ${s.age} yrs` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setEditingMember(m); setShowModal(true); }}
                className="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => confirmDeleteMember(m)}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl py-2">
              <p className={`text-sm font-bold ${s.bmi ? BMI_COLORS[s.bmi_category] : 'text-gray-400'}`}>
                {s.bmi ?? '—'}
              </p>
              <p className="text-xs text-gray-500">BMI</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl py-2">
              <p className="text-sm font-bold text-orange-500">
                {s.calorie_target ? s.calorie_target.toLocaleString() : '—'}
              </p>
              <p className="text-xs text-gray-500">cal/day</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl py-2">
              <p className="text-sm font-bold text-purple-500">{m.chore_count || 0}</p>
              <p className="text-xs text-gray-500">chores</p>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-sky-500" /> Water</span>
              <span>{m.water_today_oz || 0}/{s.water_goal_oz || 64}oz</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${waterPct}%` }}
                className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full"
              />
            </div>
          </div>

          {/* Fun badges + points */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(m.badges || []).slice(0, 3).map(b => (
              <span key={b.id} title={b.tip}
                className="text-xs px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                {b.emoji} {b.label}
              </span>
            ))}
            {(m.badges || []).length > 3 && (
              <span className="text-xs text-gray-400 self-center">+{m.badges.length - 3}</span>
            )}
            {m.fun_points > 0 && (
              <span className="ml-auto text-xs font-bold text-purple-500 self-center">⭐ {m.fun_points} pts</span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const statCard = (label, value, sub, Icon, color) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow">
      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
        <Icon className={`w-4 h-4 ${color}`} /> {label}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );

  const inputCls = 'w-full px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none text-sm transition-colors';

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">

        <AnimatePresence mode="wait">
          {selected ? (
            /* ============ MEMBER DETAIL ============ */
            <motion.div key="detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <button onClick={() => setSelected(null)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-500 mb-4 transition-colors">
                <ArrowLeft className="w-5 h-5" /> Back to Household
              </button>

              {/* Hero */}
              <div className="rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${selected.color}, ${selected.color}cc)` }}>
                <div className="flex items-center gap-4">
                  <div className="text-6xl">{selected.avatar_emoji}</div>
                  <div>
                    <h1 className="text-3xl font-bold">{selected.name}</h1>
                    <p className="opacity-90 capitalize">
                      {selected.relationship}
                      {stats.age != null ? ` · ${stats.age} years old` : ''}
                      {selected.diet_type && selected.diet_type !== 'none' ? ` · ${selected.diet_type.replace(/_/g, ' ')}` : ''}
                    </p>
                    {selected.allergies?.length > 0 && (
                      <p className="mt-1 text-sm flex items-center gap-1 bg-white/20 rounded-lg px-2 py-1 w-fit">
                        <AlertTriangle className="w-3 h-3" /> Allergic to: {selected.allergies.join(', ')}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className="text-sm bg-white/20 rounded-lg px-2 py-1 font-semibold">⭐ {selected.fun_points || 0} pts</span>
                      {(selected.water_streak || 0) >= 2 && (
                        <span className="text-sm bg-white/20 rounded-lg px-2 py-1 font-semibold">🌊 {selected.water_streak}-day water streak</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {['overview', 'foods', 'traits', 'chores', 'water'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                      activeTab === t
                        ? 'bg-primary-500 text-white shadow'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* ---------- OVERVIEW ---------- */}
                {activeTab === 'overview' && (
                  <motion.div key="ov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {statCard('BMI', stats.bmi ?? '—', stats.bmi_category, Activity, 'text-green-500')}
                      {statCard('BMR', stats.bmr ? stats.bmr.toLocaleString() : '—', 'resting cal/day', Flame, 'text-orange-500')}
                      {statCard('TDEE', stats.tdee ? stats.tdee.toLocaleString() : '—', 'burned cal/day', Zap, 'text-amber-500')}
                      {statCard('Eat ~', stats.calorie_target ? stats.calorie_target.toLocaleString() : '—', 'target cal/day', ShoppingBag, 'text-primary-500')}
                      {statCard('Weight', stats.latest_weight_kg ? `${kgToLbs(stats.latest_weight_kg)} lbs` : '—',
                        stats.ideal_weight_min_kg ? `ideal ${kgToLbs(stats.ideal_weight_min_kg)}–${kgToLbs(stats.ideal_weight_max_kg)} lbs` : 'log weight below', Scale, 'text-blue-500')}
                      {statCard('Muscle', stats.latest_muscle_pct ? `${stats.latest_muscle_pct}%` : '—', 'of body', Activity, 'text-purple-500')}
                      {statCard('Height', cmToFtIn(selected.height_cm) || '—', null, Users, 'text-gray-500')}
                      {statCard('Water Goal', `${stats.water_goal_oz}oz`, 'per day', Droplets, 'text-sky-500')}
                    </div>

                    {/* Badge collection */}
                    {(selected.badges || []).length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow mb-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-3">🏅 {selected.name}'s Badges</h3>
                        <div className="flex flex-wrap gap-2">
                          {selected.badges.map(b => (
                            <motion.span key={b.id} whileHover={{ scale: 1.06 }} title={b.tip}
                              className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 text-amber-800 dark:text-amber-200 text-sm font-medium border border-amber-200 dark:border-amber-800 cursor-default">
                              {b.emoji} {b.label}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Snack swaps + meal ideas */}
                    {((selected.snack_swaps || []).length > 0 || (selected.meal_ideas || []).length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {(selected.snack_swaps || []).length > 0 && (
                          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">🍿 Craving Swaps</h3>
                            <p className="text-xs text-gray-500 mb-3">Same vibes, lighter version — no pressure, just ideas!</p>
                            <div className="space-y-2">
                              {selected.snack_swaps.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                                  <span className="font-medium text-gray-800 dark:text-gray-200">{s.from}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-green-600 dark:text-green-400 font-medium">{s.to}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(selected.meal_ideas || []).length > 0 && (
                          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">🍳 Meal Ideas</h3>
                            <p className="text-xs text-gray-500 mb-3">{selected.name}'s top picks — easy wins for dinner</p>
                            <div className="flex flex-wrap gap-2">
                              {selected.meal_ideas.map((f, i) => (
                                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg text-sm font-medium">
                                  <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-black ${TIER_COLORS[f.tier]}`}>{f.tier}</span>
                                  {f.food_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Random food generator */}
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
                      <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Dices className="w-6 h-6" /> What should {selected.name} eat?</h3>
                      <p className="text-sm opacity-90 mb-4">Picks a random liked food — higher tiers are more likely.</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9, rotate: 15 }}
                          onClick={rollFood} disabled={spinning}
                          className="px-6 py-3 bg-white text-purple-600 rounded-xl font-bold shadow hover:bg-purple-50 transition-colors disabled:opacity-60"
                        >
                          {spinning ? '🎲 Rolling…' : '🎲 Pick My Food'}
                        </motion.button>
                        <AnimatePresence>
                          {randomFood && (
                            <motion.div
                              key={randomFood.food_name + Date.now()}
                              initial={{ scale: 0, rotate: -10 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', damping: 10 }}
                              className="flex items-center gap-3 bg-white/20 rounded-2xl px-5 py-3 backdrop-blur"
                            >
                              <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${TIER_COLORS[randomFood.tier]}`}>
                                {randomFood.tier}
                              </span>
                              <div>
                                <p className="text-xl font-bold">{randomFood.food_name}</p>
                                {randomFood.calories_per_serving && (
                                  <p className="text-xs opacity-90">{randomFood.calories_per_serving} cal / {randomFood.serving_unit || 'serving'}</p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ---------- FOODS ---------- */}
                {activeTab === 'foods' && (
                  <motion.div key="fd" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <form onSubmit={saveFood} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow mb-6 flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[140px]">
                        <label className="text-xs text-gray-500">Food</label>
                        <input className={inputCls} placeholder="e.g. Pizza" value={foodForm.food_name}
                          onChange={(e) => setFoodForm({ ...foodForm, food_name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Feel</label>
                        <select className={inputCls} value={foodForm.preference}
                          onChange={(e) => setFoodForm({ ...foodForm, preference: e.target.value })}>
                          <option value="like">❤️ Like</option>
                          <option value="sometimes">🤷 Sometimes</option>
                          <option value="dislike">💔 Dislike</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Tier</label>
                        <select className={inputCls} value={foodForm.tier}
                          onChange={(e) => setFoodForm({ ...foodForm, tier: e.target.value })}>
                          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Cal/serving</label>
                        <input className={inputCls} type="number" placeholder="opt." value={foodForm.calories_per_serving}
                          onChange={(e) => setFoodForm({ ...foodForm, calories_per_serving: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Unit</label>
                        <input className={inputCls} placeholder="slice" value={foodForm.serving_unit}
                          onChange={(e) => setFoodForm({ ...foodForm, serving_unit: e.target.value })} />
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} type="submit"
                        className="px-4 py-2 bg-primary-500 text-white rounded-xl font-semibold flex items-center gap-1 hover:bg-primary-600 transition-colors">
                        <Plus className="w-4 h-4" /> Add
                      </motion.button>
                    </form>

                    {/* Tier list */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden mb-6">
                      <h3 className="p-4 font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700">❤️ Liked Foods — Tier List</h3>
                      {TIERS.map(tier => {
                        const foods = (selected.food_prefs || []).filter(f => f.preference === 'like' && f.tier === tier);
                        return (
                          <div key={tier} className="flex items-stretch border-b border-gray-100 dark:border-gray-700 last:border-0 min-h-[52px]">
                            <div className={`w-14 flex-shrink-0 flex items-center justify-center font-black text-xl ${TIER_COLORS[tier]}`}>{tier}</div>
                            <div className="flex-1 p-2 flex flex-wrap gap-2 items-center">
                              {foods.length === 0 && <span className="text-xs text-gray-300 dark:text-gray-600 px-2">empty</span>}
                              {foods.map(f => (
                                <span key={f.id} className="group px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                  {f.food_name}
                                  {f.calories_per_serving ? <span className="text-xs text-gray-400">{f.calories_per_serving}cal</span> : null}
                                  <button onClick={() => editFood(f)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary-500 transition-opacity">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => { householdAPI.deleteFoodPref(f.id).then(refreshSelected); }}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Sometimes */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 mb-6">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-3">🤷 Sometimes — okay once in a while</h3>
                      <div className="flex flex-wrap gap-2">
                        {(selected.food_prefs || []).filter(f => f.preference === 'sometimes').map(f => (
                          <span key={f.id} className="group px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium flex items-center gap-2">
                            {f.food_name}
                            <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black ${TIER_COLORS[f.tier]}`}>{f.tier}</span>
                            <button onClick={() => editFood(f)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary-500 transition-opacity">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { householdAPI.deleteFoodPref(f.id).then(refreshSelected); }}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                        {(selected.food_prefs || []).filter(f => f.preference === 'sometimes').length === 0 && (
                          <span className="text-sm text-gray-400">Nothing here — mark foods {selected.name} is neutral on</span>
                        )}
                      </div>
                    </div>

                    {/* Disliked */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-3">💔 Disliked — don't buy for {selected.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {(selected.food_prefs || []).filter(f => f.preference === 'dislike').map(f => (
                          <span key={f.id} className="group px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium flex items-center gap-2">
                            {f.food_name}
                            <button onClick={() => editFood(f)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary-500 transition-opacity">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { householdAPI.deleteFoodPref(f.id).then(refreshSelected); }}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                        {(selected.food_prefs || []).filter(f => f.preference === 'dislike').length === 0 && (
                          <span className="text-sm text-gray-400">Nothing marked yet</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ---------- TRAITS ---------- */}
                {activeTab === 'traits' && (
                  <motion.div key="tr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {TRAIT_SECTIONS.map(({ key, label, icon: Icon, color }) => {
                      const items = (selected.traits || []).filter(t => t.category === key);
                      return (
                        <div key={key} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
                          <h3 className={`font-bold mb-3 flex items-center gap-2 ${color}`}><Icon className="w-5 h-5" /> {label}</h3>
                          <div className="flex gap-2 mb-3">
                            <input className={inputCls} placeholder={`Add ${label.toLowerCase()}…`}
                              value={traitInputs[key]}
                              onChange={(e) => setTraitInputs({ ...traitInputs, [key]: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTrait(key))} />
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => addTrait(key)}
                              className="px-3 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex-shrink-0">
                              <Plus className="w-4 h-4" />
                            </motion.button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {items.map(t => (
                              <span key={t.id} className="group px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                {t.description}
                                <button onClick={() => editTrait(t)}
                                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary-500 transition-opacity">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => { householdAPI.deleteTrait(t.id).then(refreshSelected); }}
                                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                            {items.length === 0 && <span className="text-sm text-gray-400">None yet</span>}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {/* ---------- CHORES ---------- */}
                {activeTab === 'chores' && (
                  <motion.div key="ch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <form onSubmit={saveChore} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow mb-6 flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[160px]">
                        <label className="text-xs text-gray-500">Chore</label>
                        <input className={inputCls} placeholder="e.g. Take out trash" value={choreForm.title}
                          onChange={(e) => setChoreForm({ ...choreForm, title: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Frequency</label>
                        <select className={inputCls} value={choreForm.frequency}
                          onChange={(e) => setChoreForm({ ...choreForm, frequency: e.target.value })}>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Repeats on</label>
                        <DayPicker days={choreForm.repeat_days}
                          onToggle={(d) => setChoreForm({
                            ...choreForm,
                            repeat_days: choreForm.repeat_days.includes(d)
                              ? choreForm.repeat_days.filter(x => x !== d)
                              : [...choreForm.repeat_days, d]
                          })} />
                        <p className="text-[10px] text-gray-400 mt-1">blank = every day</p>
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} type="submit"
                        className="px-4 py-2 bg-primary-500 text-white rounded-xl font-semibold flex items-center gap-1 hover:bg-primary-600 transition-colors">
                        <Plus className="w-4 h-4" /> {editingChore ? 'Save' : 'Add'}
                      </motion.button>
                      {editingChore && (
                        <button type="button" onClick={() => { setEditingChore(null); setChoreForm({ title: '', frequency: 'daily', repeat_days: [] }); }}
                          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          Cancel
                        </button>
                      )}
                    </form>

                    <div className="space-y-2">
                      {(selected.chores || []).map(c => {
                        const done = wasDoneToday(c.last_completed_at);
                        return (
                          <motion.div key={c.id} layout
                            className={`flex items-center justify-between p-4 rounded-2xl shadow transition-colors ${
                              done ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'
                            }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${done ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                {done ? <Check className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                              </div>
                              <div>
                                <p className={`font-semibold ${done ? 'text-green-700 dark:text-green-300 line-through' : 'text-gray-900 dark:text-white'}`}>
                                  {c.title}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">
                                  {c.frequency}
                                  {c.repeat_days?.length > 0 && ` · ${c.repeat_days.map(d => DOW_LABELS[d]).join(' ')}`}
                                  {c.last_completed_at ? ` · last done ${new Date(c.last_completed_at).toLocaleDateString()}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {!done && (
                                <motion.button whileTap={{ scale: 0.9 }}
                                  onClick={() => { householdAPI.completeChore(c.id).then(refreshSelected); }}
                                  className="px-4 py-2 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition-colors">
                                  Done
                                </motion.button>
                              )}
                              <button onClick={() => editChore(c)}
                                className="p-2 text-gray-400 hover:text-primary-500 transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => { householdAPI.deleteChore(c.id).then(refreshSelected); }}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                      {(selected.chores || []).length === 0 && (
                        <p className="text-center text-gray-400 py-8">No chores assigned yet</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ---------- WATER + HEALTH ---------- */}
                {activeTab === 'water' && (
                  <motion.div key="wt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Water */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-sky-500" /> Water Today
                      </h3>
                      <p className="text-4xl font-black text-sky-500 mb-1">
                        {selected.water_today_oz}<span className="text-lg font-normal text-gray-400">/{stats.water_goal_oz}oz</span>
                      </p>
                      <AnimatePresence>
                        {waterParty && (
                          <motion.p
                            initial={{ opacity: 0, scale: 0.5, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-lg font-bold text-green-500 mb-2"
                          >
                            🎉 Water goal reached! Nice!
                          </motion.p>
                        )}
                      </AnimatePresence>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-5">
                        <motion.div
                          animate={{ width: `${Math.min(100, (selected.water_today_oz / stats.water_goal_oz) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[8, 12, 16, 24, 32].map(oz => (
                          <motion.button key={oz} whileTap={{ scale: 0.9 }} onClick={() => logWater(oz)}
                            className="px-4 py-2 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-xl font-semibold text-sm hover:bg-sky-200 transition-colors">
                            +{oz}oz
                          </motion.button>
                        ))}
                        <div className="flex gap-1 flex-1 min-w-[110px]">
                          <input className={inputCls} type="number" placeholder="custom" value={waterCustom}
                            onChange={(e) => setWaterCustom(e.target.value)} />
                          <motion.button whileTap={{ scale: 0.9 }}
                            onClick={() => { if (parseInt(waterCustom, 10) > 0) { logWater(parseInt(waterCustom, 10)); setWaterCustom(''); } }}
                            className="px-3 py-2 bg-sky-500 text-white rounded-xl flex-shrink-0">
                            <Plus className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    {/* Calorie intake */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500" /> Calories Today
                      </h3>
                      <p className="text-4xl font-black text-orange-500 mb-1">
                        {selected.calories_today || 0}
                        <span className="text-lg font-normal text-gray-400">
                          {stats.calorie_target ? `/${stats.calorie_target.toLocaleString()} kcal` : ' kcal'}
                        </span>
                      </p>
                      {stats.calorie_target && (
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                          <motion.div
                            animate={{ width: `${Math.min(100, ((selected.calories_today || 0) / stats.calorie_target) * 100)}%` }}
                            className={`h-full rounded-full ${(selected.calories_today || 0) > stats.calorie_target ? 'bg-gradient-to-r from-amber-400 to-red-500' : 'bg-gradient-to-r from-orange-400 to-amber-500'}`}
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[300, 500, 700, 1000].map(cal => (
                          <motion.button key={cal} whileTap={{ scale: 0.9 }}
                            onClick={async () => { await householdAPI.logCalories(selected.id, cal); refreshSelected(); loadMembers(); }}
                            className="px-4 py-2 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-xl font-semibold text-sm hover:bg-orange-200 transition-colors">
                            +{cal}
                          </motion.button>
                        ))}
                        <div className="flex gap-1 flex-1 min-w-[110px]">
                          <input className={inputCls} type="number" placeholder="custom" value={calorieInput}
                            onChange={(e) => setCalorieInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), logCalories())} />
                          <motion.button whileTap={{ scale: 0.9 }} onClick={logCalories}
                            className="px-3 py-2 bg-orange-500 text-white rounded-xl flex-shrink-0">
                            <Plus className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">Logs add up across the day — resets each morning.</p>
                    </div>

                    {/* Health log */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Scale className="w-5 h-5 text-purple-500" /> Log Weight / Body Stats
                      </h3>
                      <form onSubmit={logHealth} className="flex flex-wrap gap-2 mb-5">
                        <input className={inputCls} type="number" step="0.1" placeholder="Weight lbs" value={healthForm.weight_lbs}
                          onChange={(e) => setHealthForm({ ...healthForm, weight_lbs: e.target.value })} />
                        <input className={inputCls} type="number" step="0.1" placeholder="Body fat %" value={healthForm.body_fat_pct}
                          onChange={(e) => setHealthForm({ ...healthForm, body_fat_pct: e.target.value })} />
                        <input className={inputCls} type="number" step="0.1" placeholder="Muscle %" value={healthForm.muscle_pct}
                          onChange={(e) => setHealthForm({ ...healthForm, muscle_pct: e.target.value })} />
                        <motion.button whileTap={{ scale: 0.95 }} type="submit"
                          className="px-4 py-2 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors w-full">
                          Log Entry
                        </motion.button>
                      </form>
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {(selected.health_history || []).map(h => (
                          <div key={h.id} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                            <span className="text-gray-600 dark:text-gray-300">{new Date(h.logged_at).toLocaleDateString()}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {h.weight_kg ? `${kgToLbs(h.weight_kg)} lbs` : ''}
                              {h.body_fat_pct ? ` · ${h.body_fat_pct}% bf` : ''}
                              {h.muscle_pct ? ` · ${h.muscle_pct}% muscle` : ''}
                            </span>
                          </div>
                        ))}
                        {(selected.health_history || []).length === 0 && (
                          <p className="text-sm text-gray-400">No entries yet</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
                {/* ---------- EATING OUT ---------- */}
                {activeTab === 'eating out' && (
                  <motion.div key="eo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {(selected.eat_out_logs || []).length === 0 ? (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          No restaurant runs logged for {selected.name} yet — the shared Eating Out Planner below learns everyone's habits.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 mb-4">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-3">🍔 {selected.name}'s recent runs</h3>
                        <div className="space-y-1.5">
                          {selected.eat_out_logs.map(l => (
                            <div key={l.id} className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-800 dark:text-gray-200">{l.restaurant}</span>
                              <span className="text-xs text-gray-400 flex-1">
                                {new Date(l.eaten_on + 'T00:00:00').toLocaleDateString()}
                                {l.items?.length > 0 && ` · ${l.items.map(i => i.name || i).filter(Boolean).slice(0, 2).join(', ')}`}
                              </span>
                              {l.total_cost != null && (
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                  ${parseFloat(l.total_cost).toFixed(2)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <EatOutPanel members={members} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* ============ HOUSEHOLD LIST ============ */
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    🏠 Household
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {members.length} member{members.length !== 1 ? 's' : ''} tracked
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setEditingMember(null); setShowModal(true); }}
                  className="px-5 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-primary-500/30"
                >
                  <UserPlus className="w-5 h-5" /> Add Member
                </motion.button>
              </div>

              {/* Shopping guide */}
              {guide && guide.household_daily_calories > 0 && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg mb-6">
                  <h3 className="text-xl font-bold mb-1 flex items-center gap-2"><ShoppingBag className="w-6 h-6" /> Shopping Guide</h3>
                  <p className="text-sm opacity-90 mb-3">
                    Your household eats ~<b>{guide.household_daily_calories.toLocaleString()} cal/day</b>
                    {' '}(~{guide.household_weekly_calories.toLocaleString()}/week).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {guide.members.filter(m => m.buy_these.length > 0 || m.avoid_these.length > 0).map(m => (
                      <div key={m.member_id} className="bg-white/15 rounded-xl px-3 py-2 text-sm backdrop-blur">
                        <span className="font-bold">{m.avatar_emoji} {m.name}:</span>
                        {m.buy_these.length > 0 && (
                          <span className="opacity-90"> buy {m.buy_these.slice(0, 4).map(f => f.food_name).join(', ')}</span>
                        )}
                        {m.avoid_these.length > 0 && (
                          <span className="opacity-90 text-red-100"> · avoid {m.avoid_these.slice(0, 3).join(', ')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Eating out planner — calendar + learned patterns */}
              {members.length > 0 && <EatOutPanel members={members} />}

              {/* Member cards */}
              {members.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map(memberCard)}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow"
                >
                  <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No household members yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Add the people you shop for — track their diets, food tiers, water, chores, and let the app suggest what to buy.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold"
                  >
                    Add Your First Member
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <HouseholdMemberModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingMember(null); }}
        onSave={handleSave}
        member={editingMember}
      />
      <ConfirmModal
        isOpen={!!confirmState}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmText={confirmState?.confirmText || 'Confirm'}
        type={confirmState?.type || 'warning'}
        onConfirm={confirmState?.onConfirm || (() => setConfirmState(null))}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
};

export default Household;
