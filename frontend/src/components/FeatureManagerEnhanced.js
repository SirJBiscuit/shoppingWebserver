import React, { useState, useEffect } from 'react';
import { Flag, Settings, Users, Crown, Lock, Unlock, Edit2, Save, X, Plus, Trash2, LayoutDashboard } from 'lucide-react';
import api from '../services/api';

const FeatureManagerEnhanced = () => {
  const [activeTab, setActiveTab] = useState('features');
  const [features, setFeatures] = useState([]);
  const [limits, setLimits] = useState({ guest: [], free: [], premium: [] });
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFeature, setEditingFeature] = useState(null);
  const [editingLimit, setEditingLimit] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch features
      const featuresRes = await api.get('/features/admin/all');
      setFeatures(featuresRes.data.features || []);

      // Fetch limits for all tiers
      const limitsRes = await api.get('/features/admin/limits/all');
      if (limitsRes.data.limits) {
        const groupedLimits = {
          guest: limitsRes.data.limits.filter(l => l.tier_name === 'guest'),
          free: limitsRes.data.limits.filter(l => l.tier_name === 'free'),
          premium: limitsRes.data.limits.filter(l => l.tier_name === 'premium')
        };
        setLimits(groupedLimits);
      }

      // Fetch widgets
      const widgetsRes = await api.get('/features/admin/widgets');
      setWidgets(widgetsRes.data.widgets || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const updateFeature = async (featureId, updates) => {
    try {
      await api.put(`/features/admin/feature/${featureId}`, updates);
      alert('Feature updated successfully!');
      fetchData();
      setEditingFeature(null);
    } catch (error) {
      console.error('Error updating feature:', error);
      alert('Failed to update feature');
    }
  };

  const updateLimit = async (limitId, updates) => {
    try {
      await api.put(`/features/admin/limit/${limitId}`, updates);
      alert('Limit updated successfully!');
      fetchData();
      setEditingLimit(null);
    } catch (error) {
      console.error('Error updating limit:', error);
      alert('Failed to update limit');
    }
  };

  const tabs = [
    { id: 'features', name: 'Features', icon: Flag },
    { id: 'limits', name: 'Tier Limits', icon: Crown },
    { id: 'widgets', name: 'Dashboard Widgets', icon: LayoutDashboard },
    { id: 'global', name: 'Global Settings', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Feature Flags
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Control which features are available to each tier
            </p>
          </div>

          <div className="space-y-2">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {feature.feature_name}
                      </h4>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                        feature.is_enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {feature.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {feature.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {feature.description}
                    </p>
                    <div className="mt-2 flex items-center space-x-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Min Tier: <strong>{feature.min_tier}</strong>
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Key: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{feature.feature_key}</code>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateFeature(feature.id, { is_enabled: !feature.is_enabled })}
                      className={`p-2 rounded-lg ${
                        feature.is_enabled
                          ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                      title={feature.is_enabled ? 'Disable' : 'Enable'}
                    >
                      {feature.is_enabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>

                    <select
                      value={feature.min_tier}
                      onChange={(e) => updateFeature(feature.id, { min_tier: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="guest">Guest</option>
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier Limits Tab */}
      {activeTab === 'limits' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Tier Limits
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure limits for each subscription tier
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Guest Tier */}
            <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-gray-500" />
                Guest Tier
              </h4>
              <div className="space-y-3">
                {limits.guest.map((limit) => (
                  <div key={limit.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {limit.limit_key.replace(/_/g, ' ')}
                    </span>
                    <input
                      type="number"
                      value={limit.limit_value}
                      onChange={(e) => updateLimit(limit.id, { limit_value: parseInt(e.target.value) })}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Free Tier */}
            <div className="bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-600 rounded-lg p-4">
              <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Flag className="w-5 h-5 mr-2 text-blue-500" />
                Free Tier
              </h4>
              <div className="space-y-3">
                {limits.free.map((limit) => (
                  <div key={limit.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {limit.limit_key.replace(/_/g, ' ')}
                    </span>
                    <input
                      type="number"
                      value={limit.limit_value}
                      onChange={(e) => updateLimit(limit.id, { limit_value: parseInt(e.target.value) })}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Tier */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
              <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Crown className="w-5 h-5 mr-2 text-yellow-600" />
                Premium Tier
              </h4>
              <div className="space-y-3">
                {limits.premium.map((limit) => (
                  <div key={limit.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {limit.limit_key.replace(/_/g, ' ')}
                    </span>
                    <input
                      type="number"
                      value={limit.limit_value}
                      onChange={(e) => updateLimit(limit.id, { limit_value: parseInt(e.target.value) })}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder="-1 = ∞"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                -1 = Unlimited
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Widgets Tab */}
      {activeTab === 'widgets' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Dashboard Widgets
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage available dashboard widgets and their requirements
            </p>
          </div>

          <div className="space-y-2">
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {widget.widget_name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {widget.description}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 inline-block">
                    Position: {widget.default_position} | Min Tier: {widget.min_tier}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={widget.default_enabled}
                      onChange={(e) => {
                        // Update widget enabled status
                        api.put(`/features/admin/widget/${widget.id}`, {
                          default_enabled: e.target.checked
                        }).then(() => fetchData());
                      }}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Settings Tab */}
      {activeTab === 'global' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Global Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure app-wide settings and defaults
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                Default Theme
              </h4>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                Animations
              </h4>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable animations for free/premium users
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Guest users never have animations (for performance)
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                Guest Account Cleanup
              </h4>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Auto-delete guest accounts after 7 days
                  </span>
                </label>
                <button className="btn-secondary text-sm">
                  Clean Up Guest Accounts Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureManagerEnhanced;
