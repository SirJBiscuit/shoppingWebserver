import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, DollarSign, Plus, Trash2, Check, ShoppingBag, ChefHat } from 'lucide-react';

const TripPlanner = ({ userId }) => {
  const [trips, setTrips] = useState([]);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [newTrip, setNewTrip] = useState({
    date: '',
    time: '',
    store: '',
    budget: '',
    recipes: [],
    lists: [],
    notes: ''
  });

  const [availableRecipes, setAvailableRecipes] = useState([]);
  const [availableLists, setAvailableLists] = useState([]);

  useEffect(() => {
    loadTrips();
    loadRecipes();
    loadLists();
  }, [userId]);

  const loadTrips = () => {
    // Mock data - replace with API call
    const mockTrips = [
      {
        id: 1,
        date: '2026-07-12',
        time: '10:00',
        store: 'Whole Foods',
        budget: 150,
        recipes: ['Spaghetti Carbonara', 'Caesar Salad'],
        lists: ['Weekly Groceries'],
        items: 24,
        estimatedCost: 142.50,
        status: 'planned'
      },
      {
        id: 2,
        date: '2026-07-15',
        time: '14:00',
        store: 'Trader Joe\'s',
        budget: 80,
        recipes: ['Chicken Stir Fry'],
        lists: ['Dinner Party'],
        items: 12,
        estimatedCost: 75.20,
        status: 'planned'
      }
    ];
    setTrips(mockTrips);
  };

  const loadRecipes = () => {
    // Mock recipes
    setAvailableRecipes([
      { id: 1, name: 'Spaghetti Carbonara', items: 8 },
      { id: 2, name: 'Caesar Salad', items: 6 },
      { id: 3, name: 'Chicken Stir Fry', items: 10 },
      { id: 4, name: 'Beef Tacos', items: 12 },
      { id: 5, name: 'Vegetable Curry', items: 15 }
    ]);
  };

  const loadLists = () => {
    // Mock lists
    setAvailableLists([
      { id: 1, name: 'Weekly Groceries', items: 24 },
      { id: 2, name: 'Dinner Party', items: 12 },
      { id: 3, name: 'Pantry Restock', items: 18 }
    ]);
  };

  const createTrip = () => {
    const trip = {
      id: trips.length + 1,
      ...newTrip,
      items: calculateTotalItems(newTrip),
      estimatedCost: calculateEstimatedCost(newTrip),
      status: 'planned'
    };

    setTrips([...trips, trip]);
    setShowNewTrip(false);
    resetNewTrip();
  };

  const resetNewTrip = () => {
    setNewTrip({
      date: '',
      time: '',
      store: '',
      budget: '',
      recipes: [],
      lists: [],
      notes: ''
    });
  };

  const calculateTotalItems = (trip) => {
    let total = 0;
    trip.recipes.forEach(recipeName => {
      const recipe = availableRecipes.find(r => r.name === recipeName);
      if (recipe) total += recipe.items;
    });
    trip.lists.forEach(listName => {
      const list = availableLists.find(l => l.name === listName);
      if (list) total += list.items;
    });
    return total;
  };

  const calculateEstimatedCost = (trip) => {
    // Mock calculation - $5-8 per item average
    const items = calculateTotalItems(trip);
    return items * (Math.random() * 3 + 5);
  };

  const deleteTrip = (tripId) => {
    setTrips(trips.filter(t => t.id !== tripId));
  };

  const startTrip = (tripId) => {
    // Navigate to smart shopping mode with this trip
    console.log('Starting trip:', tripId);
  };

  const toggleRecipe = (recipeName) => {
    if (newTrip.recipes.includes(recipeName)) {
      setNewTrip({
        ...newTrip,
        recipes: newTrip.recipes.filter(r => r !== recipeName)
      });
    } else {
      setNewTrip({
        ...newTrip,
        recipes: [...newTrip.recipes, recipeName]
      });
    }
  };

  const toggleList = (listName) => {
    if (newTrip.lists.includes(listName)) {
      setNewTrip({
        ...newTrip,
        lists: newTrip.lists.filter(l => l !== listName)
      });
    } else {
      setNewTrip({
        ...newTrip,
        lists: [...newTrip.lists, listName]
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-primary-600" />
            Shopping Trip Planner
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Plan your shopping trips with recipes and budgets
          </p>
        </div>
        
        <button
          onClick={() => setShowNewTrip(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5 mr-2" />
          Plan New Trip
        </button>
      </div>

      {/* New Trip Form */}
      {showNewTrip && (
        <div className="card bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Plan New Shopping Trip
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={newTrip.date}
                onChange={(e) => setNewTrip({ ...newTrip, date: e.target.value })}
                className="input w-full"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time
              </label>
              <input
                type="time"
                value={newTrip.time}
                onChange={(e) => setNewTrip({ ...newTrip, time: e.target.value })}
                className="input w-full"
              />
            </div>

            {/* Store */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Store
              </label>
              <select
                value={newTrip.store}
                onChange={(e) => setNewTrip({ ...newTrip, store: e.target.value })}
                className="input w-full"
              >
                <option value="">Select store...</option>
                <option value="Whole Foods">Whole Foods</option>
                <option value="Trader Joe's">Trader Joe's</option>
                <option value="Walmart">Walmart</option>
                <option value="Target">Target</option>
                <option value="Kroger">Kroger</option>
                <option value="Safeway">Safeway</option>
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budget
              </label>
              <input
                type="number"
                value={newTrip.budget}
                onChange={(e) => setNewTrip({ ...newTrip, budget: e.target.value })}
                className="input w-full"
                placeholder="150.00"
                step="0.01"
              />
            </div>
          </div>

          {/* Recipes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Include Recipes
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => toggleRecipe(recipe.name)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    newTrip.recipes.includes(recipe.name)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ChefHat className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {recipe.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {recipe.items} items
                      </span>
                      {newTrip.recipes.includes(recipe.name) && (
                        <Check className="w-4 h-4 text-primary-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lists */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Include Shopping Lists
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableLists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => toggleList(list.name)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    newTrip.lists.includes(list.name)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShoppingBag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {list.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {list.items} items
                      </span>
                      {newTrip.lists.includes(list.name) && (
                        <Check className="w-4 h-4 text-primary-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={newTrip.notes}
              onChange={(e) => setNewTrip({ ...newTrip, notes: e.target.value })}
              className="input w-full"
              rows="3"
              placeholder="Any special notes for this trip..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => {
                setShowNewTrip(false);
                resetNewTrip();
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={createTrip}
              className="btn-primary"
              disabled={!newTrip.date || !newTrip.store || !newTrip.budget}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Trip
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Trips */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Upcoming Trips ({trips.length})
        </h3>

        {trips.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No trips planned yet
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Plan your first shopping trip to get started
            </p>
            <button
              onClick={() => setShowNewTrip(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Plan Your First Trip
            </button>
          </div>
        ) : (
          trips.map((trip) => (
            <div
              key={trip.id}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                      <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {trip.store}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(trip.date)} at {trip.time}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteTrip(trip.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Trip Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-gray-600 dark:text-gray-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {trip.items}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Items</p>
                </div>

                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(trip.estimatedCost)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Estimated</p>
                </div>

                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(trip.budget)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Budget</p>
                </div>
              </div>

              {/* Budget Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Budget Usage
                  </span>
                  <span className={`text-sm font-bold ${
                    trip.estimatedCost > trip.budget
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {Math.round((trip.estimatedCost / trip.budget) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      trip.estimatedCost > trip.budget
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : 'bg-gradient-to-r from-green-500 to-green-600'
                    }`}
                    style={{ width: `${Math.min((trip.estimatedCost / trip.budget) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Included Items */}
              <div className="space-y-2 mb-4">
                {trip.recipes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Recipes:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {trip.recipes.map((recipe, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                        >
                          <ChefHat className="w-3 h-3 inline mr-1" />
                          {recipe}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {trip.lists.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Lists:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {trip.lists.map((list, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                        >
                          <ShoppingBag className="w-3 h-3 inline mr-1" />
                          {list}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <button
                onClick={() => startTrip(trip.id)}
                className="w-full btn-primary"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Start Shopping Trip
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TripPlanner;
