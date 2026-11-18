import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, Search, Pencil, X, RefreshCw, Save,
  Archive, DollarSign, Package, Layers, Brain, ListOrdered,
  Store, Star, MapPin, Tag, Plus, Trash2, ChevronDown,
  Heart, Smile
} from 'lucide-react';
import {
  getAdminStats, searchProducts, getProductCategories,
  updateProduct, addPriceRecord, runMdlBackup,
  getSizePresets, createSizePreset,
  getProductVariants, saveProductVariant, deleteProductVariant, markBestVariant,
  getFavorites
} from '../../api/mdl';
import { CANONICAL_CATEGORIES, canonicalizeCategory, getCategoryIcon } from '../../utils/categoryDetector';
import IconPicker from '../IconPicker';
import FavoritePicker from '../FavoritePicker';
import { Popup, Portal } from '../../utils/autoPlacement';

// Preset color key -> tailwind classes
const PRESET_COLORS = {
  red:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  cyan:   'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  gray:   'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};
const presetColor = (c) => PRESET_COLORS[c] || PRESET_COLORS.gray;

// Canonical category -> chip color (color coding for the MDL system)
const CATEGORY_CHIP_COLORS = {
  'Produce':             'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Meat & Seafood':      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'Dairy & Eggs':        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Frozen':              'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'Bakery':              'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Pantry Staples':      'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Snacks':              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Beverages':           'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'Condiments & Sauces': 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
  'Breakfast':           'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Household':           'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Personal Care':       'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'Other':               'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};
const categoryChip = (cat) =>
  CATEGORY_CHIP_COLORS[canonicalizeCategory(cat)] || CATEGORY_CHIP_COLORS['Other'];

const PRESET_TYPE_LABELS = {
  weight: 'Weights',
  package: 'Package amounts',
  size: 'Sizes',
  unit: 'Units',
};

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary-500';

/**
 * MDL Product Database admin panel.
 * Real product browser + editor backed by /api/mdl endpoints.
 * Used by Admin.js (MDL tab) and AdminTraining.js (Products tab).
 */
