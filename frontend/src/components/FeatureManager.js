import React, { useState, useEffect } from 'react';
import { Settings, ToggleLeft, ToggleRight, Save, RefreshCw, Crown, Users } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../hooks/useToast';

const FeatureManager = () => {
  const [features, setFeatures] = useState([]);
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [featuresRes, limitsRes] = await Promise.all([
        axios.get('/api/features/admin/all'),
        axios.get('/api/features/admin/limits'),
      ]);
      setFeatures(featuresRes.data.features);
      setLimits(limitsRes.data.limits);
    } catch (err) {
      console.error('Error fetching data:', err);
      error('Failed to load feature settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureId) => {
    try {
      const response = await axios.post(`/api/features/admin/toggle/${featureId}`);
      setFeatures(features.map(f => 
        f.id === featureId ? response.data.feature : f
      ));
      success('Feature toggled successfully');
    } catch (err) {
      console.error('Error toggling feature:', err);
      error('Failed to toggle feature');
    }
  };

  const updateFeature = async (featureId, updates) => {
    setSaving(true);
    try {
      const response = await axios.put(`/api/features/admin/feature/${featureId}`, updates);
      setFeatures(features.map(f => 
        f.id === featureId ? response.data.feature : f
      ));
      success('Feature updated successfully');
    } catch (err) {
      console.error('Error updating feature:', err);
      error('Failed to update feature');
    } finally {
      setSaving(false);
    }
  };

  const updateLimit = async (limitId, updates) => {
    setSaving(true);
    try {
      const response = await axios.put(`/api/features/admin/limit/${limitId}`, updates);
      setLimits(limits.map(l => 
        l.id === limitId ? response.data.limit : l
      ));
      success('Limit updated successfully');
    } catch (err) {
      console.error('Error updating limit:', err);
      error('Failed to update limit');
    } finally {
      setSaving(false);
    }
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {});

  const freeLimits = limits.filter(l => l.tier_name === 'free');
  const premiumLimits = limits.filter(l => l.tier_name === 'premium');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex items-center mb-2">
          <Settings className="w-8 h-8 mr-3" />
          <h2 className="text-3xl font-bold">Feature Management</h2>
        </div>
        <p className="text-primary-100">
          Control which features are available to free and premium users
        </p>
      </div>

      {/* Tier Limits */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Free Tier Limits */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <Users className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Free Tier Limits</h3>
          </div>
          <div className="space-y-4">
            {freeLimits.map(limit => (
              <div key={limit.id} className="border-b border-gray-200 dark:border-gray-700 pb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {limit.description || limit.limit_key}
                </label>
                <input
                  type="number"
                  value={limit.limit_value}
                  onChange={(e) => updateLimit(limit.id, { 
                    limit_value: parseInt(e.target.value),
                    description: limit.description 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={saving}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Premium Tier Limits */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl shadow-lg p-6 border-2 border-yellow-400">
          <div className="flex items-center mb-4">
            <Crown className="w-6 h-6 text-yellow-600 mr-2" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Premium Tier Limits</h3>
          </div>
          <div className="space-y-4">
            {premiumLimits.map(limit => (
              <div key={limit.id} className="border-b border-yellow-200 dark:border-yellow-800 pb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {limit.description || limit.limit_key}
                </label>
                <input
                  type="number"
                  value={limit.limit_value}
                  onChange={(e) => updateLimit(limit.id, { 
                    limit_value: parseInt(e.target.value),
                    description: limit.description 
                  })}
                  className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={saving}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features by Category */}
      {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
        <div key={category} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 capitalize">
            {category} Features
          </h3>
          <div className="space-y-3">
            {categoryFeatures.map(feature => (
              <div
                key={feature.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  feature.is_enabled
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center flex-1">
                    <span className="text-2xl mr-3">{feature.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white">
                        {feature.feature_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFeature(feature.id)}
                    className={`ml-4 p-2 rounded-lg transition-colors ${
                      feature.is_enabled
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-400 hover:bg-gray-500 text-white'
                    }`}
                    title={feature.is_enabled ? 'Disable feature' : 'Enable feature'}
                  >
                    {feature.is_enabled ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                </div>

                {/* Tier Toggles */}
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feature.free_tier_enabled}
                      onChange={(e) => updateFeature(feature.id, {
                        ...feature,
                        free_tier_enabled: e.target.checked,
                      })}
                      className="w-5 h-5 text-blue-600 rounded"
                      disabled={saving}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Free Tier
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feature.premium_tier_enabled}
                      onChange={(e) => updateFeature(feature.id, {
                        ...feature,
                        premium_tier_enabled: e.target.checked,
                      })}
                      className="w-5 h-5 text-yellow-600 rounded"
                      disabled={saving}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Premium Tier
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-secondary flex items-center"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default FeatureManager;
