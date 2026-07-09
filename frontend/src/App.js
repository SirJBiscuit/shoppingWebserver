import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CartAnimationProvider } from './contexts/CartAnimationContext';
import FlyingItemAnimation from './components/FlyingItemAnimation';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import Pantry from './pages/Pantry';
import PantryEnhanced from './pages/PantryEnhanced';
import MealPlan from './pages/MealPlan';
import Stats from './pages/Stats';
import Statistics from './pages/Statistics';
import RecipeDiscover from './pages/RecipeDiscover';
import Settings from './pages/Settings';
import History from './pages/History';
import Admin from './pages/Admin';
import Subscription from './pages/Subscription';

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
        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
      </Routes>
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
          </Router>
        </CartAnimationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
