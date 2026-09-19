import React, { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLayoutHotswap } from '../hooks/useLayoutHotswap';
import { Loader, AlertCircle, FlaskConical } from 'lucide-react';

/**
 * Dynamic Layout Component
 * Renders dashboard sections based on user role and layout configuration
 * 
 * Features:
 * - Role-based layouts (admin, beta tester, user, guest)
 * - Lazy loading of components
 * - Smooth transitions
 * - Error boundaries
 * - Loading states
 */

// Lazy load all possible components
const componentMap = {
  // Admin Components (EXIST)
  BetaAnalyticsCFS: lazy(() => import('./admin/BetaAnalyticsCFS')),
  BetaCodeManagerCFS: lazy(() => import('./admin/BetaCodeManagerCFS')),
  BetaTesterManagementCFS: lazy(() => import('./admin/BetaTesterManagementCFS')),
  BetaFeedbackDashboardCFS: lazy(() => import('./admin/BetaFeedbackDashboardCFS')),
  
  // Admin Components (PLACEHOLDERS)
  StatsOverview: () => <PlaceholderSection title="Stats Overview" description="System statistics and metrics" />,
  UserManagement: () => <PlaceholderSection title="User Management" description="Manage users and permissions" />,
  SystemSettings: () => <PlaceholderSection title="System Settings" description="Configure system settings" />,

  // Beta Tester Components (EXIST)
  BetaFeedbackWidget: lazy(() => import('./beta/BetaFeedbackWidget')),
  ContributionStats: lazy(() => import('./beta/ContributionStats')),
  ThankYouMessages: lazy(() => import('./beta/ThankYouMessages')),

  // User Components (PLACEHOLDERS)
  ShoppingList: () => <PlaceholderSection title="Shopping List" description="Your current shopping list" />,
  QuickAdd: () => <PlaceholderSection title="Quick Add" description="Quickly add items to your list" />,
  RecentItems: () => <PlaceholderSection title="Recent Items" description="Recently added items" />,
  SmartSuggestions: () => <PlaceholderSection title="Smart Suggestions" description="AI-powered shopping suggestions" />,

  // Guest Components (PLACEHOLDERS)
  WelcomeMessage: () => <PlaceholderSection title="Welcome" description="Welcome to the shopping app" />,
  DemoShoppingList: () => <PlaceholderSection title="Demo List" description="Try out the shopping list features" />
};

const DynamicLayout = ({ children }) => {
  const {
    currentLayout,
    loading,
    error,
    role,
    getSections,
    getTheme,
    getSettings
  } = useLayoutHotswap();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Failed to Load Layout
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  const sections = getSections();
  const theme = getTheme();
  const settings = getSettings();

  // Theme classes
  const themeClasses = {
    professional: 'bg-gray-50 dark:bg-gray-900',
    simplified: 'bg-white dark:bg-gray-800',
    standard: 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800',
    minimal: 'bg-white dark:bg-gray-900'
  };

  return (
    <div className={`min-h-screen ${themeClasses[theme] || themeClasses.standard}`}>
      {/* Beta Tester Badge */}
      {settings.showBetaBadge && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full shadow-lg">
            <FlaskConical className="w-5 h-5" />
            <span className="font-medium">Beta Tester</span>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className={`${settings.sidebar ? 'flex' : ''}`}>
        {/* Sidebar (if enabled) */}
        {settings.sidebar && (
          <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {currentLayout?.name || 'Dashboard'}
              </h2>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {section.id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 ${settings.compactMode ? 'p-4' : 'p-6'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentLayout?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Render sections dynamically */}
              {sections.map((section) => {
                const Component = componentMap[section.component];

                if (!Component) {
                  console.warn(`Component ${section.component} not found in componentMap`);
                  return null;
                }

                return (
                  <Suspense
                    key={section.id}
                    fallback={
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
                        <div className="flex items-center justify-center">
                          <Loader className="w-8 h-8 animate-spin text-purple-600" />
                        </div>
                      </div>
                    }
                  >
                    <ErrorBoundary sectionId={section.id}>
                      <div id={section.id}>
                        <Component config={section.config} />
                      </div>
                    </ErrorBoundary>
                  </Suspense>
                );
              })}

              {/* Render children (for custom content) */}
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Section error:', this.props.sectionId, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Section Failed to Load
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                {this.state.error?.message || 'An error occurred while loading this section.'}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="text-sm px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DynamicLayout;
