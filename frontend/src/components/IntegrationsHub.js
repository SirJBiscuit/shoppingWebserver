import React, { useState } from 'react';
import { Plug, Calendar, Smartphone, Zap, Check, ExternalLink, Crown, Settings } from 'lucide-react';

const IntegrationsHub = ({ isPremium }) => {
  const [connectedIntegrations, setConnectedIntegrations] = useState([]);

  const integrations = [
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      icon: '📅',
      description: 'Sync meal plans and shopping trips to your calendar',
      category: 'Calendar',
      premium: false,
      status: 'available',
      features: [
        'Auto-add shopping trips to calendar',
        'Meal plan reminders',
        'Recipe cooking time blocks',
        'Shopping list notifications'
      ]
    },
    {
      id: 'apple-calendar',
      name: 'Apple Calendar',
      icon: '🍎',
      description: 'Integrate with Apple Calendar and Reminders',
      category: 'Calendar',
      premium: false,
      status: 'available',
      features: [
        'iCloud calendar sync',
        'Siri shortcuts support',
        'Apple Watch notifications',
        'Reminders integration'
      ]
    },
    {
      id: 'alexa',
      name: 'Amazon Alexa',
      icon: '🔊',
      description: 'Voice control with Alexa',
      category: 'Voice Assistant',
      premium: true,
      status: 'coming-soon',
      features: [
        '"Alexa, add milk to my shopping list"',
        'Read shopping list aloud',
        'Check pantry inventory',
        'Recipe suggestions'
      ]
    },
    {
      id: 'google-assistant',
      name: 'Google Assistant',
      icon: '🎙️',
      description: 'Control Listly with Google Assistant',
      category: 'Voice Assistant',
      premium: true,
      status: 'coming-soon',
      features: [
        'Voice commands',
        'Shopping list management',
        'Recipe search',
        'Store navigation'
      ]
    },
    {
      id: 'ifttt',
      name: 'IFTTT',
      icon: '⚡',
      description: 'Automate with IFTTT applets',
      category: 'Automation',
      premium: true,
      status: 'coming-soon',
      features: [
        'Custom automation recipes',
        'Connect to 600+ services',
        'Smart home integration',
        'Location-based triggers'
      ]
    },
    {
      id: 'zapier',
      name: 'Zapier',
      icon: '⚙️',
      description: 'Connect Listly to 5000+ apps',
      category: 'Automation',
      premium: true,
      status: 'coming-soon',
      features: [
        'Multi-step workflows',
        'Business app integration',
        'Data sync',
        'Custom triggers'
      ]
    },
    {
      id: 'apple-health',
      name: 'Apple Health',
      icon: '❤️',
      description: 'Sync nutrition data to Apple Health',
      category: 'Health',
      premium: true,
      status: 'coming-soon',
      features: [
        'Nutrition tracking',
        'Calorie logging',
        'Macro tracking',
        'Health insights'
      ]
    },
    {
      id: 'myfitnesspal',
      name: 'MyFitnessPal',
      icon: '💪',
      description: 'Import recipes and track nutrition',
      category: 'Health',
      premium: true,
      status: 'coming-soon',
      features: [
        'Recipe import',
        'Calorie tracking',
        'Meal logging',
        'Nutrition goals'
      ]
    },
    {
      id: 'instacart',
      name: 'Instacart',
      icon: '🛒',
      description: 'Order groceries directly from your list',
      category: 'Shopping',
      premium: false,
      status: 'coming-soon',
      features: [
        'One-click ordering',
        'Price comparison',
        'Delivery scheduling',
        'Order tracking'
      ]
    },
    {
      id: 'amazon-fresh',
      name: 'Amazon Fresh',
      icon: '📦',
      description: 'Order from Amazon Fresh',
      category: 'Shopping',
      premium: false,
      status: 'coming-soon',
      features: [
        'Prime delivery',
        'Subscribe & Save',
        'Price matching',
        'Whole Foods integration'
      ]
    }
  ];

  const categories = [...new Set(integrations.map(i => i.category))];

  const toggleIntegration = (integrationId) => {
    if (connectedIntegrations.includes(integrationId)) {
      setConnectedIntegrations(connectedIntegrations.filter(id => id !== integrationId));
    } else {
      setConnectedIntegrations([...connectedIntegrations, integrationId]);
    }
  };

  const isConnected = (integrationId) => {
    return connectedIntegrations.includes(integrationId);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
            Available
          </span>
        );
      case 'coming-soon':
        return (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
            Coming Q3 2026
          </span>
        );
      case 'beta':
        return (
          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-full">
            Beta
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Plug className="w-6 h-6 mr-2 text-primary-600" />
          Integrations
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Connect Listly with your favorite apps and services
        </p>
      </div>

      {/* Connected Count */}
      <div className="card bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Connected Integrations
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {connectedIntegrations.length}
            </p>
          </div>
          <div className="text-5xl">🔗</div>
        </div>
      </div>

      {/* Categories */}
      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            {category === 'Calendar' && <Calendar className="w-5 h-5 mr-2 text-primary-600" />}
            {category === 'Voice Assistant' && <Smartphone className="w-5 h-5 mr-2 text-primary-600" />}
            {category === 'Automation' && <Zap className="w-5 h-5 mr-2 text-primary-600" />}
            {category === 'Health' && <span className="mr-2">❤️</span>}
            {category === 'Shopping' && <span className="mr-2">🛒</span>}
            {category}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations
              .filter(i => i.category === category)
              .map((integration) => {
                const connected = isConnected(integration.id);
                const canConnect = integration.status === 'available' && (!integration.premium || isPremium);

                return (
                  <div
                    key={integration.id}
                    className={`card transition-all ${
                      connected
                        ? 'ring-2 ring-green-500 border-green-500'
                        : 'hover:shadow-lg'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-4xl">{integration.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            {integration.name}
                            {integration.premium && (
                              <Crown className="w-4 h-4 ml-2 text-yellow-600 dark:text-yellow-400" />
                            )}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {integration.description}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(integration.status)}
                    </div>

                    {/* Features */}
                    <ul className="space-y-1 mb-4">
                      {integration.features.slice(0, 3).map((feature, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-700 dark:text-gray-300 flex items-start"
                        >
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    {integration.status === 'available' ? (
                      <button
                        onClick={() => toggleIntegration(integration.id)}
                        disabled={integration.premium && !isPremium}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          connected
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : integration.premium && !isPremium
                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                        }`}
                      >
                        {connected ? (
                          <>
                            <Check className="w-4 h-4 inline mr-2" />
                            Connected
                          </>
                        ) : integration.premium && !isPremium ? (
                          <>
                            <Crown className="w-4 h-4 inline mr-2" />
                            Premium Required
                          </>
                        ) : (
                          <>
                            <Plug className="w-4 h-4 inline mr-2" />
                            Connect
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2 px-4 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                      >
                        Coming Soon
                      </button>
                    )}

                    {/* Learn More */}
                    {integration.status === 'available' && (
                      <button className="w-full mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center justify-center">
                        Learn more
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Premium Upsell */}
      {!isPremium && (
        <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-700">
          <div className="flex items-start space-x-3">
            <Crown className="w-8 h-8 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Unlock Premium Integrations
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Get access to voice assistants, automation tools, and health tracking with Listly Premium.
              </p>
              <button className="btn-primary text-sm">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Integration */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Don't see your favorite app?
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Let us know what integrations you'd like to see and we'll prioritize them!
        </p>
        <button className="btn-secondary">
          <Settings className="w-4 h-4 mr-2" />
          Request Integration
        </button>
      </div>
    </div>
  );
};

export default IntegrationsHub;
