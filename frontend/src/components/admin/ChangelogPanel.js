import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  Sparkles, Plus, Trash2, Rocket, RefreshCw, Eye, EyeOff, Pencil, Check, X,
  GripVertical, Flag, ListChecks, FlaskConical,
} from 'lucide-react';
import api from '../../services/api';
import ConfirmModal from '../../limbo/modals/ConfirmModal';

const PRIORITY = {
  high:   { label: 'High', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  medium: { label: 'Med',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  low:    { label: 'Low',  cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

const PriorityBadge = ({ p }) => {
  const meta = PRIORITY[p] || PRIORITY.medium;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${meta.cls}`}>
      <Flag className="w-2.5 h-2.5" /> {meta.label}
    </span>
  );
};

/**
 * ChangelogPanel — manage "coming soon" features.
 * Edit/hide entries, drag-sort the roadmap, tag priority, and release
 * single or bulk batches — bulk sends one compressed patch note.
 */
const ChangelogPanel = () => {
  const [features, setFeatures] = useState([]);
  const [upcoming, setUpcoming] = useState([]); // Reorder.Group needs its own ordered list
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [betaOnly, setBetaOnly] = useState(false);
  const [priority, setPriority] = useState('medium');
  const [targetDate, setTargetDate] = useState('');
  const [msg, setMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [releasing, setReleasing] = useState(false);
  const [releaseAnim, setReleaseAnim] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const orderRef = useRef([]);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/changelog/admin/features');
      setFeatures(data || []);
      const up = (data || []).filter((f) => f.status !== 'released');
      setUpcoming(up);
      orderRef.current = up;
    } catch (e) {
      showMsg('Failed to load changelog features', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addFeature = async () => {
    if (!title.trim()) return;
    try {
      await api.post('/changelog/admin/features', {
        title: title.trim(),
        description: description.trim() || null,
        beta_only: betaOnly,
        priority,
        target_date: targetDate || null,
      });
      setTitle(''); setDescription(''); setBetaOnly(false); setPriority('medium'); setTargetDate('');
      load();
      showMsg('Upcoming feature added');
    } catch (e) {
      showMsg(e.response?.data?.error || 'Failed to add feature', 'error');
    }
  };

  const patch = async (id, fields) => {
    try {
      await api.patch(`/changelog/admin/features/${id}`, fields);
      await load();
      return true;
    } catch (e) {
      showMsg(e.response?.data?.error || 'Update failed', 'error');
      return false;
    }
  };

  const playReleaseAnim = () => {
    setReleaseAnim(true);
    setTimeout(() => setReleaseAnim(false), 1400);
  };

  const release = async (id) => {
    setReleasing(true);
    const ok = await patch(id, { status: 'released', notify_on_release: true });
    setReleasing(false);
    if (ok) { playReleaseAnim(); showMsg('Released — users notified'); }
  };

  const releaseSelected = async () => {
    if (selectedIds.size === 0) return;
    setReleasing(true);
    try {
      const { data } = await api.post('/changelog/admin/features/bulk-release', {
        ids: [...selectedIds],
      });
      playReleaseAnim();
      setSelectedIds(new Set());
      setSelectMode(false);
      await load();
      showMsg(`Released ${data.released} — ${data.notified} users notified`);
    } catch (e) {
      showMsg(e.response?.data?.error || 'Bulk release failed', 'error');
    } finally {
      setReleasing(false);
    }
  };

  const startEdit = (f) => {
    setEditingId(f.id);
    setEditFields({
      title: f.title,
      description: f.description || '',
      status: f.status,
      priority: f.priority || 'medium',
      target_date: f.target_date ? f.target_date.slice(0, 10) : '',
      beta_only: !!f.beta_only,
    });
  };

  const saveEdit = async () => {
    if (!editFields.title?.trim()) return;
    const ok = await patch(editingId, {
      title: editFields.title.trim(),
      description: editFields.description?.trim() || null,
      status: editFields.status,
      priority: editFields.priority,
      target_date: editFields.target_date || null,
      beta_only: editFields.beta_only,
    });
    if (ok) { setEditingId(null); showMsg('Feature updated'); }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleReorder = (newOrder) => {
    setUpcoming(newOrder);
    orderRef.current = newOrder;
  };

  const persistOrder = async () => {
    try {
      await api.post('/changelog/admin/features/reorder', {
        ids: orderRef.current.map((f) => f.id),
      });
    } catch {
      showMsg('Failed to save order', 'error');
    }
  };

  const confirmDelete = async () => {
    const id = deleteTarget?.id;
    setDeleteTarget(null);
    if (!id) return;
    try {
      await api.delete(`/changelog/admin/features/${id}`);
      setFeatures((prev) => prev.filter((f) => f.id !== id));
      setUpcoming((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      showMsg('Failed to delete', 'error');
    }
  };

  const released = features.filter((f) => f.status === 'released');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Upcoming Features (visible to users)
        </h3>
        <button onClick={load} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Add form */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Feature title (e.g. Barcode Scanner)"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
            title="Priority badge"
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
            title="Target release date"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={betaOnly} onChange={(e) => setBetaOnly(e.target.checked)} className="rounded" />
            Beta testers only
          </label>
          <button
            onClick={addFeature}
            disabled={!title.trim()}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Upcoming
          </button>
        </div>
      </div>

      {/* Bulk-select bar — compressed patch-note release */}
      {!loading && upcoming.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              selectMode
                ? 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ListChecks className="w-4 h-4" /> {selectMode ? 'Cancel select' : 'Select'}
          </button>
          {selectMode && (
            <>
              <button
                onClick={() => setSelectedIds(new Set(upcoming.map((f) => f.id)))}
                className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                All
              </button>
              <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
              <button
                onClick={releaseSelected}
                disabled={selectedIds.size === 0 || releasing}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                title="Release all selected and send ONE compressed patch note"
              >
                <Rocket className="w-4 h-4" /> Release {selectedIds.size > 0 ? selectedIds.size : ''} + patch note
              </button>
            </>
          )}
        </div>
      )}

      {/* Upcoming list — drag to reorder */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading…</div>
      ) : upcoming.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Eye className="w-10 h-10 mx-auto mb-2 opacity-30" />
          No upcoming features announced
        </div>
      ) : (
        <Reorder.Group axis="y" values={upcoming} onReorder={handleReorder} className="space-y-2">
          {upcoming.map((f) => (
            <UpcomingRow
              key={f.id}
              f={f}
              selectMode={selectMode}
              selected={selectedIds.has(f.id)}
              onToggleSelect={() => toggleSelect(f.id)}
              editing={editingId === f.id}
              editFields={editFields}
              setEditFields={setEditFields}
              onStartEdit={() => startEdit(f)}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingId(null)}
              onRelease={() => release(f.id)}
              onToggleHidden={() => patch(f.id, { is_hidden: !f.is_hidden })}
              onToggleBeta={() => patch(f.id, { beta_only: !f.beta_only })}
              onDelete={() => setDeleteTarget(f)}
              onDragEnd={persistOrder}
              releasing={releasing}
            />
          ))}
        </Reorder.Group>
      )}

      {/* Released history */}
      {released.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Released</h4>
          <div className="space-y-1">
            {released.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                <Rocket className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="flex-1 text-gray-700 dark:text-gray-300">{f.title}</span>
                <PriorityBadge p={f.priority} />
                <span className="text-xs text-gray-400">{new Date(f.released_at || f.updated_at).toLocaleDateString()}</span>
                <button onClick={() => setDeleteTarget(f)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Release animation — rocket launch */}
      <AnimatePresence>
        {releaseAnim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ y: 140, scale: 0.5, opacity: 0 }}
              animate={{ y: -180, scale: 1.2, opacity: 1 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            >
              <Rocket className="w-16 h-16 text-green-500 drop-shadow-lg" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete feature?"
        message={`Delete "${deleteTarget?.title}"? This can't be undone.`}
        confirmText="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

/* Single upcoming row — drag handle only via GripVertical so inputs/buttons stay clickable */
const UpcomingRow = ({
  f, selectMode, selected, onToggleSelect, editing, editFields, setEditFields,
  onStartEdit, onSaveEdit, onCancelEdit, onRelease, onToggleHidden, onToggleBeta,
  onDelete, onDragEnd, releasing,
}) => {
  const controls = useDragControls();
  const set = (key) => (e) => setEditFields((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Reorder.Item
      value={f}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className={`rounded-lg border bg-white dark:bg-gray-800 ${
        selected ? 'border-purple-400 dark:border-purple-600' : 'border-gray-200 dark:border-gray-700'
      } ${f.is_hidden ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          onPointerDown={(e) => controls.start(e)}
          className="p-1 text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        {selectMode && (
          <input type="checkbox" checked={selected} onChange={onToggleSelect} className="rounded flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-gray-900 dark:text-white">{f.title}</p>
            <PriorityBadge p={f.priority} />
            {f.beta_only && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                <FlaskConical className="w-2.5 h-2.5" /> Beta
              </span>
            )}
            {f.is_hidden && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                hidden
              </span>
            )}
          </div>
          {f.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.description}</p>}
          <p className="text-xs text-gray-400 mt-1">
            {f.status}
            {f.target_date ? ` • ETA ${new Date(f.target_date).toLocaleDateString()}` : ''}
            {` • added ${new Date(f.created_at).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={onStartEdit} className="p-1.5 text-gray-400 hover:text-purple-500" title="Edit"><Pencil className="w-4 h-4" /></button>
          <button onClick={onToggleBeta} title={f.beta_only ? 'Show to all users' : 'Restrict to beta testers'} className={`p-1.5 ${f.beta_only ? 'text-purple-500' : 'text-gray-400 hover:text-purple-500'}`}><FlaskConical className="w-4 h-4" /></button>
          <button onClick={onToggleHidden} title={f.is_hidden ? 'Unhide' : 'Hide from users'} className="p-1.5 text-gray-400 hover:text-amber-500">
            {f.is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={onRelease} disabled={releasing} className="p-1.5 text-gray-400 hover:text-green-600 disabled:opacity-40" title="Release & notify"><Rocket className="w-4 h-4" /></button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Inline edit form */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
              <input
                value={editFields.title || ''}
                onChange={set('title')}
                placeholder="Title"
                className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
              <textarea
                value={editFields.description || ''}
                onChange={set('description')}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <select value={editFields.status} onChange={set('status')} className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs">
                  <option value="planned">planned</option>
                  <option value="in_progress">in progress</option>
                </select>
                <select value={editFields.priority} onChange={set('priority')} className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs">
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
                <input
                  type="date"
                  value={editFields.target_date || ''}
                  onChange={set('target_date')}
                  className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={!!editFields.beta_only}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, beta_only: e.target.checked }))}
                    className="rounded"
                  />
                  Beta only
                </label>
                <button
                  onClick={onSaveEdit}
                  disabled={!editFields.title?.trim()}
                  className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-xs font-semibold"
                >
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
                <button onClick={onCancelEdit} className="p-1.5 text-gray-400 hover:text-gray-600" title="Cancel">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
};

export default ChangelogPanel;
