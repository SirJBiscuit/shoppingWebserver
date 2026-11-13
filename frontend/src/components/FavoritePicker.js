import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Heart, ThumbsUp, ThumbsDown } from 'lucide-react';
import {
  getFavorites, setFavorite, removeFavorite, getHouseholdMembers
} from '../api/mdl';
import { Portal } from '../utils/autoPlacement';

const ENTITY_TYPES = [
  { id: 'item',       label: 'Item',       icon: '📦' },
  { id: 'brand',      label: 'Brand',      icon: '🏷️' },
  { id: 'ingredient', label: 'Ingredient', icon: '🧂' },
  { id: 'meal',       label: 'Meal',       icon: '🍽️' },
  { id: 'restaurant', label: 'Restaurant', icon: '🏪' },
];

/**
 * FavoritePicker — "whose favorite?" modal for any entity.
 *
 * Props:
 *   entityName  — the thing being marked (item/brand/meal/restaurant name)
 *   entityType  — initial entity type (default 'item')
 *   productId   — optional MDL product id to link
 *   onClose(changed:boolean)
 */
const FavoritePicker = ({ entityName, entityType: initialType = 'item', productId = null, onClose }) => {
  const [members, setMembers] = useState([]);
  const [marks, setMarks] = useState([]);
  const [entityType, setEntityType] = useState(initialType);
  const changedRef = useRef(false);

  const load = useCallback(async () => {
    const [ms, fs] = await Promise.all([
      getHouseholdMembers(),
      getFavorites('', entityName),
    ]);
    setMembers(ms || []);
    setMarks(fs || []);
  }, [entityName]);

  useEffect(() => { load(); }, [load]);

  const close = () => onClose(changedRef.current);

  const mark = async (member, preference) => {
    await setFavorite({
      member_id: member.id,
      entity_type: entityType,
      entity_name: entityName,
      product_id: productId,
      preference,
    });
    changedRef.current = true;
    load();
  };

  const unmark = async (favId) => {
    await removeFavorite(favId);
    changedRef.current = true;
    load();
  };

  const memberMark = (memberId) =>
    marks.find(m => m.member_id === memberId && m.entity_type === entityType);

  return (
    <Portal>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4" onClick={close}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" /> Whose favorite?
          </h3>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Mark who loves or hates <span className="font-semibold text-gray-900 dark:text-white">{entityName}</span>
        </p>

        {/* Entity type — items, brands, ingredients, meals, restaurants */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {ENTITY_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setEntityType(t.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                entityType === t.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No household members yet — add them on the Household page first.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {members.map((m) => {
              const cur = memberMark(m.id);
              return (
                <div key={m.id} className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2">
                  <span className="text-xl" style={{ color: m.color }}>{m.avatar_emoji || '👤'}</span>
                  <span className="flex-1 font-medium text-gray-900 dark:text-white text-sm">{m.name}</span>
                  {cur && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                      {cur.preference === 'favorite' ? '❤️ favorite' : cur.preference === 'hated' ? '🚫 hated' : '👍 likes'}
                    </span>
                  )}
                  <button
                    onClick={() => mark(m, 'favorite')}
                    className={`p-1.5 rounded-lg ${cur?.preference === 'favorite' ? 'bg-pink-100 dark:bg-pink-900/40' : 'hover:bg-pink-50 dark:hover:bg-pink-900/20'}`}
                    title="Favorite"
                  >
                    <Heart className={`w-4 h-4 ${cur?.preference === 'favorite' ? 'text-pink-600 fill-pink-500' : 'text-pink-400'}`} />
                  </button>
                  <button
                    onClick={() => mark(m, 'like')}
                    className={`p-1.5 rounded-lg ${cur?.preference === 'like' ? 'bg-green-100 dark:bg-green-900/40' : 'hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                    title="Likes it"
                  >
                    <ThumbsUp className={`w-4 h-4 ${cur?.preference === 'like' ? 'text-green-600' : 'text-green-400'}`} />
                  </button>
                  <button
                    onClick={() => mark(m, 'hated')}
                    className={`p-1.5 rounded-lg ${cur?.preference === 'hated' ? 'bg-red-100 dark:bg-red-900/40' : 'hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                    title="Hates it"
                  >
                    <ThumbsDown className={`w-4 h-4 ${cur?.preference === 'hated' ? 'text-red-600' : 'text-red-400'}`} />
                  </button>
                  {cur && (
                    <button onClick={() => unmark(cur.id)} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700" title="Clear mark">
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </Portal>
  );
};

export default FavoritePicker;
