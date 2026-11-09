import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, Search, Pencil, X, RefreshCw, Save,
  Archive, DollarSign, Package, Layers, Brain, ListOrdered, Store
} from 'lucide-react';
import {
  getAdminStats, searchProducts, getProductCategories,
  updateProduct, addPriceRecord, runMdlBackup
} from '../../api/mdl';
import { CANONICAL_CATEGORIES, canonicalizeCategory, getCategoryIcon } from '../../utils/categoryDetector';

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

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [s, c, p] = await Promise.all([
      getAdminStats(),
      getProductCategories(),
      searchProducts('', '', 50),
    ]);
    setStats(s);
    setCategories(c);
    setProducts(p);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // External refresh trigger (e.g. MDLProducts page quick-add)
  useEffect(() => {
    const handler = () => loadAll();
    window.addEventListener('mdl-products-refresh', handler);
    return () => window.removeEventListener('mdl-products-refresh', handler);
  }, [loadAll]);

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
    setNotice(`Saved "${updated.product_name}"`);
    setTimeout(() => setNotice(''), 3000);
    loadAll(); // refresh stats
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

  const statCards = [
    { label: 'Products', value: stats?.products, icon: Package, color: 'text-primary-600 dark:text-primary-400' },
    { label: 'Categories', value: stats?.categories, icon: Layers, color: 'text-green-600 dark:text-green-400' },
    { label: 'Price Records', value: stats?.priceRecords, icon: DollarSign, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Known Items', value: stats?.itemNames, icon: ListOrdered, color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Training Events', value: stats?.userHistory, icon: Brain, color: 'text-orange-600 dark:text-orange-400' },
    { label: 'User Patterns', value: stats?.userPatterns, icon: Database, color: 'text-pink-600 dark:text-pink-400' },
  ];

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary-500';

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

      {/* Products table */}
      <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Product</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Avg Price</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Purchased</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Best Store</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {p.icon_image_url ? (
                        <img src={p.icon_image_url} alt="" className="w-7 h-7 rounded object-cover" />
                      ) : (
                        <span className="text-lg">{p.icon_emoji || '📦'}</span>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">{p.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {p.category ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium whitespace-nowrap">
                        {getCategoryIcon(p.category)} {canonicalizeCategory(p.category)}
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
              ))}
              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    No products found. The catalog grows automatically as items are tracked.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    Loading product database…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon (emoji)</label>
                  <input className={inputCls} value={form.icon_emoji}
                    onChange={(e) => setForm({ ...form, icon_emoji: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Best Store</label>
                  <input className={inputCls} value={form.best_store}
                    onChange={(e) => setForm({ ...form, best_store: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Common Size</label>
                  <input className={inputCls} value={form.common_size}
                    onChange={(e) => setForm({ ...form, common_size: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Common Unit</label>
                  <input className={inputCls} value={form.common_unit}
                    onChange={(e) => setForm({ ...form, common_unit: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

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
      )}
    </div>
  );
};

export default MDLProductsPanel;
