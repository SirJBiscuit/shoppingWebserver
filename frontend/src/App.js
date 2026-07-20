import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CartAnimationProvider } from './contexts/CartAnimationContext';
import FlyingItemAnimation from './components/FlyingItemAnimation';
import MobileBottomNav from './components/MobileBottomNav';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Recipes = lazy(() => import('./pages/Recipes'));
const PantryEnhanced = lazy(() => import('./pages/PantryEnhanced'));
const MealPlan = lazy(() => import('./pages/MealPlan'));
const Statistics = lazy(() => import('./pages/Statistics'));
const RecipeDiscover = lazy(() => import('./pages/RecipeDiscover'));
const Settings = lazy(() => import('./pages/Settings'));
const History = lazy(() => import('./pages/History'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminCustomization = lazy(() => import('./pages/AdminCustomization'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Premium = lazy(() => import('./pages/Premium'));
const IconCollectionGallery = lazy(() => import('./components/IconCollectionGallery'));
const CustomizationHub = lazy(() => import('./components/CustomizationHub'));
const IconUploadPanel = lazy(() => import('./components/admin/IconUploadPanel'));

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
        <Route path="/recipes" element={<PrivateRoute><Recipes /></PrivateRoute>} />
        <Route path="/pantry" element={<PrivateRoute><PantryEnhanced /></PrivateRoute>} />
        <Route path="/meal-plan" element={<PrivateRoute><MealPlan /></PrivateRoute>} />
        <Route path="/stats" element={<PrivateRoute><Statistics /></PrivateRoute>} />
        <Route path="/discover" element={<PrivateRoute><RecipeDiscover /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/subscription" element={<PrivateRoute><Subscription /></PrivateRoute>} />
        <Route path="/premium" element={<PrivateRoute><Premium /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/admin/customize" element={<PrivateRoute><AdminCustomization /></PrivateRoute>} />
        <Route path="/icons" element={<PrivateRoute><IconCollectionGallery /></PrivateRoute>} />
        <Route path="/customize" element={<PrivateRoute><CustomizationHub /></PrivateRoute>} />
        <Route path="/admin/icons" element={<PrivateRoute><IconUploadPanel /></PrivateRoute>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CartAnimationProvider>
          <Router>
            <AnimatedRoutes />
            <FlyingItemAnimation />
            <MobileBottomNav />
          </Router>
        </CartAnimationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
