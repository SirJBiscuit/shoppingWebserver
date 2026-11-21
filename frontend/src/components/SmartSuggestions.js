import { useState } from 'react';
import { Plus, AlertCircle, TrendingUp, TrendingDown, Clock, Brain, RotateCcw, ChevronDown, ChevronUp, Store, Home } from 'lucide-react';
import { isImageIcon } from '../utils/iconUpload';
import { useEditor } from '../contexts/EditorContext';
import { EditableContainer } from './editor/EditorOverlay';

const SmartSuggestions = ({ suggestions, removedItems, onAddSuggestion, advisor, storeName }) => {
  const { isEditorActive, selectWidget, selectedWidget, widgetProperties } = useEditor();
  const aveProps = widgetProperties['smart-suggestions'] || {};
  
  return (
    <EditableContainer
      isEditorActive={isEditorActive}
      componentName="Smart Suggestions"
      onSelect={() => selectWidget('smart-suggestions', 'dashboard')}
      isSelected={selectedWidget?.id === 'smart-suggestions'}
    >
      <SmartSuggestionsContent
        suggestions={suggestions}
        removedItems={removedItems}
        onAddSuggestion={onAddSuggestion}
        advisor={advisor}
        storeName={storeName}
        {...aveProps}
      />
    </EditableContainer>
  );
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Expandable price-intel box — last/prev at this store, cheapest store, margins.
const AdvisorBox = ({ data, storeName }) => {
  const cur = data.store;
  const others = (data.stores || []).filter(o => !cur || o.store.toLowerCase() !== cur.store.toLowerCase());
  return (
    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-900/20 dark:border-blue-800 p-2.5 text-xs space-y-1.5">
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

const SmartSuggestionsContent = ({ 
  suggestions, 
  removedItems = [],
  onAddSuggestion,
  maxSuggestions = 5,
  showIcons = true,
  showQuantity = true,
  showReason = true,
  showConfidence = false,
  showPrice = true,
  showTraining = true,
  showRemoved = true,
  maxRemoved = 8,
  compactMode = false,
  maxHeight = 384,
  groupByPriority = false,
  advisor = {},
  storeName = ''
}) => {
  const [openAdvisorKey, setOpenAdvisorKey] = useState(null);
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      default:
        return 'border-blue-300 bg-blue-50';
    }
  };

  const getPriorityIcon = (type) => {
    switch (type) {
      case 'low_inventory':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'recurring':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'frequent':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  // Limit suggestions based on maxSuggestions property
  const limitedSuggestions = suggestions.slice(0, maxSuggestions);
  
  // Group by priority if enabled
  const displaySuggestions = groupByPriority
    ? [...limitedSuggestions].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
      })
    : limitedSuggestions;

  if (suggestions.length === 0 && removedItems.length === 0) {
    return (
      <div className={`text-center ${compactMode ? 'py-4' : 'py-6'} text-gray-500`}>
        <p className="text-sm">No suggestions at the moment</p>
        <p className="text-xs mt-1">Keep shopping to get personalized suggestions!</p>
      </div>
    );
  }

  // Exact canonical name when the MDL learned it as something different
  const canonicalOf = (s) =>
    s.exactName && s.exactName.toLowerCase() !== s.item.toLowerCase() ? s.exactName : null;

  const fmtPrice = (s) =>
    s.price != null && !Number.isNaN(s.price)
      ? `${s.priceSource === 'catalog' ? '~' : ''}$${Number(s.price).toFixed(2)}`
      : null;

  const trainingLine = (s) => {
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

  // Price advisor lookup — keyed by lowercased name, exact or canonical.
  const advisorFor = (s) =>
    advisor[(s.item || '').toLowerCase()] ||
    (s.exactName ? advisor[s.exactName.toLowerCase()] : null) ||
    null;

  return (
    <div>
      <div 
        className={`${compactMode ? 'space-y-2' : 'space-y-3'} overflow-y-auto scrollbar-3d`}
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {displaySuggestions.map((suggestion, index) => {
          const adv = advisorFor(suggestion);
          const advKey = `${suggestion.item}-${index}`;
          const advisorOpen = openAdvisorKey === advKey;
          return (
          <div
            key={index}
            className={`${compactMode ? 'p-2' : 'p-3'} rounded-lg border-2 ${getPriorityColor(suggestion.priority)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className={`flex items-center ${compactMode ? 'mb-0.5' : 'mb-1'}`}>
                  {showIcons && getPriorityIcon(suggestion.type)}
                  {suggestion.icon && (
                    isImageIcon(suggestion.icon) ? (
                      <img src={suggestion.icon} alt="" className="w-6 h-6 ml-2 rounded object-cover flex-shrink-0" />
                    ) : (
                      <span className="ml-2 text-base flex-shrink-0" aria-hidden="true">{suggestion.icon}</span>
                    )
                  )}
                  <span className={`${showIcons ? 'ml-2' : ''} font-medium text-gray-900 ${compactMode ? 'text-sm' : ''}` }>
                    {suggestion.item}
                  </span>
                  {showPrice && fmtPrice(suggestion) && (
                    adv ? (
                      <button
                        type="button"
                        onClick={() => setOpenAdvisorKey(advisorOpen ? null : advKey)}
                        className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-200 tap-target flex items-center gap-0.5"
                        title="Price advisor — tap for store prices and trends"
                      >
                        {fmtPrice(suggestion)}
                        {advisorOpen ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                      </button>
                    ) : (
                      <span
                        className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700"
                        title={suggestion.priceSource === 'last_paid' ? 'Last price you paid'
                          : suggestion.priceSource === 'learned_avg' ? 'Your learned average' : 'Catalog estimate'}
                      >
                        {fmtPrice(suggestion)}
                      </span>
                    )
                  )}
                </div>
                {advisorOpen && adv && <AdvisorBox data={adv} storeName={storeName} />}
                {canonicalOf(suggestion) && (
                  <p className="text-[10px] text-gray-400 italic">listed as “{canonicalOf(suggestion)}”</p>
                )}
                {(suggestion.category || suggestion.atHome) && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {suggestion.category && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {suggestion.category}
                      </span>
                    )}
                    {suggestion.atHome && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center gap-0.5"
                        title="Already in your Home Inventory"
                      >
                        <Home className="w-2.5 h-2.5" />
                        Have {suggestion.atHome.qty}{suggestion.atHome.unit ? ` ${suggestion.atHome.unit}` : ''}
                      </span>
                    )}
                  </div>
                )}
                {showReason && (
                  <p className={`text-xs text-gray-600 ${compactMode ? 'mb-1' : 'mb-2'}`}>{suggestion.reason}</p>
                )}
                {showQuantity && suggestion.quantity && (
                  <p className="text-xs text-gray-500">
                    Suggested: {suggestion.quantity} {suggestion.unit}
                  </p>
                )}
                {showTraining && trainingLine(suggestion) && (
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> {trainingLine(suggestion)}
                  </p>
                )}
                {showConfidence && suggestion.confidence && (
                  <p className="text-xs text-gray-400 mt-1">
                    Confidence: {Math.round(suggestion.confidence * 100)}%
                  </p>
                )}
              </div>
              <button
                onClick={() => onAddSuggestion(suggestion)}
                className="ml-2 p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                title="Add to list"
              >
                <Plus className="w-4 h-4 text-primary-600" />
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {showRemoved && removedItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Previously removed — tap to re-add
          </p>
          <div className={`${compactMode ? 'space-y-1' : 'space-y-1.5'} overflow-y-auto scrollbar-3d`} style={{ maxHeight: '160px' }}>
            {removedItems.slice(0, maxRemoved).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 px-2 rounded-md bg-gray-50 hover:bg-gray-100">
                <span className="text-gray-700 truncate">
                  {r.item_name}
                  <span className="text-[10px] text-gray-400 ml-1.5">
                    {r.quantity ? `${r.quantity} ${r.unit || ''}`.trim() : ''}
                  </span>
                </span>
                <button
                  onClick={() => onAddSuggestion({ item: r.item_name, quantity: r.quantity || 1, unit: r.unit || '', price: r.price || 0 })}
                  className="ml-2 p-1 bg-white rounded hover:bg-gray-200 transition-colors flex-shrink-0"
                  title="Re-add to list"
                >
                  <Plus className="w-3.5 h-3.5 text-primary-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSuggestions;
