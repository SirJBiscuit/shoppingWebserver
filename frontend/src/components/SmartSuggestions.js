import { useState } from 'react';
import { AlertCircle, Clock, TrendingUp, Brain, RotateCcw, ChevronDown, ChevronUp, Home, Lightbulb } from 'lucide-react';
import { isImageIcon } from '../utils/iconUpload';
import { useEditor } from '../contexts/EditorContext';
import { EditableContainer } from './editor/EditorOverlay';
import AdvisorBox, { advisorFor, canonicalOf, fmtPrice, trainingLine } from './PriceAdvisor';

/**
 * SmartSuggestions — compact chip strip (replaces the old card widget).
 * Sits under "Looking for Next": each chip is icon + name + price badge.
 * Tap a chip to add the item; tap its price badge to expand the store
 * price advisor inline under the strip. Removed items trail as dashed
 * re-add chips.
 */
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
      <SmartSuggestionChips
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

const PRIORITY_ICON = {
  low_inventory: <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />,
  recurring: <Clock className="w-3 h-3 text-yellow-500 flex-shrink-0" />,
  frequent: <TrendingUp className="w-3 h-3 text-blue-500 flex-shrink-0" />,
};

const PRIORITY_RING = {
  high: 'border-red-300 dark:border-red-700',
  medium: 'border-yellow-300 dark:border-yellow-700',
};

const SuggestionIcon = ({ icon }) => {
  if (!icon) return null;
  return isImageIcon(icon) ? (
    <img src={icon} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
  ) : (
    <span className="text-base leading-none flex-shrink-0" aria-hidden="true">{icon}</span>
  );
};

const SmartSuggestionChips = ({
  suggestions = [],
  removedItems = [],
  onAddSuggestion,
  maxSuggestions = 10,
  showIcons = true,
  showPrice = true,
  showRemoved = true,
  maxRemoved = 6,
  advisor = {},
  storeName = '',
}) => {
  const [openAdvisorKey, setOpenAdvisorKey] = useState(null);
  const [detailKey, setDetailKey] = useState(null);

  if (suggestions.length === 0 && removedItems.length === 0) return null;

  const chips = suggestions.slice(0, maxSuggestions);
  const openSuggestion = openAdvisorKey != null ? chips[openAdvisorKey] : null;
  const detailSuggestion = detailKey != null ? chips[detailKey] : null;

  return (
    <div data-tutorial="suggestions">
      <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
        <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Smart suggestions — tap to add
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-3d pb-2 -mx-1 px-1">
        {chips.map((suggestion, index) => {
          const adv = advisorFor(advisor, suggestion);
          const price = showPrice ? fmtPrice(suggestion) : null;
          const advisorOpen = openAdvisorKey === index;
          const detailOpen = detailKey === index;
          return (
            <div
              key={suggestion.id || `${suggestion.item}-${suggestion.category || 'x'}`}
              className={`flex-shrink-0 flex items-center gap-1.5 pl-2 pr-1 py-1.5 rounded-full border-2 bg-white dark:bg-gray-800 shadow-sm ${
                PRIORITY_RING[suggestion.priority] || 'border-blue-200 dark:border-blue-800'
              }`}
            >
              {PRIORITY_ICON[suggestion.type]}
              <button
                type="button"
                onClick={() => setDetailKey(detailOpen ? null : index)}
                onDoubleClick={() => onAddSuggestion(suggestion)}
                className="flex items-center gap-1.5 tap-target rounded-full"
                title={`${suggestion.item}${suggestion.reason ? ` — ${suggestion.reason}` : ''}`}
              >
                {showIcons && <SuggestionIcon icon={suggestion.icon} />}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap max-w-[9rem] truncate">
                  {suggestion.item}
                </span>
                {suggestion.atHome && (
                  <span
                    className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                    title="Already in your Home Inventory"
                  >
                    <Home className="w-2.5 h-2.5" />{suggestion.atHome.qty}
                  </span>
                )}
              </button>
              {price && (
                adv ? (
                  <button
                    type="button"
                    onClick={() => setOpenAdvisorKey(advisorOpen ? null : index)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 tap-target flex items-center gap-0.5"
                    title="Price advisor — tap for store prices and trends"
                  >
                    {price}
                    {advisorOpen ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                  </button>
                ) : (
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                    title={suggestion.priceSource === 'last_paid' ? 'Last price you paid'
                      : suggestion.priceSource === 'learned_avg' ? 'Your learned average' : 'Catalog estimate'}
                  >
                    {price}
                  </span>
                )
              )}
              <button
                type="button"
                onClick={() => onAddSuggestion(suggestion)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 hover:bg-primary-200 dark:hover:bg-primary-900/60 text-primary-600 dark:text-primary-300 font-bold text-sm tap-target"
                title={`Add ${suggestion.item} to list`}
              >
                +
              </button>
            </div>
          );
        })}

        {showRemoved && removedItems.slice(0, maxRemoved).map((r) => (
          <div
            key={`removed-${r.id || r.item_name}`}
            className="flex-shrink-0 flex items-center gap-1.5 pl-2 pr-1 py-1.5 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60"
          >
            <RotateCcw className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap max-w-[8rem] truncate" title="Previously removed — tap to re-add">
              {r.item_name}
            </span>
            <button
              type="button"
              onClick={() => onAddSuggestion({ item: r.item_name, quantity: r.quantity || 1, unit: r.unit || '', price: r.price || 0 })}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold text-sm tap-target"
              title={`Re-add ${r.item_name} to list`}
            >
              +
            </button>
          </div>
        ))}
      </div>

      {/* Inline advisor — expands under the strip when a price badge is tapped */}
      {openSuggestion && advisorFor(advisor, openSuggestion) && (
        <div className="mt-1">
          <div className="flex items-center gap-1 mb-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            {openSuggestion.item}
          </div>
          <AdvisorBox data={advisorFor(advisor, openSuggestion)} storeName={storeName} />
        </div>
      )}

      {/* Inline detail — reason / quantity / MDL training, when the chip name is tapped */}
      {detailSuggestion && (
        <div className="mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 p-2.5 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <strong className="text-gray-900 dark:text-gray-100">{detailSuggestion.item}</strong>
            {canonicalOf(detailSuggestion) && (
              <span className="text-[10px] text-gray-400 italic">listed as “{canonicalOf(detailSuggestion)}”</span>
            )}
          </div>
          {detailSuggestion.reason && <p className="text-gray-600 dark:text-gray-400">{detailSuggestion.reason}</p>}
          {detailSuggestion.quantity && (
            <p className="text-gray-500">Suggested: {detailSuggestion.quantity} {detailSuggestion.unit}</p>
          )}
          {detailSuggestion.category && (
            <p className="text-gray-500">Category: {detailSuggestion.category}</p>
          )}
          {trainingLine(detailSuggestion) && (
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <Brain className="w-3 h-3" /> {trainingLine(detailSuggestion)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartSuggestions;
