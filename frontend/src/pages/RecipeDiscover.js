import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shoppingAPI, pantryAPI } from '../services/api';
import { ArrowLeft, Search } from 'lucide-react';
import RecipeDiscovery from '../components/RecipeDiscovery';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';

const RecipeDiscover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPantryItems();
  }, []);

  const loadPantryItems = async () => {
    try {
      const response = await pantryAPI.getItems();
      setPantryItems(response.data);
    } catch (error) {
      console.error('Error loading pantry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToShoppingList = async (ingredients) => {
    try {
      // Get active shopping list
      const listsResponse = await shoppingAPI.getLists();
      const activeLists = listsResponse.data.filter(l => l.status === 'active');
      
      let activeList;
      if (activeLists.length === 0) {
        const newListResponse = await shoppingAPI.createList({ 
          name: 'Recipe Ingredients' 
        });
        activeList = newListResponse.data;
      } else {
        activeList = activeLists[0];
      }

      // Add all ingredients
      for (const ingredient of ingredients) {
        await shoppingAPI.addItem(activeList.id, {
          itemName: ingredient.name,
          quantity: ingredient.quantity || 1,
          unit: ingredient.unit || '',
          category: ingredient.category || 'Pantry',
        });
      }

      alert(`Added ${ingredients.length} ingredients to your shopping list!`);
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      alert('Failed to add ingredients to shopping list');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center space-x-3">
                  <Search className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Recipe Discovery
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Find recipes and add missing ingredients
                    </p>
                  </div>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-xl text-gray-600 dark:text-gray-400">
                Loading pantry...
              </div>
            </div>
          ) : (
            <RecipeDiscovery
              pantryItems={pantryItems}
              onAddToShoppingList={handleAddToShoppingList}
            />
          )}
        </main>
      </div>
    </PageTransition>
  );
};

export default RecipeDiscover;
