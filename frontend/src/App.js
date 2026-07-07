import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import Pantry from './pages/Pantry';
import MealPlan from './pages/MealPlan';
import Stats from './pages/Stats';
import Admin from './pages/Admin';

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
        <Route path="/pantry" element={<PrivateRoute><Pantry /></PrivateRoute>} />
        <Route path="/meal-plan" element={<PrivateRoute><MealPlan /></PrivateRoute>} />
        <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AnimatedRoutes />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
