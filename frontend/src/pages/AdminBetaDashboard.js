import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FlaskConical, BarChart3, Key, Users, MessageSquare } from 'lucide-react';
import BetaAnalyticsCFS from '../components/admin/BetaAnalyticsCFS';
import BetaCodeManagerCFS from '../components/admin/BetaCodeManagerCFS';
import BetaTesterManagementCFS from '../components/admin/BetaTesterManagementCFS';
import BetaFeedbackDashboardCFS from '../components/admin/BetaFeedbackDashboardCFS';
import BetaChat from '../components/beta/BetaChat';

/**
 * Admin Beta Dashboard
 * Central hub for managing the beta testing program
 */
const AdminBetaDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  // Sidebar shortcuts (e.g. "BTCS Scores") jump straight to a tab
  useEffect(() => {
    const onSetTab = (e) => {
      if (typeof e.detail === 'string') setActiveTab(e.detail);
    };
    window.addEventListener('setBetaTab', onSetTab);
    return () => window.removeEventListener('setBetaTab', onSetTab);
  }, []);

  // BTCS + tester management are admin-only — route is PrivateRoute-gated
  // (logged in) but not role-gated, so bounce non-admins here.
  if (user && user.is_admin !== true) {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { 
      id: 'analytics', 
      name: 'Analytics', 
      icon: BarChart3,
      component: BetaAnalyticsCFS,
      description: 'View beta tester metrics and MDL impact'
    },
    { 
      id: 'codes', 
      name: 'Beta Codes', 
      icon: Key,
      component: BetaCodeManagerCFS,
      description: 'Generate and manage beta access codes'
    },
    { 
      id: 'testers', 
      name: 'Testers', 
      icon: Users,
      component: BetaTesterManagementCFS,
      description: 'Manage beta testers and send messages'
    },
    { 
      id: 'feedback', 
      name: 'Feedback', 
      icon: MessageSquare,
      component: BetaFeedbackDashboardCFS,
      description: 'View and respond to feedback'
    },
    {
      id: 'chat',
      name: 'Chat',
      icon: MessageSquare,
      component: BetaChat,
      description: 'Instant messaging with beta testers'
    }
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component;
  const activeTabInfo = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <FlaskConical className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Beta Testing Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your beta testing program and analyze feedback
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    transition-colors duration-200
                    ${activeTab === tab.id
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${activeTab === tab.id
                      ? 'text-purple-500 dark:text-purple-400'
                      : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'
                    }
                  `} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Description */}
      {activeTabInfo && (
        <div className="bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              {activeTabInfo.description}
            </p>
          </div>
        </div>
      )}

      {/* Active Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default AdminBetaDashboard;
