import React, { useState } from 'react';
import { Layout, Settings, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LiveEditorOverlay from './LiveEditorOverlay';

const AdminToolbar = () => {
  const { user } = useAuth();
  const [showEditor, setShowEditor] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Only show for admin users
  if (!user?.isAdmin) return null;

  return (
    <>
      {/* Floating Admin Toolbar */}
      <div className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isMinimized ? 'translate-y-0' : 'translate-y-0'
      }`}>
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-white" />
                  <span className="text-white font-semibold text-sm">Admin Mode</span>
                </div>
                
                {!isMinimized && (
                  <button
                    onClick={() => setShowEditor(true)}
                    className="flex items-center space-x-2 px-4 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-all hover:scale-105 backdrop-blur-sm"
                  >
                    <Layout className="w-4 h-4" />
                    <span className="text-sm font-medium">Dashboard Editor</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
                title={isMinimized ? 'Show toolbar' : 'Minimize toolbar'}
              >
                {isMinimized ? (
                  <Eye className="w-4 h-4 text-white" />
                ) : (
                  <EyeOff className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add padding to page content so it doesn't go under the toolbar */}
      <div className="h-10" />

      {/* Live Editor Overlay */}
      {showEditor && (
        <LiveEditorOverlay 
          onClose={() => setShowEditor(false)}
          onSave={() => {
            setShowEditor(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
};

export default AdminToolbar;
