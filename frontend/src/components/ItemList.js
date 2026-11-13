import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, Edit2, Smile, Sparkles, MapPin, Copy, FileText, Eye, MoreVertical, Tag, Minus, Plus, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import CustomEditPanel from './CustomEditPanel';
import CustomContextMenu from './CustomContextMenu';
import FavoritePicker from './FavoritePicker';
import { getFavorites } from '../api/mdl';
import { Portal } from '../utils/autoPlacement';
// import ItemTooltip from './ItemTooltip'; // Component doesn't exist
// import SmartSuggestionTooltip from './SmartSuggestionTooltip'; // Component doesn't exist
import { detectIcon, detectCategory, canonicalizeCategory, getCategoryIcon, getCategoryOrder } from '../utils/categoryDetector';
import { getAisleForCategory, sortItemsByStoreAisle } from '../data/storeLayouts';
import { formatQuantityPlain } from '../utils/formatQuantity';
import { playSound } from '../utils/soundEffects';
import { EditableContainer } from './editor/EditorOverlay';
import { useEditor } from '../contexts/EditorContext';
import ItemIcon from './ItemIcon';

const ItemList = (props) => {
  const { items, onToggleCheck, onDelete, onEdit, onCopyMove, triggerAnimation, nextItemId, hideCategories = false, storeName = null, onLookForThis } = props;
  const { isEditorActive, selectWidget, selectedWidget, widgetProperties } = useEditor();
  const aveProps = widgetProperties['item-list'] || {};
  
  return (
    <EditableContainer
      isEditorActive={isEditorActive}
      componentName="Shopping List Items"
      onSelect={() => selectWidget('item-list', 'dashboard')}
      isSelected={selectedWidget?.id === 'item-list'}
    >
      <ItemListContent 
        {...props}
        {...aveProps}
      />
    </EditableContainer>
  );
};

