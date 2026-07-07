import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { recipesAPI, shoppingAPI } from '../services/api';
import { Calendar, ArrowLeft, ShoppingCart } from 'lucide-react';
import MealPlanner from '../components/MealPlanner';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';

const MealPlan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const response = await recipesAPI.getRecipes();
      setRecipes(response.data);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateList = async (ingredients) => {
    try {
      // Get active shopping list
      const listsResponse = await shoppingAPI.getLists();
      const activeLists = listsResponse.data.filter(l => l.status === 'active');
      
      let activeList;
      if (activeLists.length === 0) {
        // Create new list
        const newListResponse = await shoppingAPI.createList({ 
          name: 'Meal Plan Shopping List' 
        });
        activeList = newListResponse.data;
      } else {
        activeList = activeLists[0];
      }

      // Add all ingredients to the list
      for (const ingredient of ingredients) {
        await shoppingAPI.addItem(activeList.id, {
          itemName: ingredient.name,
          quantity: ingredient.quantity || 1,
          unit: ingredient.unit || '',
          category: ingredient.category || 'Pantry',
        });
      }

      alert(`Added ${ingredients.length} items to your shopping list!`);
      navigate('/');
    } catch (error) {
      console.error('Error generating shopping list:', error);
      alert('Failed to generate shopping list');
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
                  <Calendar className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Meal Planner
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Plan your weekly meals
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/recipes')}
                  className="btn-secondary flex items-center"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Manage Recipes
                </button>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-xl text-gray-600 dark:text-gray-400">
                Loading recipes...
              </div>
            </div>
          ) : recipes.length === 0 ? (
            <div className="card text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Recipes Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add some recipes first to start planning your meals
              </p>
              <button
                onClick={() => navigate('/recipes')}
                className="btn-primary"
              >
                Go to Recipes
              </button>
            </div>
          ) : (
            <MealPlanner 
              recipes={recipes}
              onGenerateList={handleGenerateList}
            />
          )}
        </main>
      </div>
    </PageTransition>
  );
};

export default MealPlan;
