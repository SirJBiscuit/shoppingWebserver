import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CartAnimationProvider } from './contexts/CartAnimationContext';
import { FeatureFlagProvider } from './context/FeatureFlagContext';
import { OptimizationProvider } from './contexts/OptimizationContext';
import { PreviewModeProvider } from './contexts/PreviewModeContext';
import { EditorProvider } from './contexts/EditorContext';
import FlyingItemAnimation from './components/FlyingItemAnimation';
// import MobileBottomNav from './components/MobileBottomNav'; // Disabled for now
import AdminToolbar from './components/AdminToolbar';
// import UpdateChecker from './backburner/components/UpdateChecker'; // Disabled - backburner component
import UpdateNotification from './components/UpdateNotification';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Recipes = lazy(() => import('./pages/Recipes'));
// const RecipesNew = lazy(() => import('./backburner/pages/RecipesNew')); // Disabled - backburner
const PantryEnhanced = lazy(() => import('./pages/PantryEnhanced'));
// const PantryNew = lazy(() => import('./backburner/pages/PantryNew')); // Disabled - backburner
// const PantryNewV2 = lazy(() => import('./backburner/pages/PantryNewV2')); // Disabled - backburner
const StagingArea = lazy(() => import('./pages/StagingArea'));
// const MealPlan = lazy(() => import('./pages/MealPlan')); // Disabled
// const Statistics = lazy(() => import('./pages/Statistics')); // Disabled
// const RecipeDiscover = lazy(() => import('./pages/RecipeDiscover')); // Disabled
const Settings = lazy(() => import('./pages/Settings'));
// const History = lazy(() => import('./pages/History')); // Disabled
const Admin = lazy(() => import('./pages/Admin'));
const AdminCustomization = lazy(() => import('./pages/AdminCustomization'));
const AdminTraining = lazy(() => import('./pages/AdminTraining'));
// const Subscription = lazy(() => import('./pages/Subscription')); // Disabled
// const Premium = lazy(() => import('./pages/Premium')); // Disabled
const IconCollectionGallery = lazy(() => import('./components/IconCollectionGallery'));
// const CustomizationHub = lazy(() => import('./backburner/components/CustomizationHub')); // Disabled - backburner
const IconUploadPanel = lazy(() => import('./components/admin/IconUploadPanel'));
const AdminBetaDashboard = lazy(() => import('./pages/AdminBetaDashboard'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <div className="text-lg">Loading...</div>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }
  
  return !user ? children : <Navigate to="/" />;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        {/* <Route path="/recipes" element={<PrivateRoute><RecipesNew /></PrivateRoute>} /> */} {/* Disabled - backburner, will redo */}
        <Route path="/recipes" element={<PrivateRoute><Recipes /></PrivateRoute>} /> {/* Using current Recipes for now */}
        <Route path="/pantry" element={<PrivateRoute><PantryEnhanced /></PrivateRoute>} />
        {/* <Route path="/pantry-new" element={<PrivateRoute><PantryNewV2 /></PrivateRoute>} /> */} {/* Disabled - backburner */}
        {/* <Route path="/pantry-old" element={<PrivateRoute><PantryNew /></PrivateRoute>} /> */} {/* Disabled - backburner */}
        <Route path="/staging" element={<PrivateRoute><StagingArea /></PrivateRoute>} />
        {/* <Route path="/meal-plan" element={<PrivateRoute><MealPlan /></PrivateRoute>} /> */} {/* Disabled - will redo with new systems */}
        {/* <Route path="/stats" element={<PrivateRoute><Statistics /></PrivateRoute>} /> */} {/* Disabled - will redo with new systems */}
        {/* <Route path="/discover" element={<PrivateRoute><RecipeDiscover /></PrivateRoute>} /> */} {/* Disabled - will redo with new systems */}
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        {/* <Route path="/subscription" element={<PrivateRoute><Subscription /></PrivateRoute>} /> */} {/* Disabled - not ready */}
        {/* <Route path="/premium" element={<PrivateRoute><Premium /></PrivateRoute>} /> */} {/* Disabled - not ready */}
        {/* <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} /> */} {/* Disabled - will redo with new systems */}
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/admin/customize" element={<PrivateRoute><AdminCustomization /></PrivateRoute>} />
        <Route path="/admin/training" element={<PrivateRoute><AdminTraining /></PrivateRoute>} />
        <Route path="/admin/beta" element={<PrivateRoute><AdminBetaDashboard /></PrivateRoute>} />
        <Route path="/icons" element={<PrivateRoute><IconCollectionGallery /></PrivateRoute>} />
        {/* <Route path="/customize" element={<PrivateRoute><CustomizationHub /></PrivateRoute>} /> */} {/* Disabled - backburner, replaced by AES */}
        <Route path="/admin/icons" element={<PrivateRoute><IconUploadPanel /></PrivateRoute>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

// Wrapper to provide EditorProvider with user context
const AppWithEditor = () => {
  const { user } = useAuth();
  
  return (
    <EditorProvider userId={user?.id}>
      <Router>
        {/* <UpdateChecker /> */} {/* Disabled - backburner component */}
        <UpdateNotification />
        <AdminToolbar />
        <AnimatedRoutes />
        <FlyingItemAnimation />
        {/* <MobileBottomNav /> */} {/* Disabled for now */}
      </Router>
    </EditorProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <FeatureFlagProvider>
        <ThemeProvider>
          <OptimizationProvider>
            <PreviewModeProvider>
              <CartAnimationProvider>
                <AppWithEditor />
              </CartAnimationProvider>
            </PreviewModeProvider>
          </OptimizationProvider>
        </ThemeProvider>
      </FeatureFlagProvider>
    </AuthProvider>
  );
}

export default App;
