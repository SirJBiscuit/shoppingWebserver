import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, Lock, Sparkles, Award } from 'lucide-react';

function IconCollectionGallery() {
  const [collection, setCollection] = useState([]);
  const [available, setAvailable] = useState([]);
  const [stats, setStats] = useState(null);
  const [userLevel, setUserLevel] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [activeTab, setActiveTab] = useState('unlocked');
  const [filters, setFilters] = useState({
    rarity: 'all',
    category: 'all',
    search: ''
  });

  useEffect(() => {
    fetchCollection();
    fetchAvailable();
  }, [filters]);

  const fetchCollection = async () => {
    try {
      const response = await fetch('/api/cosmetics/icons/my-collection', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setCollection(data.icons);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching collection:', error);
    }
  };

  const fetchAvailable = async () => {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/cosmetics/icons/available?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAvailable(data.icons);
      setUserLevel(data.userLevel);
      setIsPremium(data.isPremium);
    } catch (error) {
      console.error('Error fetching available icons:', error);
    }
  };

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'border-gray-400 bg-gray-50',
      uncommon: 'border-green-500 bg-green-50',
      rare: 'border-blue-500 bg-blue-50',
      epic: 'border-purple-500 bg-purple-50',
      legendary: 'border-yellow-500 bg-yellow-50',
      mythical: 'border-pink-500 bg-pink-50'
    };
    return colors[rarity] || colors.common;
  };

  const getRarityBadgeColor = (rarity) => {
    const colors = {
      common: 'bg-gray-500 text-white',
      uncommon: 'bg-green-500 text-white',
      rare: 'bg-blue-500 text-white',
      epic: 'bg-purple-500 text-white',
      legendary: 'bg-yellow-500 text-white',
      mythical: 'bg-pink-500 text-white'
    };
    return colors[rarity] || colors.common;
  };

  const filteredCollection = collection.filter(icon => {
    if (filters.rarity !== 'all' && icon.rarity !== filters.rarity) return false;
    if (filters.category !== 'all' && icon.category !== filters.category) return false;
    if (filters.search && !icon.item_name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const filteredAvailable = available.filter(icon => {
    if (filters.rarity !== 'all' && icon.rarity !== filters.rarity) return false;
    if (filters.category !== 'all' && icon.category !== filters.category) return false;
    if (filters.search && !icon.item_name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const displayIcons = activeTab === 'unlocked' ? filteredCollection : filteredAvailable;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Icon Collection</h1>
        <p className="text-gray-600">
          Level {userLevel} • {stats?.total || 0} icons unlocked
          {isPremium && <span className="ml-2 text-yellow-600 font-semibold">⭐ Premium</span>}
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-7 gap-3 mb-6">
          <StatCard title="Total" value={stats.total} color="blue" />
          <StatCard title="Common" value={stats.common} color="gray" />
          <StatCard title="Uncommon" value={stats.uncommon} color="green" />
          <StatCard title="Rare" value={stats.rare} color="blue" />
          <StatCard title="Epic" value={stats.epic} color="purple" />
          <StatCard title="Legendary" value={stats.legendary} color="yellow" />
          <StatCard title="Mythical" value={stats.mythical} color="pink" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('unlocked')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'unlocked'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Award size={20} />
            Unlocked ({filteredCollection.length})
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('available')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'available'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lock size={20} />
            Available ({filteredAvailable.filter(i => !i.unlocked).length})
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              <Filter size={16} className="inline mr-1" />
              Rarity
            </label>
            <select
              value={filters.rarity}
              onChange={(e) => setFilters({...filters, rarity: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
              <option value="mythical">Mythical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Filter size={16} className="inline mr-1" />
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="all">All Categories</option>
              <option value="Fruits">Fruits</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Dairy">Dairy</option>
              <option value="Meat">Meat</option>
              <option value="Bakery">Bakery</option>
              <option value="Household">Household</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Search size={16} className="inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Search icons..."
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Icon Grid */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {displayIcons.length > 0 ? (
          <div className="grid grid-cols-6 gap-4">
            {displayIcons.map(icon => (
              <IconCard
                key={icon.id}
                icon={icon}
                unlocked={activeTab === 'unlocked' || icon.unlocked}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Lock className="mx-auto mb-3 text-gray-400" size={48} />
            <p className="text-lg font-medium mb-2">No icons found</p>
            <p className="text-sm">
              {activeTab === 'unlocked' 
                ? 'Start earning XP to unlock icons!'
                : 'Level up to see more icons!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function IconCard({ icon, unlocked }) {
  const getRarityColor = (rarity) => {
    const colors = {
      common: 'border-gray-400 bg-gray-50',
      uncommon: 'border-green-500 bg-green-50',
      rare: 'border-blue-500 bg-blue-50',
      epic: 'border-purple-500 bg-purple-50',
      legendary: 'border-yellow-500 bg-yellow-50',
      mythical: 'border-pink-500 bg-pink-50'
    };
    return colors[rarity] || colors.common;
  };

  const getRarityBadgeColor = (rarity) => {
    const colors = {
      common: 'bg-gray-500',
      uncommon: 'bg-green-500',
      rare: 'bg-blue-500',
      epic: 'bg-purple-500',
      legendary: 'bg-yellow-500',
      mythical: 'bg-pink-500'
    };
    return colors[rarity] || colors.common;
  };

  return (
    <div className={`relative border-2 rounded-lg p-4 transition-all hover:shadow-lg ${
      unlocked 
        ? `${getRarityColor(icon.rarity)} hover:scale-105 cursor-pointer`
        : 'border-gray-300 bg-gray-100 opacity-50'
    }`}>
      {/* Lock Overlay */}
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
          <Lock className="text-gray-600" size={32} />
        </div>
      )}

      {/* Animated/Premium Badge */}
      {unlocked && icon.animated && (
        <div className="absolute top-2 right-2">
          <Sparkles className="text-purple-500 animate-pulse" size={16} />
        </div>
      )}

      {/* Favorite Star */}
      {unlocked && icon.is_favorite && (
        <div className="absolute top-2 left-2">
          <Star className="text-yellow-500" size={16} fill="currentColor" />
        </div>
      )}

      {/* Icon Image */}
      <div className={`bg-white rounded-lg p-3 mb-3 ${!unlocked && 'grayscale'}`}>
        <img
          src={icon.file_path}
          alt={icon.item_name}
          className="w-16 h-16 mx-auto object-contain"
        />
      </div>

      {/* Icon Info */}
      <div className="text-center">
        <div className="font-bold text-sm mb-1 truncate" title={icon.item_name}>
          {icon.item_name}
        </div>
        
        <div className={`text-xs font-semibold text-white px-2 py-1 rounded ${getRarityBadgeColor(icon.rarity)}`}>
          {icon.rarity.toUpperCase()}
        </div>

        {icon.variant && (
          <div className="text-xs text-gray-500 mt-1 truncate" title={icon.variant}>
            {icon.variant}
          </div>
        )}

        {unlocked && icon.unlocked_at && (
          <div className="text-xs text-gray-400 mt-2">
            {new Date(icon.unlocked_at).toLocaleDateString()}
          </div>
        )}

        {!unlocked && icon.min_level && (
          <div className="text-xs text-gray-500 mt-2">
            Unlock at Level {icon.min_level}
          </div>
        )}
      </div>

      {/* Quality Tier Indicator */}
      {unlocked && icon.quality_tier && (
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          T{icon.quality_tier}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    gray: 'bg-gray-50 text-gray-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    pink: 'bg-pink-50 text-pink-600'
  };

  return (
    <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
      <div className="text-xs font-medium opacity-80 mb-1">{title}</div>
      <div className="text-2xl font-bold">{value || 0}</div>
    </div>
  );
}

export default IconCollectionGallery;
