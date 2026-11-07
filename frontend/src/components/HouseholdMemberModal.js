import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Save } from 'lucide-react';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';

const AVATAR_EMOJIS = ['😀','😎','🤓','😺','🐶','🦊','🐼','🦁','👦','👧','👨','👩','🧑','👴','👵','🧒','⭐','🌟'];
const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6'];
const RELATIONSHIPS = ['self','spouse','partner','child','parent','sibling','roommate','other'];
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (little exercise)' },
  { value: 'light', label: 'Light (1-3 days/week)' },
  { value: 'moderate', label: 'Moderate (3-5 days/week)' },
  { value: 'active', label: 'Active (6-7 days/week)' },
  { value: 'very_active', label: 'Very Active (physical job + exercise)' }
];
const DIET_TYPES = ['none','vegetarian','vegan','keto','paleo','gluten_free','low_carb','mediterranean','other'];

const lbsToKg = (lbs) => Math.round(lbs / 2.20462 * 10) / 10;
const inToCm = (inches) => Math.round(inches * 2.54 * 10) / 10;
const cmToFtIn = (cm) => {
  const totalIn = cm / 2.54;
  return { ft: Math.floor(totalIn / 12), inch: Math.round(totalIn % 12) };
};
const kgToLbs = (kg) => Math.round(kg * 2.20462);

