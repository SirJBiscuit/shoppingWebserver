import React from 'react';
import { Navigate } from 'react-router-dom';
import { Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BtcsPanel from '../components/admin/BtcsPanel';

const AdminBtcs = () => {
  const { user } = useAuth();
  if (user && user.is_admin !== true) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <Award className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">BTCS</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Beta Tester Contribution System — scores, testers, global features, backups & recovery
            </p>
          </div>
        </div>
        <div className="min-h-[70vh]">
          <BtcsPanel />
        </div>
      </div>
    </div>
  );
};

export default AdminBtcs;
