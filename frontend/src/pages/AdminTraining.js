import React, { useState, useEffect } from 'react';
import { GraduationCap, DollarSign, Package, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import PriceTrainingTab from '../components/admin/PriceTrainingTab';

const AdminTraining = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('prices');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadStats();
  }, [user, navigate]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/training/prices/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'prices', name: 'Price Training', icon: DollarSign },
    { id: 'products', name: 'Products', icon: Package, disabled: true },
    { id: 'analytics', name: 'Analytics', icon: TrendingUp, disabled: true },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        
        <div className="lg:ml-64 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <GraduationCap className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Training System
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Train the system with accurate data, review submissions, and maintain data quality
              </p>
            </div>

            {/* Quick Stats */}
            {!loading && stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Prices</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.total_prices || 0}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {stats.pending_count || 0}
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Outliers</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {stats.outlier_count || 0}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-red-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {stats.approved_count || 0}
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-green-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex -mb-px">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setActiveTab(tab.id)}
                        disabled={tab.disabled}
                        className={`
                          flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                          ${activeTab === tab.id
                            ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                            : tab.disabled
                            ? 'border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5" />
                        {tab.name}
                        {tab.disabled && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                            Soon
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'prices' && (
                  <PriceTrainingTab onStatsUpdate={loadStats} />
                )}
                
                {activeTab === 'products' && (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Product Management Coming Soon
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Manage product master data, categories, and icons
                    </p>
                  </div>
                )}
                
                {activeTab === 'analytics' && (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Analytics Coming Soon
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      View trends, insights, and data quality metrics
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default AdminTraining;