const HouseholdMemberModal = ({ isOpen, onClose, onSave, member = null }) => {
  const [formData, setFormData] = useState({
    name: '', relationship: 'member', avatar_emoji: '😀', color: '#6366f1',
    date_of_birth: '', gender: '', height_ft: '', height_in: '', weight_lbs: '',
    activity_level: 'moderate', diet_type: 'none', allergies: '',
    daily_calorie_target: '', water_goal_oz: 64, notes: ''
  });

  useEffect(() => {
    if (member) {
      const { ft, inch } = member.height_cm ? cmToFtIn(parseFloat(member.height_cm)) : { ft: '', inch: '' };
      setFormData({
        name: member.name || '',
        relationship: member.relationship || 'member',
        avatar_emoji: member.avatar_emoji || '😀',
        color: member.color || '#6366f1',
        date_of_birth: member.date_of_birth ? member.date_of_birth.split('T')[0] : '',
        gender: member.gender || '',
        height_ft: ft, height_in: inch,
        weight_lbs: '',
        activity_level: member.activity_level || 'moderate',
        diet_type: member.diet_type || 'none',
        allergies: (member.allergies || []).join(', '),
        daily_calorie_target: member.daily_calorie_target || '',
        water_goal_oz: member.water_goal_oz || 64,
        notes: member.notes || ''
      });
    } else {
      setFormData({
        name: '', relationship: 'member', avatar_emoji: '😀', color: '#6366f1',
        date_of_birth: '', gender: '', height_ft: '', height_in: '', weight_lbs: '',
        activity_level: 'moderate', diet_type: 'none', allergies: '',
        daily_calorie_target: '', water_goal_oz: 64, notes: ''
      });
    }
  }, [member, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const heightCm = (formData.height_ft || formData.height_in)
      ? inToCm((parseInt(formData.height_ft || 0, 10) * 12) + parseInt(formData.height_in || 0, 10))
      : null;

    onSave({
      name: formData.name.trim(),
      relationship: formData.relationship,
      avatar_emoji: formData.avatar_emoji,
      color: formData.color,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null,
      height_cm: heightCm,
      weight_kg: formData.weight_lbs ? lbsToKg(parseFloat(formData.weight_lbs)) : null,
      activity_level: formData.activity_level,
      diet_type: formData.diet_type,
      allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()).filter(Boolean) : [],
      daily_calorie_target: formData.daily_calorie_target ? parseInt(formData.daily_calorie_target, 10) : null,
      water_goal_oz: parseInt(formData.water_goal_oz, 10) || 64,
      notes: formData.notes || null
    });
  };

  if (!isOpen) return null;

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Gradient header */}
          <div className="relative bg-gradient-to-r from-primary-500 to-purple-600 p-6 text-white">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative flex justify-between items-center">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm text-2xl"
                >
                  {formData.avatar_emoji}
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold">{member ? `Edit ${member.name}` : 'Add Household Member'}</h2>
                  <p className="text-sm text-white/80">{member ? 'Update their profile' : 'Track a person in your household'}</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center backdrop-blur-sm transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          <AnimatedScrollbar3D
            maxHeight="calc(90vh - 180px)"
            thumbColor="bg-gradient-to-b from-primary-400 to-primary-600"
            glowColor="primary"
            autoHide={true}
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Basics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Name *</label>
                  <input type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputCls} placeholder="e.g. Alex" />
                </div>
                <div>
                  <label className={labelCls}>Relationship</label>
                  <select value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className={inputCls}>
                    {RELATIONSHIPS.map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Avatar + color */}
              <div>
                <label className={labelCls}>Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_EMOJIS.map(e => (
                    <motion.button
                      key={e} type="button" whileTap={{ scale: 0.85 }}
                      onClick={() => setFormData({ ...formData, avatar_emoji: e })}
                      className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all ${
                        formData.avatar_emoji === e
                          ? 'bg-primary-100 dark:bg-primary-900 ring-2 ring-primary-500 scale-110'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {e}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Card Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <motion.button
                      key={c} type="button" whileTap={{ scale: 0.85 }}
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-9 h-9 rounded-xl transition-all ${
                        formData.color === c ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Body stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input type="date" value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <select value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className={inputCls}>
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Height</label>
                  <div className="flex gap-2 items-center">
                    <input type="number" min="0" max="8" value={formData.height_ft}
                      onChange={(e) => setFormData({ ...formData, height_ft: e.target.value })}
                      className={inputCls} placeholder="ft" />
                    <input type="number" min="0" max="11" value={formData.height_in}
                      onChange={(e) => setFormData({ ...formData, height_in: e.target.value })}
                      className={inputCls} placeholder="in" />
                  </div>
                </div>
              </div>

              {!member && (
                <div>
                  <label className={labelCls}>Current Weight (lbs, optional)</label>
                  <input type="number" step="0.1" min="0" value={formData.weight_lbs}
                    onChange={(e) => setFormData({ ...formData, weight_lbs: e.target.value })}
                    className={inputCls} placeholder="e.g. 150" />
                </div>
              )}

              {/* Diet + activity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Activity Level</label>
                  <select value={formData.activity_level}
                    onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                    className={inputCls}>
                    {ACTIVITY_LEVELS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Diet</label>
                  <select value={formData.diet_type}
                    onChange={(e) => setFormData({ ...formData, diet_type: e.target.value })}
                    className={inputCls}>
                    {DIET_TYPES.map(d => (
                      <option key={d} value={d}>{d === 'none' ? 'No special diet' : d.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Allergies (comma separated)</label>
                <input type="text" value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className={inputCls} placeholder="peanuts, shellfish, dairy" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Daily Calorie Target (optional)</label>
                  <input type="number" min="0" value={formData.daily_calorie_target}
                    onChange={(e) => setFormData({ ...formData, daily_calorie_target: e.target.value })}
                    className={inputCls} placeholder="Auto from stats if blank" />
                </div>
                <div>
                  <label className={labelCls}>Water Goal (oz/day)</label>
                  <input type="number" min="0" value={formData.water_goal_oz}
                    onChange={(e) => setFormData({ ...formData, water_goal_oz: e.target.value })}
                    className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={formData.notes} rows={2}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={inputCls} placeholder="Anything else worth knowing" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <motion.button
                  type="button" onClick={onClose}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold hover:from-primary-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30"
                >
                  {member ? <Save className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {member ? 'Save Changes' : 'Add Member'}
                </motion.button>
              </div>
            </form>
          </AnimatedScrollbar3D>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HouseholdMemberModal;
