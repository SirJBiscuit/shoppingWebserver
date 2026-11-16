import React, { useState, useEffect } from 'react';
import {
  Eye, EyeOff, GripVertical, Save, RotateCcw, Smartphone, Monitor, Tablet,
  ShoppingCart, Package, ChefHat, Calendar, BarChart3, Search,
  History, Mic, Scan, Share2, Store, Sparkles, Settings, Shield,
  AlertCircle, CheckCircle, X, ArrowLeft, Archive, FlaskConical, Home,
  StickyNote, Users, ArchiveRestore
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useFeatureFlags } from '../../context/FeatureFlagContext';

const ICON_MAP = {
  shopping_lists: Home,
  pantry: Package,
  kitchen_inventory: Package,
  recipes: ChefHat,
  meal_planner: Calendar,
  statistics: BarChart3,
  recipe_discovery: Search,
  activity_history: History,
  voice_input: Mic,
  barcode_scanner: Scan,
  sharing: Share2,
  notepad: StickyNote,
  store_management: Store,
  ach_customization: Sparkles,
  dashboard_editor: Settings,
  homemade_lab: FlaskConical,
  household: Users,
};

const PERSONAS = [
  { id: 'admin', label: 'Admin', icon: Shield, cls: 'bg-orange-500' },
  { id: 'user', label: 'User', icon: Users, cls: 'bg-blue-500' },
  { id: 'beta', label: 'Beta Tester', icon: FlaskConical, cls: 'bg-purple-500' },
];

const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: 'w-72' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: 'w-60' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: 'w-16' },
];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'enabled', label: 'Enabled' },
  { id: 'disabled', label: 'Disabled' },
  { id: 'admin', label: 'Admin only' },
  { id: 'beta', label: 'Beta hidden' },
];

// Sidebar layout mirrors Sidebar.js — key maps to feature_key (or null = always)
const SIDEBAR_SECTIONS = [
  {
    name: 'Main Menu',
    items: [
      { key: 'shopping_lists', label: 'Home', icon: Home },
      { key: 'pantry', label: 'Unpack', icon: Package, badge: '🛒' },
      { key: 'pantry', label: 'Home Inventory', icon: Store },
      { key: 'recipes', label: 'Recipe Book', icon: ChefHat },
      { key: 'homemade_lab', label: 'Homemade Lab', icon: FlaskConical },
      { key: 'household', label: 'Household', icon: Users },
    ],
  },
  {
    name: 'Quick Tools',
    items: [
      { key: 'sharing', label: 'Share List', icon: Share2 },
      { key: 'notepad', label: 'Notepad', icon: StickyNote },
    ],
  },
  {
    name: 'System',
    items: [
      { key: 'store_management', label: 'Manage Stores', icon: Store },
      { key: 'statistics', label: 'Stats', icon: BarChart3 },
      { key: 'ach_customization', label: 'ACH Customization', icon: Sparkles, special: true },
      { key: null, label: 'Settings', icon: Settings, always: true },
      { key: null, label: 'Admin', icon: Shield, always: true, adminOnly: true },
    ],
  },
];

// "3D" animated scrollbar styles injected once
const SCROLL_CSS = `
.vfm-scroll::-webkit-scrollbar { width: 12px; }
.vfm-scroll::-webkit-scrollbar-track {
  background: linear-gradient(180deg, rgba(15,23,42,.06), rgba(15,23,42,.1));
  border-radius: 8px;
}
.vfm-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%);
  background-size: 200% 200%;
  animation: vfm-scroll-glow 3s ease infinite;
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: padding-box;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 2px rgba(0,0,0,.35), 0 0 8px rgba(99,102,241,.4);
}
.vfm-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #818cf8 100%);
  background-size: 200% 200%;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 2px rgba(0,0,0,.35), 0 0 14px rgba(139,92,246,.6);
}
.dark .vfm-scroll::-webkit-scrollbar-track {
  background: linear-gradient(180deg, rgba(148,163,184,.08), rgba(148,163,184,.14));
}
@keyframes vfm-scroll-glow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
`;

