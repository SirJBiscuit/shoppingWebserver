import React, { useState } from 'react';
import { Layout, Settings, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import LiveEditorOverlay from './LiveEditorOverlay';

const AdminToolbar = () => {
  const { user } = useAuth();
  const { hasFeature } = useFeatureFlags();
  const [showEditor, setShowEditor] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    return localStorage.getItem('adminToolbarHidden') === 'true';
  });

  // Only show for admin users
  if (!user?.isAdmin) return null;
  
  // If permanently hidden, don't render
  if (isHidden) return null;
  
  // Check if dashboard editor feature is enabled
  const dashboardEditorEnabled = hasFeature('dashboard_editor');

  return (
    <>
      {/* Floating Admin Toolbar - Hide when editor is open */}
      {!showEditor && (
      <div className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${
        isMinimized ? '-translate-y-8' : 'translate-y-0'
      }`}>
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-white" />
                  <span className="text-white font-semibold text-sm">Admin Mode</span>
                </div>
                
                {!isMinimized && dashboardEditorEnabled && (
                  <button
                    onClick={() => setShowEditor(true)}
                    className="flex items-center space-x-2 px-4 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-all hover:scale-105 backdrop-blur-sm"
                  >
                    <Layout className="w-4 h-4" />
                    <span className="text-sm font-medium">Dashboard Editor</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
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
                <button
                  onClick={() => {
                    if (window.confirm('Hide admin toolbar? You can re-enable it from Admin Settings.')) {
                      localStorage.setItem('adminToolbarHidden', 'true');
                      setIsHidden(true);
                    }
                  }}
                  className="p-1.5 hover:bg-red-500 hover:bg-opacity-30 rounded-lg transition-all"
                  title="Hide toolbar permanently"
                >
                  <span className="text-white text-lg font-bold">×</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
      
      {/* Spacer to push content down when toolbar is visible */}
      {!showEditor && !isMinimized && <div className="h-12" />}

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
