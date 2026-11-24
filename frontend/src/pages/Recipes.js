import React, { useState, useEffect } from 'react';
import { Plus, ChefHat, Clock, Trash2, ShoppingCart, Star, Edit2, GraduationCap, Layers, Library, List, Search, Check, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { recipesAPI } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import RecipeModal from '../components/RecipeModal';
import RecipeCardSlider from '../components/recipes/RecipeCardSlider';
import RecipeRolodex from '../components/recipes/RecipeRolodex';
import RecipeViewModal from '../components/recipes/RecipeViewModal';
import RecipeIconPicker from '../components/recipes/RecipeIconPicker';
import TeachableRecipe from '../components/recipes/TeachableRecipe';
import QuickRecipeTemplates from '../components/recipes/QuickRecipeTemplates';
import ConfirmModal from '../limbo/modals/ConfirmModal';
import { ScrollStrip } from '../utils/autoPlacement';

const SRC_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'custom', label: 'My recipes' },
  { id: 'taught', label: 'Taught' },
  { id: 'premade', label: 'Premade' },
  { id: 'lab', label: 'HomemadeLab' },
];

const Recipes = () => {
  const { user, logout } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [canMake, setCanMake] = useState({ can_make: [], can_make_with_few_items: [] });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null); // edit modal target
  const [viewingRecipe, setViewingRecipe] = useState(null);   // view sheet target
  const [iconTarget, setIconTarget] = useState(null);         // recipe getting a new icon
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);
  const [showTeach, setShowTeach] = useState(false);
  // Deck view persists across visits — rolodex | slider | list (default: list)
  const [deckView, setDeckViewState] = useState(
    () => localStorage.getItem('recipesDeckView') || 'list'
  );
  const setDeckView = (v) => { setDeckViewState(v); localStorage.setItem('recipesDeckView', v); };
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  // List-view select mode — animated checkboxes bulk-pick recipes, then one
  // confirm deletes them all via /recipes/bulk-delete.
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkTarget, setBulkTarget] = useState(null); // number[] | null
  // Source filter chips — where the recipe came from. Persisted per device.
  const [srcFilter, setSrcFilterState] = useState(
    () => localStorage.getItem('recipesSourceFilter') || 'all'
  );
  const setSrcFilter = (v) => { setSrcFilterState(v); localStorage.setItem('recipesSourceFilter', v); };
  const [notice, setNotice] = useState(null); // {ok, text} — replaces alert() so failures are visible but non-blocking
  // In-flight recipe actions — rows disable their buttons while their own
  // request runs, so a slow API can't produce stacked duplicate calls.
  const [busyIds, setBusyIds] = useState(() => new Set());
  const markBusy = (id, on) => setBusyIds((s) => {
    const n = new Set(s);
    if (on) n.add(id); else n.delete(id);
    return n;
  });

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Last-viewed recipe persists: leaving the page mid-view picks back
  // up in the same modal. Cleared when the modal is closed.
  // Click → view sheet. Pencil → editor. LocalStorage remembers the last
  // VIEWED recipe (not the editor).
  const openRecipe = (r) => {
    setViewingRecipe(r);
    localStorage.setItem('recipesLastRecipeId', String(r.id));
  };
  const closeViewer = () => {
    setViewingRecipe(null);
    localStorage.removeItem('recipesLastRecipeId');
  };
  const editRecipe = (r) => {
    setViewingRecipe(null);
    setSelectedRecipe(r);
  };
  const closeRecipe = () => {
    setSelectedRecipe(null);
  };

  // Quick icon/image change — PATCHes image_url straight from the list.
  const updateRecipeIcon = async (value) => {
    if (!iconTarget) return;
    markBusy(iconTarget.id, true);
    try {
      await api.patch(`/recipes/${iconTarget.id}`, { image_url: value });
      fetchRecipes();
    } catch (error) {
      console.error('Failed to update recipe icon:', error);
      setNotice({ ok: false, text: 'Could not update the icon — server unreachable, try again' });
    } finally {
      markBusy(iconTarget.id, false);
      setIconTarget(null);
    }
  };

  useEffect(() => {
    fetchRecipes();
    checkCanMake();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await recipesAPI.getRecipes();
      setRecipes(response.data);
      // Deliberately do NOT auto-reopen the last-viewed recipe — popping a
      // full sheet on every book visit was annoying. Viewing is opt-in only.
      localStorage.removeItem('recipesLastRecipeId');
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCanMake = async () => {
    try {
      const response = await recipesAPI.checkCanMake();
      setCanMake(response.data);
    } catch (error) {
      console.error('Failed to check recipes:', error);
    }
  };

  const handleAddToShoppingList = async (recipeId) => {
    if (busyIds.has(recipeId)) return;
    markBusy(recipeId, true);
    try {
      await recipesAPI.recipeToShoppingList(recipeId, {});
      setNotice({ ok: true, text: 'Recipe added to shopping list!' });
    } catch (error) {
      console.error('Failed to add to shopping list:', error);
      const timeout = error.code === 'ECONNABORTED';
      setNotice({ ok: false, text: timeout
        ? 'Server took too long — try again'
        : 'Could not add recipe — server unreachable, try again' });
    } finally {
      markBusy(recipeId, false);
    }
  };

  const handleToggleFavorite = async (recipe) => {
    if (busyIds.has(recipe.id)) return;
    markBusy(recipe.id, true);
    try {
      await recipesAPI.updateRecipe(recipe.id, { is_favorite: !recipe.is_favorite });
      fetchRecipes();
    } catch (error) {
      console.error('Failed to update favorite:', error);
      setNotice({ ok: false, text: 'Could not update favorite — server unreachable, try again' });
    } finally {
      markBusy(recipe.id, false);
    }
  };

  /* ---- search + shelves ---- */
  const q = searchQuery.trim().toLowerCase();
  const matchesSearch = (r) =>
    !q || [r.name, r.description, r.category, ...(r.tags || [])]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  /* ---- source classifier — lab builds carry custom-builder/plate-lab tags,
   * taught recipes src:taught, template adds src:premade, imported recipes
   * have a source_url. Everything else is a user-created custom recipe. */
  const recipeSource = (r) => {
    const t = r.tags || [];
    if (t.includes('custom-builder') || t.includes('plate-lab') || t.includes('src:lab')) return 'lab';
    if (t.includes('src:taught')) return 'taught';
    if (t.includes('src:premade') || r.source_url) return 'premade';
    return 'custom';
  };
  const filteredRecipes = recipes.filter(matchesSearch)
    .filter((r) => srcFilter === 'all' || recipeSource(r) === srcFilter);
  const filteredCanMake = canMake.can_make.filter(matchesSearch);
  const filteredFew = canMake.can_make_with_few_items.filter(matchesSearch);

  /* ---- auto shelves ---- */
  const totalMin = (r) => (r.total_time || (r.prep_time || 0) + (r.cook_time || 0));
  const isSmoothie = (r) =>
    /smoothie|shake/i.test(r.category || '') ||
    (r.tags || []).some((t) => /smoothie|shake/i.test(t)) ||
    /smoothie|milkshake/i.test(r.name || '');

  const shelves = [
    { id: 'love', label: 'Recipes We Love', emoji: '💛',
      items: filteredRecipes.filter((r) => r.is_favorite) },
    { id: 'canmake', label: 'Recipes We Can Make', emoji: '✅',
      items: filteredCanMake },
    { id: 'smoothie', label: 'Smoothie Recipes', emoji: '🥤',
      items: filteredRecipes.filter(isSmoothie) },
    { id: 'easy', label: 'Easy Meals', emoji: '⚡',
      items: filteredRecipes.filter((r) => r.difficulty === 'easy' || totalMin(r) <= 30) },
    { id: 'favmeals', label: 'Favorite Meals', emoji: '⭐',
      items: filteredRecipes.filter((r) => (r.rating || 0) >= 4 && !isSmoothie(r)) },
  ];

  const handleDeleteRecipe = (id) => setDeleteTarget(id);

  const toggleSelect = (id) => setSelectedIds((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const exitSelectMode = () => { setSelecting(false); setSelectedIds(new Set()); };

  const toggleSelectAll = () => setSelectedIds((s) =>
    s.size === filteredRecipes.length ? new Set() : new Set(filteredRecipes.map((r) => r.id)));

  const confirmBulkDelete = async () => {
    const ids = bulkTarget || [];
    setBulkTarget(null);
    if (!ids.length) return;
    try {
      const res = await recipesAPI.bulkDeleteRecipes(ids);
      setNotice({ ok: true, text: `${res.data?.deleted ?? ids.length} recipe(s) deleted` });
      exitSelectMode();
      fetchRecipes();
      checkCanMake();
    } catch (error) {
      console.error('Failed to delete recipes:', error);
      const timeout = error.code === 'ECONNABORTED';
      setNotice({ ok: false, text: timeout
        ? 'Delete timed out — server is busy, try again'
        : 'Delete failed — server unreachable, try again' });
    }
  };

  const confirmDeleteRecipe = async () => {
    // Accept either an id or a recipe object — a caller passing the whole
    // object used to produce DELETE /recipes/[object Object] → 500.
    const id = deleteTarget?.id ?? deleteTarget;
    setDeleteTarget(null);
    if (!id) return;
    markBusy(id, true);
    try {
      await recipesAPI.deleteRecipe(id);
      fetchRecipes();
      checkCanMake();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      const status = error.response?.status;
      const timeout = error.code === 'ECONNABORTED';
      setNotice({ ok: false, text: timeout
        ? 'Delete timed out — server is busy, try again'
        : status ? `Delete failed — server error ${status}` : 'Delete failed — server unreachable, try again' });
    } finally {
      markBusy(id, false);
    }
  };

  const handleCreateRecipe = async (recipeData) => {
    try {
      // Stamp a source tag so the filter chips can classify it later —
      // creators that already set one (src:taught / src:premade / lab tags)
      // keep theirs.
      const tags = [...(recipeData.tags || [])];
      if (!tags.some((t) => t.startsWith('src:') || t === 'custom-builder' || t === 'plate-lab')) {
        tags.push('src:custom');
      }
      await recipesAPI.createRecipe({ ...recipeData, tags });
      fetchRecipes();
      checkCanMake();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create recipe:', error);
      setNotice({ ok: false, text: 'Could not create recipe — try again' });
    }
  };

  const handleEditRecipe = async (recipeData) => {
    try {
      await recipesAPI.updateRecipe(selectedRecipe.id, recipeData);
      fetchRecipes();
      checkCanMake();
      closeRecipe();
    } catch (error) {
      console.error('Failed to update recipe:', error);
      setNotice({ ok: false, text: 'Could not update recipe — try again' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading recipes...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        
        <div className="lg:ml-72">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {notice && (
              <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between ${
                notice.ok
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                <span>{notice.text}</span>
                <button onClick={() => setNotice(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <ChefHat className="w-8 h-8 text-primary-600 mr-3" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Recipes</h1>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTeach(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  title="Step-by-step quick recipe entry"
                >
                  <GraduationCap className="w-5 h-5" />
                  Teach
                </button>
                <button
                  onClick={() => setShowQuickTemplates(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <ChefHat className="w-5 h-5" />
                  Quick Add
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Custom Recipe
                </button>
              </div>
            </div>

            {/* Recipe deck — flip-book rolodex or horizontal slider */}
            <div className="mb-12">
              <div className="flex items-center justify-end mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search recipes…"
                      className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-40 sm:w-56 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                      onClick={() => setDeckView('rolodex')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${deckView === 'rolodex' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      title="Flip-book rolodex"
                    >
                      <Library className="w-3.5 h-3.5" /> Rolodex
                    </button>
                    <button
                      onClick={() => setDeckView('slider')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${deckView === 'slider' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      title="Horizontal card slider"
                    >
                      <Layers className="w-3.5 h-3.5" /> Slider
                    </button>
                    <button
                      onClick={() => setDeckView('list')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${deckView === 'list' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      title="Searchable list"
                    >
                      <List className="w-3.5 h-3.5" /> List
                    </button>
                  </div>
                </div>
              </div>
              {/* Source filter chips — persisted pick, filters every deck view */}
              <ScrollStrip className="mb-4" innerClassName="gap-2">
                {SRC_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSrcFilter(f.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      srcFilter === f.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </ScrollStrip>
              {deckView === 'rolodex' ? (
                <RecipeRolodex
                  recipes={filteredRecipes}
                  onAddRecipe={() => setShowCreateModal(true)}
                  onDeleteRecipe={handleDeleteRecipe}
                  onEditRecipe={editRecipe}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToList={handleAddToShoppingList}
                />
              ) : deckView === 'slider' ? (
                <RecipeCardSlider
                  recipes={filteredRecipes}
                  onAddRecipe={() => setShowCreateModal(true)}
                  onDeleteRecipe={handleDeleteRecipe}
                  onToggleFavorite={handleToggleFavorite}
                />
              ) : (
                <RecipeListView
                  recipes={filteredRecipes}
                  busyIds={busyIds}
                  onOpen={openRecipe}
                  onEdit={editRecipe}
                  onPickIcon={setIconTarget}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToList={handleAddToShoppingList}
                  onDelete={handleDeleteRecipe}
                  selecting={selecting}
                  selectedIds={selectedIds}
                  onEnterSelect={() => setSelecting(true)}
                  onExitSelect={exitSelectMode}
                  onToggleSelect={toggleSelect}
                  onToggleAll={toggleSelectAll}
                  onBulkDelete={() => setBulkTarget([...selectedIds])}
                />
              )}
            </div>

            {/* Recipe shelves — auto-categorized collections */}
            {shelves.map((shelf) => shelf.items.length > 0 && (
              <div key={shelf.id} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{shelf.emoji}</span>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{shelf.label}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold">{shelf.items.length}</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {shelf.items.map((recipe) => (
                    <ShelfCard
                      key={recipe.id}
                      recipe={recipe}
                      onOpen={openRecipe}
                      onToggleFavorite={handleToggleFavorite}
                      onAddToList={handleAddToShoppingList}
                      onDelete={handleDeleteRecipe}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Almost There — compact list: name + what you're missing */}
            {filteredFew.length > 0 && (
              <div className="mb-8 p-4 sm:p-5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
                  🛒 Just a few items away
                </h2>
                <div className="divide-y divide-yellow-200/70 dark:divide-yellow-800/40 rounded-lg overflow-hidden bg-white/70 dark:bg-gray-800/60">
                  {filteredFew.map((r) => {
                    const missing = r.missing_ingredients || [];
                    const isEmoji = r.image_url?.startsWith('emoji:');
                    return (
                      <div key={r.id} onClick={() => openRecipe(r)}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-yellow-100/60 dark:hover:bg-yellow-900/20 transition-colors">
                        <span className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-lg bg-white dark:bg-gray-700 overflow-hidden">
                          {r.image_url && !isEmoji
                            ? <img src={r.image_url} alt="" className="w-full h-full object-cover"
                                onError={(e) => e.currentTarget.replaceWith(document.createTextNode('🍽️'))} />
                            : (isEmoji ? r.image_url.slice(6) : '🍽️')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.name}</p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 truncate">
                            Missing: {missing.slice(0, 3).map((m) => m.item_name).join(', ')}
                            {missing.length > 3 && ` +${missing.length - 3}`}
                          </p>
                        </div>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); handleAddToShoppingList(r.id); }}
                          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                          title="Add ingredients to shopping list">
                          <ShoppingCart className="w-3.5 h-3.5" /> List
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modals */}
            <RecipeModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              onSave={handleCreateRecipe}
            />
            
            {/* View sheet — clicking a recipe opens this, not the editor */}
            <RecipeViewModal
              recipe={viewingRecipe}
              onClose={closeViewer}
              onEdit={editRecipe}
              onToggleFavorite={handleToggleFavorite}
              onAddToList={handleAddToShoppingList}
              onDelete={handleDeleteRecipe}
              onChanged={fetchRecipes}
            />

            {/* Quick icon picker opened from the list view */}
            <RecipeIconPicker
              isOpen={!!iconTarget}
              onClose={() => setIconTarget(null)}
              current={iconTarget?.image_url}
              onPick={updateRecipeIcon}
            />

            <RecipeModal
              isOpen={!!selectedRecipe}
              onClose={closeRecipe}
              onSave={handleEditRecipe}
              recipe={selectedRecipe}
            />

            {/* Quick Recipe Templates */}
            {showQuickTemplates && (
              <QuickRecipeTemplates
                onAddRecipe={(d) => handleCreateRecipe({ ...d, tags: [...(d.tags || []), 'src:premade'] })}
                onClose={() => setShowQuickTemplates(false)}
              />
            )}

            {/* Teachable Recipe wizard */}
            <TeachableRecipe
              isOpen={showTeach}
              onClose={() => setShowTeach(false)}
              onSave={handleCreateRecipe}
            />

            <ConfirmModal
              isOpen={deleteTarget !== null}
              title="Delete recipe?"
              message="This recipe and its ingredients will be removed. This can't be undone."
              confirmText="Delete"
              type="danger"
              onConfirm={confirmDeleteRecipe}
              onCancel={() => setDeleteTarget(null)}
            />

            <ConfirmModal
              isOpen={bulkTarget !== null}
              title={`Delete ${bulkTarget?.length || 0} recipes?`}
              message="These recipes and their ingredients will be removed. This can't be undone."
              confirmText="Delete all"
              type="danger"
              onConfirm={confirmBulkDelete}
              onCancel={() => setBulkTarget(null)}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

/** Animated select checkbox — box fills primary, the check springs in. */
const SelectCheck = ({ checked, partial }) => (
  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${
    checked || partial
      ? 'bg-primary-500 border-primary-500'
      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'
  }`}>
    <motion.span
      initial={false}
      animate={{ scale: checked || partial ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 600, damping: 22 }}
    >
      {partial && !checked
        ? <Minus className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />
        : <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />}
    </motion.span>
  </span>
);

/** Searchable list view — click = view sheet; pencil = edit; icon = icon picker.
 *  Select mode swaps clicks for animated checkboxes and a bulk-delete bar. */
const RecipeListView = ({ recipes, busyIds, onOpen, onEdit, onPickIcon, onToggleFavorite, onAddToList, onDelete,
                          selecting, selectedIds, onEnterSelect, onExitSelect, onToggleSelect, onToggleAll, onBulkDelete }) => {
  const count = selectedIds?.size || 0;
  const allChecked = recipes.length > 0 && count === recipes.length;
  const someChecked = count > 0 && !allChecked;
  return (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
    {/* Toolbar — Select toggle, or the selection controls while selecting */}
    <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
      {selecting ? (
        <>
          <button type="button" onClick={onToggleAll}
            className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <SelectCheck checked={allChecked} partial={someChecked} />
            {allChecked ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">{count} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onBulkDelete} disabled={count === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete{count > 0 ? ` ${count}` : ''}
            </button>
            <button type="button" onClick={onExitSelect}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="text-xs text-gray-400 dark:text-gray-500">{recipes.length} recipes</span>
          <button type="button" onClick={onEnterSelect}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <Check className="w-3.5 h-3.5" /> Select
          </button>
        </>
      )}
    </div>
    <div
      className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[560px] overflow-y-auto scrollbar-3d"
      style={{ perspective: '800px' }}
    >
      {recipes.length === 0 && (
        <p className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No recipes match.</p>
      )}
      {recipes.map((r) => {
        const mins = r.total_time || (r.prep_time || 0) + (r.cook_time || 0);
        const isEmoji = r.image_url?.startsWith('emoji:');
        const busy = busyIds?.has(r.id);
        // Shared control styling — real button affordances, ≥32px targets.
        const ctl = `p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed`;
        const checked = selectedIds?.has(r.id);
        return (
          <div key={r.id} onClick={() => (selecting ? onToggleSelect(r.id) : onOpen(r))}
            className={`flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors ${
              busy ? 'opacity-70' : ''} ${checked ? 'bg-primary-50/70 dark:bg-primary-900/20' : ''}`}>
            {selecting && <SelectCheck checked={checked} />}
            {selecting ? (
              <span className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-xl overflow-hidden">
                {r.image_url && !isEmoji
                  ? <img src={r.image_url} alt="" className="w-full h-full object-cover rounded-lg"
                      onError={(e) => e.currentTarget.replaceWith(document.createTextNode('🍽️'))} />
                  : (isEmoji ? r.image_url.slice(6) : '🍽️')}
              </span>
            ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPickIcon(r); }}
              title="Change icon / image"
              className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-600 hover:ring-2 ring-primary-400 transition-shadow overflow-hidden"
            >
              {r.image_url && !isEmoji
                ? <img src={r.image_url} alt="" className="w-full h-full object-cover rounded-lg"
                    onError={(e) => e.currentTarget.replaceWith(document.createTextNode('🍽️'))} />
                  : (isEmoji ? r.image_url.slice(6) : '🍽️')}
            </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {[r.category, r.difficulty, mins > 0 && `${mins} min`, r.servings && `${r.servings} servings`]
                  .filter(Boolean).join(' · ')}
              </p>
            </div>
            {r.avg_rating > 0 && (
              <span className="text-[10px] text-amber-500 flex-shrink-0">★ {r.avg_rating}</span>
            )}
            {!selecting && (
            <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <button type="button" disabled={busy} onClick={() => onToggleFavorite(r)} className={ctl} title="Toggle favorite">
                <Star className={`w-4 h-4 ${r.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`} />
              </button>
              <button type="button" disabled={busy} onClick={() => onEdit(r)} className={`${ctl} text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30`} title="Edit recipe">
                <Edit2 className="w-4 h-4" />
              </button>
              <button type="button" disabled={busy} onClick={() => onAddToList(r.id)} className={`${ctl} text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30`} title="Add ingredients to shopping list">
                <ShoppingCart className="w-4 h-4" />
              </button>
              <button type="button" disabled={busy} onClick={() => onDelete(r.id)} className={`${ctl} text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30`} title="Delete recipe">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
  );
};

/** Recipe image with dead-URL fallback — broken remote images show the
 *  emoji/glyph placeholder instead of a broken <img>. */
const RecipeImg = ({ recipe, className, emojiClass }) => {
  const [broken, setBroken] = useState(false);
  const isEmoji = recipe.image_url?.startsWith('emoji:');
  if (!recipe.image_url || isEmoji || broken) {
    return (
      <div className={`${className} bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center`}>
        <span className={emojiClass}>{isEmoji ? recipe.image_url.slice(6) : '🍽️'}</span>
      </div>
    );
  }
  return <img src={recipe.image_url} alt={recipe.name} className={className} onError={() => setBroken(true)} />;
};

/** Compact shelf card — click opens the recipe editor, ⭐ toggles favorite, 🛒 adds to list. */
const ShelfCard = ({ recipe, onOpen, onToggleFavorite, onAddToList, onDelete }) => {
  const mins = (recipe.total_time || (recipe.prep_time || 0) + (recipe.cook_time || 0));
  return (
    <div
      onClick={() => onOpen(recipe)}
      className="flex-shrink-0 w-44 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer overflow-hidden"
    >
      <RecipeImg recipe={recipe} className="w-full h-20 object-cover" emojiClass="text-3xl" />
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">{recipe.name}</h4>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe); }}
            className="flex-shrink-0"
          >
            <Star className={`w-3.5 h-3.5 ${recipe.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          {mins > 0 && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />{mins}m
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onAddToList(recipe.id); }}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-0.5 hover:bg-primary-100 dark:hover:bg-primary-900/50"
            >
              <ShoppingCart className="w-3 h-3" /> List
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete recipe"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recipes;