const FeatureManagementVisual = () => {
  const navigate = useNavigate();
  const { refreshFeatures } = useFeatureFlags();
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [persona, setPersona] = useState('admin');
  const [device, setDevice] = useState('desktop');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => { loadFeatures(); }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const response = await api.get('/features/admin/all');
      const featuresData = response.data.features || [];
      if (featuresData.length === 0) {
        showMessage('No features found. Check database.', 'error');
      }
      const sorted = featuresData.sort((a, b) => {
        if ((a.display_order ?? 0) !== (b.display_order ?? 0)) {
          return (a.display_order ?? 0) - (b.display_order ?? 0);
        }
        return (a.category || '').localeCompare(b.category || '');
      });
      setFeatures(sorted);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to load features';
      showMessage(`Failed to load features: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const patchFeature = async (featureId, patch, localPatch, successMsg) => {
    try {
      await api.put(`/features/admin/feature/${featureId}`, patch);
      setFeatures((fs) => fs.map((f) => (f.id === featureId ? { ...f, ...localPatch } : f)));
      await refreshFeatures();
      showMessage(successMsg, 'success');
    } catch (error) {
      console.error('Error updating feature:', error);
      showMessage('Failed to update feature', 'error');
    }
  };

  const toggleFeature = (feature) =>
    patchFeature(feature.id,
      { is_enabled: !feature.is_enabled, display_order: feature.display_order },
      { is_enabled: !feature.is_enabled },
      'Feature updated');

  const toggleBetaHide = (feature) =>
    patchFeature(feature.id,
      { hide_from_beta: !feature.hide_from_beta },
      { hide_from_beta: !feature.hide_from_beta },
      !feature.hide_from_beta ? 'Hidden from beta testers' : 'Visible to beta testers');

  const toggleAdminOnly = (feature) =>
    patchFeature(feature.id,
      { admin_only: !feature.admin_only },
      { admin_only: !feature.admin_only },
      !feature.admin_only ? 'Restricted to admins' : 'Available to all users');

  const toggleLimbo = (feature) =>
    patchFeature(feature.id,
      { is_limbo: !feature.is_limbo },
      { is_limbo: !feature.is_limbo },
      !feature.is_limbo ? 'Moved to Limbo' : 'Restored from Limbo');

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const active = features.filter((f) => !f.is_limbo);
    const limbo = features.filter((f) => f.is_limbo);
    const [moved] = active.splice(result.source.index, 1);
    active.splice(result.destination.index, 0, moved);
    const reordered = active.map((item, index) => ({ ...item, display_order: index }));
    setFeatures([...reordered, ...limbo]);
    setHasUnsavedChanges(true);
  };

  const saveOrder = async () => {
    try {
      setSaving(true);
      await Promise.all(
        features.map((feature, index) =>
          api.put(`/features/admin/feature/${feature.id}`, { display_order: index })
        )
      );
      setHasUnsavedChanges(false);
      showMessage('Order saved successfully!', 'success');
    } catch (error) {
      showMessage('Failed to save order', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const getFeature = (key) => features.find((f) => f.feature_key === key);

  // Would this persona see the feature? Mirrors backend gating.
  const visibleTo = (f, who) => {
    if (!f || !f.is_enabled || f.is_limbo) return false;
    if (f.admin_only && who !== 'admin') return false;
    if (who === 'beta' && f.hide_from_beta) return false;
    return true;
  };

  const matchesStatus = (f) => {
    switch (statusFilter) {
      case 'enabled': return f.is_enabled && !f.is_limbo;
      case 'disabled': return !f.is_enabled;
      case 'admin': return !!f.admin_only;
      case 'beta': return !!f.hide_from_beta;
      default: return true;
    }
  };

  const matchesSearch = (f) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.feature_name.toLowerCase().includes(q) ||
      f.feature_key.toLowerCase().includes(q) ||
      (f.category || '').toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q)
    );
  };

  const activeFeatures = features.filter((f) => !f.is_limbo && matchesStatus(f) && matchesSearch(f));
  const limboFeatures = features.filter((f) => f.is_limbo && matchesSearch(f));

  const FeatureRow = ({ feature, index, limbo = false }) => {
    const Icon = ICON_MAP[feature.feature_key] || Package;
    const inner = (provided, snapshot) => (
      <div
        ref={provided?.innerRef}
        {...(provided?.draggableProps || {})}
        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
          snapshot?.isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
            : limbo
            ? 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 opacity-75'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }`}
      >
        {provided && (
          <div {...provided.dragHandleProps}>
            <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />
          </div>
        )}

        <Icon className={`w-5 h-5 shrink-0 ${feature.is_enabled && !limbo ? 'text-primary-600' : 'text-gray-400'}`} />

        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
            {feature.feature_name}
            {feature.admin_only && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-bold">ADMIN</span>
            )}
            {feature.hide_from_beta && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold">NO BETA</span>
            )}
            {limbo && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-bold">LIMBO</span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {feature.feature_key} • {feature.category || 'uncategorized'} • {feature.min_tier}
          </div>
        </div>

        {/* Admin-only pill */}
        <button
          onClick={() => toggleAdminOnly(feature)}
          title={feature.admin_only ? 'Admin only — click to allow all users' : 'Visible to all users — click to make admin-only'}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
            feature.admin_only
              ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Shield className="w-3 h-3" />
          Admin
        </button>

        {/* Beta visibility pill */}
        <button
          onClick={() => toggleBetaHide(feature)}
          title={feature.hide_from_beta ? 'Hidden from beta testers — click to show' : 'Visible to beta testers — click to hide'}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
            feature.hide_from_beta
              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {feature.hide_from_beta ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          Beta
        </button>

        {/* Limbo / restore */}
        <button
          onClick={() => toggleLimbo(feature)}
          title={limbo ? 'Restore feature' : 'Move to Limbo (hidden from everyone)'}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
            limbo
              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300'
          }`}
        >
          {limbo ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
          {limbo ? 'Restore' : 'Limbo'}
        </button>

        {/* Enable toggle */}
        <button
          onClick={() => toggleFeature(feature)}
          title={feature.is_enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
            feature.is_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              feature.is_enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    );

    if (limbo) {
      return <div key={feature.id}>{inner(null, null)}</div>;
    }

    return (
      <Draggable key={feature.id} draggableId={feature.id.toString()} index={index}>
        {(provided, snapshot) => inner(provided, snapshot)}
      </Draggable>
    );
  };

  const renderPreview = () => {
    const deviceMeta = DEVICES.find((d) => d.id === device);
    const iconOnly = device === 'mobile';
    return (
      <div className={`${deviceMeta.width} bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 transition-all duration-300`}>
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.name} className="mb-6 last:mb-0">
            {!iconOnly && (
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                {section.name}
              </h3>
            )}
            {section.items.map((item, idx) => {
              const f = item.key ? getFeature(item.key) : null;
              const Icon = item.icon;
              const visible = item.key
                ? visibleTo(f, persona)
                : item.adminOnly ? persona === 'admin' : true;
              return (
                <div
                  key={`${section.name}-${idx}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ${
                    iconOnly ? 'justify-center' : ''
                  } ${
                    visible
                      ? item.special
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                        : item.adminOnly
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                        : 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-400 dark:text-gray-600 opacity-40'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!iconOnly && <span className={`text-sm ${visible ? '' : 'line-through'}`}>{item.label}</span>}
                  {!iconOnly && item.badge && visible && <span className="ml-auto text-xs">{item.badge}</span>}
                  {!iconOnly && item.special && visible && (
                    <span className="ml-auto bg-white text-purple-600 text-xs px-2 py-0.5 rounded-full font-bold">NEW</span>
                  )}
                  {!iconOnly && item.adminOnly && visible && (
                    <span className="ml-auto bg-white text-orange-600 text-xs px-2 py-0.5 rounded-full font-bold">ADMIN</span>
                  )}
                  {!iconOnly && !visible && f && (
                    <EyeOff className="w-4 h-4 ml-auto text-red-500" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{SCROLL_CSS}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Visual Feature Management
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Reorder, enable, gate by role, or shelve features — preview exactly who sees what
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadFeatures}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={saveOrder}
            disabled={saving}
            className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${
              hasUnsavedChanges
                ? 'bg-orange-600 hover:bg-orange-700 animate-pulse'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Order (Unsaved)' : 'Save Order'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Features
            </h3>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status filter chips */}
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    statusFilter === f.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="features">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="vfm-scroll space-y-2 max-h-[560px] overflow-y-auto pr-2"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {activeFeatures.map((feature, index) => (
                    <FeatureRow key={feature.id} feature={feature} index={index} />
                  ))}
                  {provided.placeholder}
                  {activeFeatures.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                      No features match the current filters.
                    </p>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Limbo */}
          {limboFeatures.length > 0 && (
            <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Archive className="w-4 h-4 text-gray-400" />
                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Limbo ({limboFeatures.length})
                </h4>
                <span className="text-xs text-gray-400">— hidden from everyone until restored</span>
              </div>
              <div className="vfm-scroll space-y-2 max-h-[220px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {limboFeatures.map((feature) => (
                  <FeatureRow key={feature.id} feature={feature} limbo />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live Preview
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Persona chips */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {PERSONAS.map((p) => {
                  const PIcon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPersona(p.id)}
                      title={`Preview as ${p.label}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                        persona === p.id
                          ? `${p.cls} text-white`
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <PIcon className="w-3.5 h-3.5" />
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {/* Device chips */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {DEVICES.map((d) => {
                  const DIcon = d.icon;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDevice(d.id)}
                      title={d.label}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                        device === d.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <DIcon className="w-3.5 h-3.5" />
                      {device === 'mobile' ? '' : d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            {renderPreview()}
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>{PERSONAS.find((p) => p.id === persona)?.label}</strong> view on{' '}
                <strong>{DEVICES.find((d) => d.id === device)?.label}</strong>: hidden items
                show struck-through with a red eye. Admin-only and Limbo features are removed
                for non-admin personas; beta testers additionally lose beta-hidden items.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureManagementVisual;
