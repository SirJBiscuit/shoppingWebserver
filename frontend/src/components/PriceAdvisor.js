import { TrendingUp, TrendingDown, Store } from 'lucide-react';

export const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Exact canonical name when the MDL learned it as something different
export const canonicalOf = (s) =>
  s.exactName && s.exactName.toLowerCase() !== s.item.toLowerCase() ? s.exactName : null;

export const fmtPrice = (s) =>
  s.price != null && !Number.isNaN(s.price)
    ? `${s.priceSource === 'catalog' ? '~' : ''}$${Number(s.price).toFixed(2)}`
    : null;

// Price advisor lookup — keyed by lowercased name, exact or canonical.
export const advisorFor = (advisor, s) =>
  advisor[(s.item || '').toLowerCase()] ||
  (s.exactName ? advisor[s.exactName.toLowerCase()] : null) ||
  null;

export const trainingLine = (s) => {
  if (!s.mdl) return null;
  const bits = [`trained on ${s.mdl.timesAdded} add${s.mdl.timesAdded === 1 ? '' : 's'}`];
  if (s.mdl.confidence != null) bits.push(`${Math.round(s.mdl.confidence * 100)}% conf`);
  if (s.mdl.nextDue) {
    const d = new Date(s.mdl.nextDue);
    if (!Number.isNaN(d.getTime()))
      bits.push(`due ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`);
  }
  return bits.join(' · ');
};

// Expandable price-intel box — last/prev at this store, cheapest store, margins.
const AdvisorBox = ({ data, storeName }) => {
  const cur = data.store;
  const others = (data.stores || []).filter(o => !cur || o.store.toLowerCase() !== cur.store.toLowerCase());
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-900/20 dark:border-blue-800 p-2.5 text-xs space-y-1.5">
      {cur && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <Store className="w-3 h-3 text-blue-600" />
            <strong>{cur.store === 'Unknown store' && storeName ? storeName : cur.store}</strong>
            {cur.at && <span className="text-gray-400">· {fmtDate(cur.at)}</span>}
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">${cur.price.toFixed(2)}</span>
        </div>
      )}
      {cur && cur.changePct != null && cur.prev != null && (
        <div className="flex items-center gap-1.5">
          {cur.changePct > 0
            ? <TrendingUp className="w-3.5 h-3.5 text-red-500" />
            : cur.changePct < 0
              ? <TrendingDown className="w-3.5 h-3.5 text-green-600" />
              : <span className="w-3.5 h-3.5 text-center text-gray-400">=</span>}
          <span className={cur.changePct > 0 ? 'text-red-600' : cur.changePct < 0 ? 'text-green-700' : 'text-gray-500'}>
            {cur.changePct > 0 ? '+' : ''}{cur.changePct}% vs last time (${cur.prev.toFixed(2)})
          </span>
        </div>
      )}
      {data.best && (!cur || data.best.store.toLowerCase() !== (cur.store || '').toLowerCase()) && (
        <div className="flex items-center justify-between rounded bg-green-100/80 dark:bg-green-900/30 px-2 py-1">
          <span className="text-green-800 dark:text-green-200">
            Cheapest: <strong>{data.best.store}</strong>
          </span>
          <span className="font-semibold text-green-800 dark:text-green-200">
            ${data.best.price.toFixed(2)}
            {cur && cur.savesPct != null && <span className="ml-1 text-[10px]">(save {cur.savesPct}%)</span>}
          </span>
        </div>
      )}
      {others.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {others.slice(0, 4).map(o => (
            <span key={o.store} className="px-1.5 py-0.5 rounded bg-white/80 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              {o.store} ${o.price.toFixed(2)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvisorBox;