const ItemListContent = (props) => {
  const { 
    items, 
    onToggleCheck, 
    onDelete, 
    onEdit, 
    onCopyMove, 
    triggerAnimation, 
    nextItemId, 
    hideCategories = false, 
    storeName = null, 
    onLookForThis,
    onQuantityChange,
    // AVE Properties
    showCheckboxes = true,
    showPrices = true,
    showQuantities = true,
    showCategories = true,
    showIcons = true,
    showAisles = true,
    strikethroughCompleted = true,
    hideCompleted = false,
    sortBy = 'manual',
    compactView = false,
    itemSpacing = 8,
    fontSize = 'medium'
  } = props;
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [noteItem, setNoteItem] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [editAnchor, setEditAnchor] = useState(null);

  // Opens the edit panel near the clicked button — the focused element's
  // rect doubles as the click anchor; falls back to centered when absent.
  const openEditPanel = (target) => {
    const el = document.activeElement;
    const r = el && el !== document.body ? el.getBoundingClientRect() : null;
    setEditAnchor(r ? { cx: r.left + r.width / 2, top: r.top, bottom: r.bottom } : null);
    setEditingItem(target);
    setShowEditModal(true);
  };

  // Cross-store price comparison — one batched fetch for all unchecked items
  const [priceCompare, setPriceCompare] = useState({});

  // Household favorites — one batched fetch, indexed by item name (lowercase)
  const [itemFavorites, setItemFavorites] = useState({});
  const [favItem, setFavItem] = useState(null); // item for "whose favorite?" modal
  useEffect(() => {
    let cancelled = false;
    getFavorites('item').then((favs) => {
      if (cancelled || !favs?.length) { setItemFavorites({}); return; }
      const idx = {};
      for (const f of favs) {
        const k = (f.entity_name || '').toLowerCase();
        idx[k] = idx[k] || [];
        idx[k].push(f);
      }
      setItemFavorites(idx);
    });
    return () => { cancelled = true; };
  }, [favItem]); // re-fetch after the favorite picker closes
  const itemsKey = items.map(i => `${i.item_name}:${i.is_checked}`).join('|');
  useEffect(() => {
    const names = [...new Set(
      items.filter(i => !i.is_checked).map(i => (i.item_name || '').toLowerCase().trim()).filter(Boolean)
    )].slice(0, 50);
    if (!names.length) { setPriceCompare({}); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    let cancelled = false;
    fetch('/api/stores/prices/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items: names })
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data) setPriceCompare(data.prices || {}); })
      .catch(() => {}); // price compare is best-effort
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);
  // Named labels under action buttons — user can hide them, choice persists
  const [showButtonLabels, setShowButtonLabels] = useState(
    () => localStorage.getItem('itemListButtonLabels') !== 'false'
  );
  const toggleButtonLabels = () => {
    setShowButtonLabels(prev => {
      localStorage.setItem('itemListButtonLabels', String(!prev));
      return !prev;
    });
  };
  // Group items by name to combine duplicates
  const combinedItems = items.reduce((acc, item) => {
    const key = item.item_name.toLowerCase();
    if (!acc[key]) {
      acc[key] = {
        ...item,
        count: 1,
        totalQuantity: item.quantity,
        totalPrice: (item.price || 0) * item.quantity,
        ids: [item.id]
      };
    } else {
      acc[key].count += 1;
      acc[key].totalQuantity += item.quantity;
      acc[key].totalPrice += (item.price || 0) * item.quantity;
      acc[key].ids.push(item.id);
    }
    return acc;
  }, {});

  // Group by category — canonicalize so legacy free-text categories
  // ('Meat', 'Pantry', ...) land in their canonical group with the right icon
  const groupedItems = Object.values(combinedItems).reduce((acc, item) => {
    const category = canonicalizeCategory(item.category_name || item.category);
    if (!acc[category]) {
      acc[category] = {
        items: [],
        icon: item.category_icon || getCategoryIcon(category),
        order: item.category_order || getCategoryOrder(category)
      };
    }
    acc[category].items.push(item);
    return acc;
  }, {});

  // Sort categories by shopping order (pantry first, frozen last)
  const categories = Object.keys(groupedItems).sort((a, b) => {
    return groupedItems[a].order - groupedItems[b].order;
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg">Your shopping list is empty</p>
        <p className="text-sm mt-2">Add items above or use smart suggestions</p>
      </div>
    );
  }

  // Filter out completed items if hideCompleted is true
  const filteredCombinedItems = hideCompleted
    ? Object.fromEntries(Object.entries(combinedItems).filter(([_, item]) => !item.is_checked))
    : combinedItems;

  // Flatten items if hiding categories
  const displayItems = (hideCategories || !showCategories) 
    ? Object.values(filteredCombinedItems)
    : null;

  // Font size classes
  const fontSizeClass = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  }[fontSize] || 'text-base';

  return (
    <>
    <div className={`space-y-${Math.floor(itemSpacing / 4)} shopping-list-scroll custom-scrollbar max-h-[calc(100vh-400px)] pr-2 ${fontSizeClass}`}>
      {/* Button-label toggle — lets users learn or hide the action captions */}
      <div className="flex justify-end">
        <button
          onClick={toggleButtonLabels}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {showButtonLabels ? 'Hide button labels' : 'Show button labels'}
        </button>
      </div>
      {(hideCategories || !showCategories) ? (
        // Flat list without categories
        <div className="space-y-2">
          {displayItems.map((item) => (
            <ItemCard 
              key={item.id} 
              item={item} 
              onToggleCheck={onToggleCheck}
              onDelete={onDelete}
              onCopyMove={onCopyMove}
              triggerAnimation={triggerAnimation}
              isNextItem={item.id === nextItemId}
              onOpenEdit={openEditPanel}
              setEditingItem={setEditingItem}
              setShowEditModal={setShowEditModal}
              setNoteItem={setNoteItem}
              setNoteText={setNoteText}
              onLookForThis={onLookForThis}
              onEdit={onEdit}
              onQuantityChange={onQuantityChange}
              priceCompare={priceCompare}
              showButtonLabels={showButtonLabels}
              showCheckboxes={showCheckboxes}
              showPrices={showPrices}
              showQuantities={showQuantities}
              showIcons={showIcons}
              showAisles={showAisles}
              strikethroughCompleted={strikethroughCompleted}
              compactView={compactView}
              favorites={itemFavorites[(item.item_name || '').toLowerCase()]}
              onOpenFavorites={() => setFavItem(item)}
            />
          ))}
        </div>
      ) : (
        // Grouped by categories
        categories.map((category) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3 flex items-center">
              <span className="text-2xl mr-2">{groupedItems[category].icon}</span>
              {category}
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 normal-case">
                ({groupedItems[category].items.length} items)
              </span>
            </h4>
            <div className="space-y-2">
              {groupedItems[category].items
                .filter(item => !hideCompleted || !item.is_checked)
                .map((item) => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onToggleCheck={onToggleCheck}
                  onDelete={onDelete}
                  onCopyMove={onCopyMove}
                  triggerAnimation={triggerAnimation}
                  isNextItem={item.id === nextItemId}
                  onOpenEdit={openEditPanel}
                  setEditingItem={setEditingItem}
                  setShowEditModal={setShowEditModal}
                  storeName={storeName}
                  setNoteItem={setNoteItem}
                  setNoteText={setNoteText}
                  onEdit={onEdit}
                  onLookForThis={onLookForThis}
                  onQuantityChange={onQuantityChange}
                  priceCompare={priceCompare}
                  showButtonLabels={showButtonLabels}
                  showCheckboxes={showCheckboxes}
                  showPrices={showPrices}
                  showQuantities={showQuantities}
                  showIcons={showIcons}
                  showAisles={showAisles}
                  strikethroughCompleted={strikethroughCompleted}
                  compactView={compactView}
                  favorites={itemFavorites[(item.item_name || '').toLowerCase()]}
                  onOpenFavorites={() => setFavItem(item)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>

    {/* Edit Item Modal */}
    <CustomEditPanel
      item={editingItem}
      anchor={editAnchor}
      isOpen={showEditModal}
      onClose={() => {
        setShowEditModal(false);
        setEditingItem(null);
      }}
      onSave={(updatedItem) => {
        if (onEdit) {
          // Update all instances of this item
          updatedItem.ids.forEach(id => {
            onEdit({ ...updatedItem, id });
          });
        }
        setShowEditModal(false);
        setEditingItem(null);
      }}
    />

    {/* Note Modal */}
    {noteItem && (
      <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Note: {noteItem.item_name}
          </h3>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            rows="4"
            placeholder="e.g., Get organic, Check expiration date, etc."
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                if (onEdit) {
                  noteItem.ids.forEach(id => {
                    onEdit({ ...noteItem, id, notes: noteText });
                  });
                }
                setNoteItem(null);
                setNoteText('');
              }}
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Save Note
            </button>
            <button
              onClick={() => {
                setNoteItem(null);
                setNoteText('');
              }}
              className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      </Portal>
    )}

    {/* Whose favorite? — household member marks for this item */}
    {favItem && (
      <FavoritePicker
        entityName={favItem.item_name}
        onClose={() => setFavItem(null)}
      />
    )}
    </>
  );
};

// Separate ItemCard component for reusability
// Action button with an optional named label under the icon
const ActionButton = ({ onClick, className, title, label, icon: Icon, showLabel }) => (
  <button onClick={onClick} className={`${className} flex flex-col items-center`} title={title}>
    <Icon className="w-5 h-5" />
    {showLabel && (
      <span className="text-[10px] leading-none mt-0.5 font-medium">{label}</span>
    )}
  </button>
);

// Inline cross-store price badge — shows the cheapest known price for an item,
// highlights when it's a sale or beats the price recorded on the list item.
const StorePriceBadge = ({ itemName, currentPrice, priceCompare }) => {
  const rows = priceCompare?.[(itemName || '').toLowerCase()];
  if (!rows?.length) return null;

  const best = rows.reduce((a, b) => {
    const pa = a.sale_price ?? a.price;
    const pb = b.sale_price ?? b.price;
    return pa <= pb ? a : b;
  });
  const bestPrice = best.sale_price ?? best.price;
  if (bestPrice == null) return null;

  const cur = parseFloat(currentPrice);
  const hasCurrent = Number.isFinite(cur) && cur > 0;
  // Only surface the badge when it says something useful: a sale, or cheaper elsewhere
  if (hasCurrent && bestPrice >= cur && !best.on_sale) return null;
  const save = hasCurrent && bestPrice < cur ? cur - bestPrice : null;

  const tip = rows
    .map(r => `${r.store_name}: $${(r.sale_price ?? r.price).toFixed(2)}${r.on_sale ? ' (sale)' : ''}`)
    .join('\n');

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
      title={tip}
    >
      <Tag className="w-3 h-3" />
      ${bestPrice.toFixed(2)} @ {best.store_name}
      {best.on_sale && ' · sale'}
      {save != null && ` −$${save.toFixed(2)}`}
    </span>
  );
};

const ItemCard = ({ item, onToggleCheck, onDelete, onCopyMove, triggerAnimation, isNextItem, setEditingItem, setShowEditModal, storeName, setNoteItem, setNoteText, onLookForThis, onEdit, onQuantityChange, priceCompare, showButtonLabels, favorites, onOpenFavorites, onOpenEdit }) => {
  const [editingAisle, setEditingAisle] = useState(false);
  const [aisleNumber, setAisleNumber] = useState('');
  const [aisleName, setAisleName] = useState('');
  const [checkAnimKey, setCheckAnimKey] = useState(0);
  const [inventoryCheck, setInventoryCheck] = useState(null);
  const [smartSuggestion, setSmartSuggestion] = useState(null);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const itemRef = useRef(null);
  const iconRef = useRef(null);

  // DB returns quantity as "1.00" — must be a number for +/- to work
  const itemQty = parseFloat(item.totalQuantity) || 1;
  const singleItem = { ...item, id: item.ids ? item.ids[0] : item.id };
  const adjustQuantity = (delta) => {
    if (onQuantityChange) {
      onQuantityChange(singleItem, delta);
    } else if (onEdit) {
      onEdit({ ...singleItem, quantity: Math.max(1, itemQty + delta) });
    }
  };
  
  // Get aisle information if store is specified
  const category = canonicalizeCategory(item.category_name || item.category);
  const aisle = storeName ? getAisleForCategory(storeName, category) : null;
  
  // Check if item exists in inventory and get smart suggestions
  useEffect(() => {
    const checkInventoryAndSuggestions = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token, skipping inventory check');
        return;
      }

      try {
        // Check inventory
        const inventoryResponse = await fetch('/api/inventory/check-inventory', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({ itemName: item.item_name })
        });
        
        if (inventoryResponse.ok) {
          const data = await inventoryResponse.json();
          if (data.hasItem) {
            setInventoryCheck(data);
          }
        } else if (inventoryResponse.status === 401) {
          console.warn('Auth token expired, skipping inventory check');
          return;
        }

        // Get smart reorder suggestion
        const suggestionResponse = await fetch(`/api/inventory/smart-suggestion/${encodeURIComponent(item.item_name)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
        
        if (suggestionResponse.ok) {
          const data = await suggestionResponse.json();
          if (data.hasSuggestion && data.purchaseCount >= 2) {
            setSmartSuggestion(data);
          }
        }
      } catch (error) {
        // Silently fail to prevent console spam
        if (error.message !== 'Failed to fetch') {
          console.error('Error checking inventory:', error);
        }
      }
    };
    
    if (!item.is_checked) {
      checkInventoryAndSuggestions();
    }
  }, [item.item_name, item.is_checked]);
  
  const saveAisle = async () => {
    if (!aisleNumber.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const aisleNum = parseInt(aisleNumber);
      
      // Report to MDL system for learning
      const storeId = encodeURIComponent(storeName || 'unknown');
      await fetch('/api/mdl/aisle/report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemName: item.item_name,
          aisleNumber: aisleNum,
          storeId: storeId,
          wasCorrect: null, // User is manually setting, no prediction to compare
          categoryId: item.category
        })
      });
      
      // Update the item's aisle field in the database
      const response = await fetch(`/api/shopping/lists/${item.shopping_list_id}/items/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aisle_number: aisleNum
        })
      });
      
      if (response.ok) {
        // Update local state
        item.aisle = aisleNum;
        setEditingAisle(false);
        playSound('success');
        console.log(`✅ Aisle ${aisleNum} saved for ${item.item_name}`);
      } else {
        console.error('Failed to update item aisle');
      }
    } catch (err) {
      console.error('Error saving aisle:', err);
    }
  };
  
  const handleSuggestionAction = async (action) => {
    switch (action) {
      case 'remove':
        // Remove item from shopping list
        await onDelete(item);
        break;
      case 'keep':
        // Keep item, hide suggestion
        setShowSuggestion(false);
        break;
      default:
        break;
    }
  };
  
  const handleCheck = () => {
    // Trigger animation from the icon's position when checking
    if (!item.is_checked && triggerAnimation && iconRef.current) {
      triggerAnimation(item, iconRef.current);
      playSound('pop'); // Play pop sound when item flies to cart
    }
    // Trigger checkbox animation
    setCheckAnimKey(prev => prev + 1);
    onToggleCheck(item);
  };

  // Right-click / long-press context menu actions
  const contextMenuItems = [
    { icon: Check, label: item.is_checked ? 'Uncheck item' : 'Check off', onClick: handleCheck },
    { icon: Edit2, label: 'Edit', onClick: () => onOpenEdit(item) },
    { icon: FileText, label: 'Add note', onClick: () => { setNoteItem(item); setNoteText(item.notes || ''); } },
    ...(onLookForThis && !item.is_checked
      ? [{ icon: Eye, label: 'Look for this', onClick: () => onLookForThis(item) }]
      : []),
    ...(onCopyMove
      ? [{ icon: Copy, label: 'Copy / move to list', onClick: () => onCopyMove(item) }]
      : []),
    ...(onOpenFavorites
      ? [{ icon: Heart, label: 'Whose favorite?', color: 'text-pink-500', onClick: () => onOpenFavorites(item) }]
      : []),
    { separator: true },
    { icon: Trash2, label: 'Delete', color: 'text-red-500', onClick: () => { (item.ids || [item.id]).forEach(id => onDelete(id)); } },
  ];

  return (
    <div className="space-y-2">
      {/* Already Have It Tooltip - DISABLED (component doesn't exist) */}
      {/* {inventoryCheck && showSuggestion && !item.is_checked && (
        <SmartSuggestionTooltip
          type="already-have"
          item={{ name: item.item_name }}
          inventoryData={{
            location: inventoryCheck.location,
            quantity: inventoryCheck.quantity,
            unit: inventoryCheck.unit,
            expiresIn: inventoryCheck.expiresIn
          }}
          onAction={handleSuggestionAction}
          onDismiss={() => setShowSuggestion(false)}
        />
      )} */}

      {/* Smart Reorder Suggestion Tooltip - DISABLED (component doesn't exist) */}
      {/* {!inventoryCheck && smartSuggestion && showSuggestion && !item.is_checked && (
        <SmartSuggestionTooltip
          type="smart-reorder"
          item={{ name: item.item_name }}
          inventoryData={{
            avgDays: smartSuggestion.avgDays,
            suggestedAmount: smartSuggestion.suggestedAmount,
            unit: smartSuggestion.unit
          }}
          onAction={(action, amount) => {
            if (action === 'add-suggested') {
              // Update item quantity
              console.log(`Suggested adding ${amount} ${smartSuggestion.unit}`);
            }
            setShowSuggestion(false);
          }}
          onDismiss={() => setShowSuggestion(false)}
        />
      )} */}
      
      {/* Item Card — wrapped in CustomContextMenu for right-click / long-press */}
      <CustomContextMenu items={contextMenuItems} trigger="both">
              <div
                ref={itemRef}
                id={`item-${item.ids ? item.ids[0] : item.id}`}
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  item.is_checked
                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : isNextItem
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-500 shadow-lg shadow-green-200 dark:shadow-green-900/50'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-500'
                }`}
              >
                <div className="flex items-center flex-1">
                  <motion.button
                    key={checkAnimKey}
                    data-item-checkbox={item.id}
                    onClick={handleCheck}
                    whileTap={{ scale: 0.85 }}
                    animate={item.is_checked ? { 
                      scale: [1, 1.3, 0.95, 1.05, 1],
                      rotate: [0, -10, 10, -5, 0]
                    } : { scale: 1 }}
                    transition={{ 
                      duration: 0.5,
                      ease: "easeOut"
                    }}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center mr-3 transition-colors ${
                      item.is_checked
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-gray-300 dark:border-gray-500 hover:border-primary-500 dark:hover:border-primary-400'
                    }`}
                  >
                    {item.is_checked && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 500,
                          damping: 15
                        }}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                  
                  {/* Icon */}
                  <div ref={iconRef} className="text-2xl mr-2 relative">
                    <ItemIcon icon={item.item_icon} fallback={detectIcon(item.item_name)} />
                    {!item.item_icon && (
                      <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500 animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p
                      className={`font-medium flex items-center flex-wrap gap-2 ${
                        item.is_checked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <span>{item.item_name}</span>
                      {favorites?.length > 0 && (
                        <span className="inline-flex items-center -space-x-1" title={
                          favorites.map(f => `${f.member_name || 'Household'}: ${f.preference}`).join('\n')
                        }>
                          {favorites.slice(0, 3).map((f) => (
                            <span key={f.id} className="text-sm">
                              {f.avatar_emoji || '👤'}{f.preference === 'favorite' ? '❤️' : f.preference === 'hated' ? '🚫' : ''}
                            </span>
                          ))}
                        </span>
                      )}
                      {item.count > 1 && (
                        <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-bold rounded-full">
                          x{formatQuantityPlain(item.count)}
                        </span>
                      )}
                      {/* Pantry Status Badge */}
                      {inventoryCheck && !item.is_checked && (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${
                          inventoryCheck.isExpired
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : inventoryCheck.isExpiringSoon
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                          {inventoryCheck.isExpired ? '🔴 Expired' : inventoryCheck.isExpiringSoon ? '🟠 Expiring Soon' : '🟢 In Stock'}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(onQuantityChange || onEdit) && item.count === 1 ? (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <button
                            onClick={() => adjustQuantity(-1)}
                            className="w-8 h-8 sm:w-5 sm:h-5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-primary-200 dark:hover:bg-primary-800 text-gray-700 dark:text-gray-200 text-base sm:text-xs font-bold flex items-center justify-center"
                            title="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="min-w-[1.5rem] text-center">{formatQuantityPlain(itemQty)}</span>
                          <button
                            onClick={() => adjustQuantity(1)}
                            className="w-8 h-8 sm:w-5 sm:h-5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-primary-200 dark:hover:bg-primary-800 text-gray-700 dark:text-gray-200 text-base sm:text-xs font-bold flex items-center justify-center"
                            title="Increase quantity"
                          >
                            +
                          </button>
                          {item.unit && <span>{item.unit}</span>}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatQuantityPlain(itemQty)} {item.unit}
                        </span>
                      )}
                      {item.totalPrice > 0 && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-bold">
                          ${item.totalPrice.toFixed(2)}
                        </span>
                      )}
                      <StorePriceBadge
                        itemName={item.item_name}
                        currentPrice={item.price}
                        priceCompare={priceCompare}
                      />
                      {editingAisle ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={aisleNumber}
                            onChange={(e) => setAisleNumber(e.target.value)}
                            placeholder="Aisle #"
                            className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            autoFocus
                          />
                          <button
                            onClick={saveAisle}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingAisle(false)}
                            className="px-2 py-1 bg-gray-400 dark:bg-gray-600 text-white text-xs rounded hover:bg-gray-500 dark:hover:bg-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                      ) : aisle ? (
                        <span 
                          onClick={() => {
                            setAisleNumber(aisle.number.toString());
                            setAisleName(aisle.name || '');
                            setEditingAisle(true);
                          }}
                          className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/40"
                          title="Click to edit aisle"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          Aisle {aisle.number}
                        </span>
                      ) : storeName && (
                        <button
                          onClick={() => setEditingAisle(true)}
                          className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          + Add Aisle
                        </button>
                      )}
                    </div>
                    {/* Show aisle name if available */}
                    {aisle && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {aisle.name}
                      </p>
                    )}
                    {/* Show notes if present */}
                    {item.notes && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400 dark:border-yellow-600 rounded">
                        <p className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                          <Smile className="w-4 h-4 mr-1.5 mt-0.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                          <span className="italic">{item.notes}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Desktop: full action row */}
                <div className="hidden sm:flex items-start space-x-2">
                  <ActionButton
                    onClick={() => {
                      onOpenEdit(item);
                      /* anchored near the clicked button via focused element */
                    }}
                    className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                    title="Edit item"
                    label="Edit"
                    icon={Edit2}
                    showLabel={showButtonLabels}
                  />
                  <ActionButton
                    onClick={() => {
                      setNoteItem(item);
                      setNoteText(item.notes || '');
                    }}
                    className={`transition-colors ${
                      item.notes 
                        ? 'text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300' 
                        : 'text-gray-400 hover:text-teal-600 dark:hover:text-teal-400'
                    }`}
                    title={item.notes ? `Note: ${item.notes}` : 'Add note'}
                    label="Note"
                    icon={FileText}
                    showLabel={showButtonLabels}
                  />
                  {onLookForThis && !item.is_checked && (
                    <ActionButton
                      onClick={() => onLookForThis(item)}
                      className="text-purple-500 hover:text-purple-700 dark:hover:text-purple-400 transition-colors"
                      title="Look for this item"
                      label="Find"
                      icon={Eye}
                      showLabel={showButtonLabels}
                    />
                  )}
                  {onCopyMove && (
                    <ActionButton
                      onClick={() => onCopyMove(item)}
                      className="text-green-500 hover:text-green-700 dark:hover:text-green-400 transition-colors"
                      title="Copy/Move to another list"
                      label="Move"
                      icon={Copy}
                      showLabel={showButtonLabels}
                    />
                  )}
                  <ActionButton
                    onClick={() => {
                      // Delete all instances of this item
                      item.ids.forEach(id => onDelete(id));
                    }}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                    title="Delete item"
                    label="Delete"
                    icon={Trash2}
                    showLabel={showButtonLabels}
                  />
                </div>

                {/* Mobile: compact overflow menu — full-width rows w/ big touch targets */}
                <div className="sm:hidden relative flex-shrink-0">
                  <button
                    onClick={() => setShowMobileMenu(v => !v)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Item actions"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMobileMenu && (
                    <Portal><>
                      <div className="fixed inset-0 z-30" onClick={() => setShowMobileMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 z-40 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-1">
                        {item.count === 1 && (onQuantityChange || onEdit) && (
                          <div className="flex items-center justify-between px-3 py-1.5">
                            <button
                              onClick={() => adjustQuantity(-1)}
                              className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200"
                              title="Decrease quantity"
                            >
                              <Minus className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {formatQuantityPlain(itemQty)} {item.unit}
                            </span>
                            <button
                              onClick={() => adjustQuantity(1)}
                              className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200"
                              title="Increase quantity"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => { setShowMobileMenu(false); onOpenEdit(item); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Edit2 className="w-5 h-5 text-blue-500" /> Edit
                        </button>
                        <button
                          onClick={() => { setShowMobileMenu(false); setNoteItem(item); setNoteText(item.notes || ''); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <FileText className="w-5 h-5 text-teal-500" /> Note
                        </button>
                        {onLookForThis && !item.is_checked && (
                          <button
                            onClick={() => { setShowMobileMenu(false); onLookForThis(item); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Eye className="w-5 h-5 text-purple-500" /> Find
                          </button>
                        )}
                        {onCopyMove && (
                          <button
                            onClick={() => { setShowMobileMenu(false); onCopyMove(item); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Copy className="w-5 h-5 text-green-500" /> Move
                          </button>
                        )}
                        <button
                          onClick={() => { setShowMobileMenu(false); item.ids.forEach(id => onDelete(id)); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-5 h-5" /> Delete
                        </button>
                      </div>
                    </></Portal>
                  )}
                </div>
              </div>
      </CustomContextMenu>
    </div>
  );
};

export default ItemList;
