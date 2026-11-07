import React, { useState } from 'react';
import { Save } from 'lucide-react';
import MenuPanel from './MenuPanel';

const SaveTemplateModal = ({ isOpen, onClose, onSave, defaultName }) => {
  const [templateName, setTemplateName] = useState(defaultName || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    onSave(templateName);
    setTemplateName('');
    onClose();
  };

  return (
    <MenuPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Save as Template"
      subtitle="Reuse this list anytime"
      icon={Save}
      maxWidth="max-w-md"
    >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="input-field"
              placeholder="e.g., Weekly Groceries, Party Shopping"
              autoFocus
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Give your template a memorable name
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={!templateName.trim()}
            >
              Save Template
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
    </MenuPanel>
  );
};

export default SaveTemplateModal;