const MDLProductsPanel = () => {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [editing, setEditing] = useState(null);   // product row being edited
  const [form, setForm] = useState({});
  const [newPrice, setNewPrice] = useState('');
  const [newStore, setNewStore] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // 'edit' (edit modal) or {product} for quick icon change
  const [iconPickerFor, setIconPickerFor] = useState(null);
  // Inline category quick-edit popover {product, x, y}
  const [catEditor, setCatEditor] = useState(null);
  // Right-click context menu {product, x, y}
  const [ctxMenu, setCtxMenu] = useState(null);
  // Favorite picker {product}
  const [favPicker, setFavPicker] = useState(null);
  // Favorites index: entity_name(lowercase) -> favorite rows
  const [favorites, setFavorites] = useState({});

  const showNotice = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 3000); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [s, c, p, favs] = await Promise.all([
      getAdminStats(),
      getProductCategories(),
      searchProducts('', '', 50),
      getFavorites('item'),
    ]);
    setStats(s);
    setCategories(c);
    setProducts(p);
    const idx = {};
    for (const f of favs || []) {
      const k = f.entity_name.toLowerCase();
      idx[k] = idx[k] || [];
      idx[k].push(f);
    }
    setFavorites(idx);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // External refresh trigger (e.g. MDLProducts page quick-add)
  useEffect(() => {
    const handler = () => loadAll();
    window.addEventListener('mdl-products-refresh', handler);
    return () => window.removeEventListener('mdl-products-refresh', handler);
  }, [loadAll]);

  // Close popovers on outside click / escape
  useEffect(() => {
    const close = () => { setCtxMenu(null); setCatEditor(null); };
    const esc = (e) => e.key === 'Escape' && close();
    document.addEventListener('click', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  const doSearch = async () => {
    setSearching(true);
    setProducts(await searchProducts(query.trim(), category, 50));
    setSearching(false);
  };

  const openEditor = (product) => {
    setEditing(product);
    setForm({
      product_name: product.product_name || '',
      category: product.category || '',
      average_price: product.average_price ?? '',
      icon_emoji: product.icon_emoji || '',
      common_size: product.common_size || '',
      common_unit: product.common_unit || '',
      best_store: product.best_store || '',
      aisle: product.aisle || '',
      brand: product.brand || '',
      is_best: !!product.is_best,
      notes: product.notes || '',
    });
    setNewPrice('');
    setNewStore('');
    setError('');
  };

  const saveEdit = async () => {
    const payload = { ...form };
    if (payload.average_price === '' || payload.average_price === null) delete payload.average_price;
    else payload.average_price = parseFloat(payload.average_price);

    const updated = await updateProduct(editing.id, payload);
    if (!updated) {
      setError('Save failed — check admin permissions.');
      return;
    }
    setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    setEditing(null);
    showNotice(`Saved "${updated.product_name}"`);
    loadAll(); // refresh stats
  };

  /** Quick single-field save used by inline popovers (category, icon, best). */
  const quickSave = async (productId, patch, msg) => {
    const updated = await updateProduct(productId, patch);
    if (!updated) { setError('Save failed.'); return; }
    setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    if (editing?.id === updated.id) setEditing(updated);
    if (msg) showNotice(msg);
  };

  const addPrice = async () => {
    if (!newPrice || isNaN(parseFloat(newPrice))) {
      setError('Enter a valid price first.');
      return;
    }
    const result = await addPriceRecord(editing.id, parseFloat(newPrice), newStore || null);
    if (!result) {
      setError('Failed to record price.');
      return;
    }
    setNotice(`Price recorded — new avg $${Number(result.averagePrice).toFixed(2)}`);
    setNewPrice('');
    setNewStore('');
    setTimeout(() => setNotice(''), 3000);
  };

  const runBackup = async () => {
    setNotice('Running backup…');
    const result = await runMdlBackup();
    setNotice(result ? `Backup saved: ${result.filename}` : 'Backup failed.');
    setTimeout(() => setNotice(''), 4000);
  };

  const onRowContext = (e, product) => {
    e.preventDefault();
    setCtxMenu({ product, x: e.clientX, y: e.clientY });
  };

  const statCards = [
    { label: 'Products', value: stats?.products, icon: Package, color: 'text-primary-600 dark:text-primary-400' },
    { label: 'Categories', value: stats?.categories, icon: Layers, color: 'text-green-600 dark:text-green-400' },
    { label: 'Price Records', value: stats?.priceRecords, icon: DollarSign, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Known Items', value: stats?.itemNames, icon: ListOrdered, color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Training Events', value: stats?.userHistory, icon: Brain, color: 'text-orange-600 dark:text-orange-400' },
    { label: 'User Patterns', value: stats?.userPatterns, icon: Database, color: 'text-pink-600 dark:text-pink-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${color}`}>{value ?? '—'}</div>
              <Icon className={`w-5 h-5 ${color} opacity-60`} />
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Search products…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} sm:w-52`}>
          <option value="">All categories</option>
          {CANONICAL_CATEGORIES.map((cc) => {
            const n = categories.find(c => c.category === cc.name)?.count;
            return (
              <option key={cc.name} value={cc.name}>
                {cc.icon} {cc.name}{n ? ` (${n})` : ''}
              </option>
            );
          })}
          {/* any legacy/unmapped buckets still in the DB */}
          {categories
            .filter(c => c.category && !CANONICAL_CATEGORIES.some(cc => cc.name === c.category))
            .map((c) => (
              <option key={c.category} value={c.category}>
                📦 {c.category} ({c.count})
              </option>
            ))}
        </select>
        <button onClick={doSearch} disabled={searching} className="btn-primary text-sm flex items-center gap-2">
          <Search className="w-4 h-4" /> {searching ? 'Searching…' : 'Search'}
        </button>
        <button onClick={loadAll} className="btn-secondary text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <button onClick={runBackup} className="btn-secondary text-sm flex items-center gap-2">
          <Archive className="w-4 h-4" /> Backup Now
        </button>
      </div>

      {notice && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-300 text-sm rounded-lg px-4 py-2">
          {notice}
        </div>
      )}

      {error && !editing && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Products table */}
      <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          Tip: click a category chip to change it, click the icon to re-pick it, right-click a row for best-product &amp; favorites.
        </div>
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Product</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Brand</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Aisle</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Avg Price</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Purchased</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Best Store</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {products.map((p) => {
                const favs = favorites[(p.product_name || '').toLowerCase()] || [];
                return (
                  <tr
                    key={p.id}
                    onContextMenu={(e) => onRowContext(e, p)}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
                      p.is_best ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setIconPickerFor({ product: p }); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          title="Change icon"
                        >
                          {p.icon_image_url ? (
                            <img src={p.icon_image_url} alt="" className="w-7 h-7 rounded object-cover" />
                          ) : (
                            <span className="text-lg">{p.icon_emoji || '📦'}</span>
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-gray-900 dark:text-white truncate ${p.is_best ? 'font-bold' : 'font-medium'}`}>
                              {p.product_name}
                            </span>
                            {p.is_best && (
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          {favs.length > 0 && (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {favs.slice(0, 4).map((f) => (
                                <span key={f.id} title={`${f.member_name || 'Household'}: ${f.preference}`}
                                  className="text-xs">
                                  {f.avatar_emoji || '👤'}
                                  {f.preference === 'favorite' ? '❤️' : f.preference === 'hated' ? '🚫' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {p.category ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const r = e.currentTarget.getBoundingClientRect();
                            setCatEditor({ product: p, x: r.left, y: r.bottom });
                          }}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-transform hover:scale-105 ${categoryChip(p.category)}`}
                          title="Click to change category"
                        >
                          {getCategoryIcon(p.category)} {canonicalizeCategory(p.category)}
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                      {p.brand ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                          <Tag className="w-3 h-3" />{p.brand}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                      {p.aisle ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                          <MapPin className="w-3 h-3" />{p.aisle}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                      {p.average_price ? `$${Number(p.average_price).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{p.times_purchased ?? 0}×</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center gap-1">
                        {p.best_store && <Store className="w-3.5 h-3.5" />}
                        {p.best_store || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => openEditor(p)}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                        title="Edit product"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    No products found. The catalog grows automatically as items are tracked.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    Loading product database…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline category quick-edit popover */}
      {catEditor && (
        <Popup
          x={catEditor.x} y={catEditor.y} width={224}
          className="z-[70] w-56 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl p-2 max-h-72 overflow-y-auto"
        >
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
            Category for "{catEditor.product.product_name}"
          </div>
          {CANONICAL_CATEGORIES.map((cc) => (
            <button
              key={cc.name}
              onClick={async () => {
                const p = catEditor.product;
                setCatEditor(null);
                await quickSave(p.id, { category: cc.name }, `Category → ${cc.name}`);
              }}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
                canonicalizeCategory(catEditor.product.category) === cc.name
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{cc.icon}</span> {cc.name}
            </button>
          ))}
        </Popup>
      )}

      {/* Right-click context menu */}
      {ctxMenu && (
        <Popup
          x={ctxMenu.x} y={ctxMenu.y} width={208}
          className="z-[70] w-52 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl py-1"
        >
          <button
            onClick={() => { openEditor(ctxMenu.product); setCtxMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
          >
            <Pencil className="w-4 h-4" /> Edit product
          </button>
          <button
            onClick={async () => {
              const p = ctxMenu.product;
              setCtxMenu(null);
              await quickSave(p.id, { is_best: !p.is_best },
                p.is_best ? `Removed "best" from ${p.product_name}` : `⭐ ${p.product_name} marked best`);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
          >
            <Star className={`w-4 h-4 ${ctxMenu.product.is_best ? 'text-amber-500 fill-amber-500' : ''}`} />
            {ctxMenu.product.is_best ? 'Unmark best product' : 'Mark as best product'}
          </button>
          <button
            onClick={() => { setIconPickerFor({ product: ctxMenu.product }); setCtxMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
          >
            <Smile className="w-4 h-4" /> Change icon
          </button>
          <button
            onClick={() => { setFavPicker({ product: ctxMenu.product }); setCtxMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
          >
            <Heart className="w-4 h-4 text-pink-500" /> Whose favorite?
          </button>
        </Popup>
      )}

      {/* Icon picker (quick icon change or edit-modal) */}
      {iconPickerFor && (
        <Portal>
          <IconPicker
          currentIcon={
            iconPickerFor === 'edit'
              ? form.icon_emoji
              : iconPickerFor.product?.icon_emoji
          }
          itemName={
            iconPickerFor === 'edit'
              ? form.product_name
              : iconPickerFor.product?.product_name || ''
          }
          onSelect={async (icon) => {
            if (iconPickerFor === 'edit') {
              setForm(f => ({ ...f, icon_emoji: icon }));
            } else {
              const p = iconPickerFor.product;
              await quickSave(p.id, { icon_emoji: icon }, `Icon updated for ${p.product_name}`);
            }
          }}
            onClose={() => setIconPickerFor(null)}
          />
        </Portal>
      )}

      {/* Household favorite picker */}
      {favPicker && (
        <FavoritePicker
          entityName={favPicker.product.product_name}
          productId={favPicker.product.id}
          onClose={(changed) => {
            setFavPicker(null);
            if (changed) loadAll();
          }}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <Portal>
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Product</h3>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input className={inputCls} value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
              </div>

              {/* Icon picker + Best flag */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIconPickerFor('edit')}
                  className="w-12 h-12 text-2xl flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-primary-100 dark:hover:bg-primary-900 border-2 border-gray-200 dark:border-gray-600 hover:border-primary-400 transition-all"
                  title="Open icon picker"
                >
                  {form.icon_emoji || '📦'}
                </button>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Product icon</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Click the emoji to open the icon picker</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_best}
                    onChange={(e) => setForm({ ...form, is_best: e.target.checked })}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> Best product
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select className={inputCls} value={canonicalizeCategory(form.category)}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CANONICAL_CATEGORIES.map((cc) => (
                      <option key={cc.name} value={cc.name}>{cc.icon} {cc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Avg Price ($)</label>
                  <input className={inputCls} type="number" step="0.01" value={form.average_price}
                    onChange={(e) => setForm({ ...form, average_price: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
                  <input className={inputCls} value={form.brand} placeholder="e.g. Heinz, Great Value"
                    onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aisle</label>
                  <input className={inputCls} value={form.aisle} placeholder="e.g. Aisle 5"
                    onChange={(e) => setForm({ ...form, aisle: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Best Store</label>
                  <input className={inputCls} value={form.best_store}
                    onChange={(e) => setForm({ ...form, best_store: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon (emoji)</label>
                  <input className={inputCls} value={form.icon_emoji}
                    onChange={(e) => setForm({ ...form, icon_emoji: e.target.value })} />
                </div>
              </div>

              {/* Preset-driven size + unit pickers */}
              <SizeUnitFields form={form} setForm={setForm} />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              {/* Per-store variants (learn aisle/price/best per store) */}
              <VariantManager productId={editing.id} />

              {/* Add a price record */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Record a price</p>
                <div className="flex gap-2">
                  <input className={`${inputCls} w-28`} type="number" step="0.01" placeholder="$ 0.00"
                    value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                  <input className={`${inputCls} flex-1`} placeholder="Store (optional)"
                    value={newStore} onChange={(e) => setNewStore(e.target.value)} />
                  <button onClick={addPrice} className="btn-secondary text-sm">Add</button>
                </div>
              </div>

              <button onClick={saveEdit} className="btn-primary w-full flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save Product
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------
 * SizeUnitFields — preset-driven pickers for common_size/common_unit.
 * Presets carry simple labels + colors; admins can add new ones inline.
 * ------------------------------------------------------------------ */
const SizeUnitFields = ({ form, setForm }) => {
  const [presets, setPresets] = useState([]);
  const [adding, setAdding] = useState(false);
  const [np, setNp] = useState({ preset_type: 'size', label: '', value: '', color: 'gray' });

  const load = useCallback(async () => {
    setPresets(await getSizePresets(canonicalizeCategory(form.category)));
  }, [form.category]);

  useEffect(() => { load(); }, [load]);

  const byType = presets.reduce((acc, p) => {
    (acc[p.preset_type] = acc[p.preset_type] || []).push(p);
    return acc;
  }, {});

  const addPreset = async () => {
    if (!np.label.trim() || !np.value.trim()) return;
    await createSizePreset({
      category: null, // global preset
      preset_type: np.preset_type,
      label: np.label.trim(),
      value: np.value.trim(),
      color: np.color,
    });
    setNp({ preset_type: 'size', label: '', value: '', color: 'gray' });
    setAdding(false);
    load();
  };

  const PresetChip = ({ active, onClick, color, children }) => (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
        active
          ? 'border-primary-500 ring-1 ring-primary-400 ' + presetColor(color)
          : 'border-transparent hover:scale-105 ' + presetColor(color)
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Size / Weight / Unit <span className="font-normal text-xs text-gray-400">(presets + custom)</span>
        </p>
        <button onClick={() => setAdding(a => !a)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> New preset
        </button>
      </div>

      {adding && (
        <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
          <select className={inputCls} value={np.preset_type}
            onChange={(e) => setNp({ ...np, preset_type: e.target.value })}>
            {Object.entries(PRESET_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select className={inputCls} value={np.color}
            onChange={(e) => setNp({ ...np, color: e.target.value })}>
            {Object.keys(PRESET_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className={inputCls} placeholder='Label, e.g. "Amount per package"'
            value={np.label} onChange={(e) => setNp({ ...np, label: e.target.value })} />
          <input className={inputCls} placeholder='Value, e.g. "1 lb"'
            value={np.value} onChange={(e) => setNp({ ...np, value: e.target.value })} />
          <button onClick={addPreset} className="btn-primary text-xs col-span-2">Add preset</button>
        </div>
      )}

      {Object.entries(byType).map(([type, list]) => (
        <div key={type}>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            {PRESET_TYPE_LABELS[type] || type}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {list.map((p) => (
              <PresetChip
                key={p.id}
                color={p.color}
                active={form.common_size === p.value || form.common_unit === p.value}
                onClick={() => {
                  const field = type === 'unit' ? 'common_unit' : 'common_size';
                  setForm(f => ({
                    ...f,
                    [field]: f[field] === p.value ? '' : p.value,
                  }));
                }}
              >
                {p.label}
              </PresetChip>
            ))}
          </div>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Common Size (custom ok)</label>
          <input className={inputCls} value={form.common_size}
            onChange={(e) => setForm({ ...form, common_size: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Common Unit (custom ok)</label>
          <input className={inputCls} value={form.common_unit}
            onChange={(e) => setForm({ ...form, common_unit: e.target.value })} />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * VariantManager — per-store sub-entries (aisle/price/size/best per store)
 * ------------------------------------------------------------------ */
const VariantManager = ({ productId }) => {
  const [variants, setVariants] = useState([]);
  const [vform, setVform] = useState({ store_name: '', aisle: '', price: '', size_value: '', is_best: false });
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setVariants(await getProductVariants(productId));
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const addVariant = async () => {
    if (!vform.store_name.trim()) { setErr('Store name required.'); return; }
    const v = await saveProductVariant(productId, {
      store_name: vform.store_name.trim(),
      aisle: vform.aisle || null,
      price: vform.price ? parseFloat(vform.price) : null,
      size_value: vform.size_value || '',
      is_best: vform.is_best || null,
    });
    if (!v) { setErr('Failed to save variant.'); return; }
    setVform({ store_name: '', aisle: '', price: '', size_value: '', is_best: false });
    setErr('');
    load();
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
        <Store className="w-4 h-4" /> Store versions
        <span className="font-normal text-xs text-gray-400">(per-location aisle, price & best pick)</span>
      </p>

      {variants.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {variants.map((v) => (
            <div key={v.id}
              className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${
                v.is_best
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
              }`}
            >
              {v.is_best && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
              <span className="font-medium text-gray-900 dark:text-white flex-1 truncate">{v.store_name}</span>
              {v.size_value && <span className="text-xs text-gray-500">{v.size_value}</span>}
              {v.aisle && (
                <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                  Aisle {v.aisle}
                </span>
              )}
              {v.price != null && (
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">${Number(v.price).toFixed(2)}</span>
              )}
              <button
                onClick={async () => { await markBestVariant(v.id); load(); }}
                className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-500"
                title="Mark as best version at this store"
              >
                <Star className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={async () => { await deleteProductVariant(v.id); load(); }}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500"
                title="Delete variant"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {err && <p className="text-xs text-red-500 mb-2">{err}</p>}

      <div className="grid grid-cols-4 gap-2">
        <input className={inputCls} placeholder="Store (e.g. Walmart)"
          value={vform.store_name} onChange={(e) => setVform({ ...vform, store_name: e.target.value })} />
        <input className={inputCls} placeholder="Aisle"
          value={vform.aisle} onChange={(e) => setVform({ ...vform, aisle: e.target.value })} />
        <input className={inputCls} type="number" step="0.01" placeholder="Price"
          value={vform.price} onChange={(e) => setVform({ ...vform, price: e.target.value })} />
        <button onClick={addVariant} className="btn-secondary text-sm flex items-center justify-center gap-1">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input className={inputCls} placeholder="Size variant (optional, e.g. 1 lb)"
          value={vform.size_value} onChange={(e) => setVform({ ...vform, size_value: e.target.value })} />
        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
          <input type="checkbox" checked={vform.is_best}
            onChange={(e) => setVform({ ...vform, is_best: e.target.checked })}
            className="w-3.5 h-3.5 accent-amber-500" />
          Best here
        </label>
      </div>
    </div>
  );
};

export default MDLProductsPanel;
