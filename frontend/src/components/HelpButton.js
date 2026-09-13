import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import Onboarding from './Onboarding';

const HelpButton = ({ userId }) => {
  const [showTutorial, setShowTutorial] = useState(false);

  const openTutorial = () => {
    setShowTutorial(true);
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  return (
    <>
      <button
        onClick={openTutorial}
        className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 shadow-md hover:shadow-lg"
        title="Open Tutorial Guide"
        data-tutorial="help-button"
      >
        <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline font-medium text-sm">Help</span>
      </button>

      {/* Tutorial Modal */}
      {showTutorial && (
        <Onboarding 
          userId={userId} 
          forceOpen={showTutorial}
          onClose={closeTutorial}
        />
      )}
    </>
  );
};

export default HelpButton;
