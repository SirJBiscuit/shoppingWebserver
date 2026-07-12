import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

const SaveTemplateModal = ({ isOpen, onClose, onSave, defaultName }) => {
  const [templateName, setTemplateName] = useState(defaultName || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    onSave(templateName);
    setTemplateName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Save className="w-5 h-5 mr-2" />
            Save as Template
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
      </div>
    </div>
  );
};

export default SaveTemplateModal;
