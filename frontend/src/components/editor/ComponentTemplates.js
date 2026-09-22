import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Layout, Save, Download, Upload, Star, Trash2 } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * ComponentTemplates - Save and reuse component templates
 * 
 * Features:
 * - Save current widget as template
 * - Load templates
 * - Template library
 * - Import/Export templates
 * - Favorite templates
 */

const PRESET_TEMPLATES = [
  {
    id: 'hero-1',
    name: 'Hero Section',
    category: 'Marketing',
    preview: '🎯',
    config: {
      type: 'section',
      layout: { padding: '80px 20px', textAlign: 'center' },
      style: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
    }
  },
  {
    id: 'card-1',
    name: 'Feature Card',
    category: 'Content',
    preview: '📦',
    config: {
      type: 'card',
      layout: { padding: '24px', borderRadius: '12px' },
      style: { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }
    }
  },
  {
    id: 'nav-1',
    name: 'Navigation Bar',
    category: 'Layout',
    preview: '🧭',
    config: {
      type: 'nav',
      layout: { display: 'flex', justifyContent: 'space-between', padding: '16px 32px' },
      style: { background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }
    }
  },
  {
    id: 'footer-1',
    name: 'Footer',
    category: 'Layout',
    preview: '⬇️',
    config: {
      type: 'footer',
      layout: { padding: '48px 20px', textAlign: 'center' },
      style: { background: '#1a202c', color: '#ffffff' }
    }
  },
  {
    id: 'form-1',
    name: 'Contact Form',
    category: 'Interactive',
    preview: '📝',
    config: {
      type: 'form',
      layout: { maxWidth: '500px', margin: '0 auto', padding: '24px' },
      style: { background: '#f7fafc', borderRadius: '8px' }
    }
  },
  {
    id: 'cta-1',
    name: 'Call to Action',
    category: 'Marketing',
    preview: '🎉',
    config: {
      type: 'section',
      layout: { padding: '60px 20px', textAlign: 'center' },
      style: { background: '#4299e1', color: '#ffffff' }
    }
  }
];

const ComponentTemplates = () => {
  const { aveManager } = useEditor();
  
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favorites, setFavorites] = useState([]);
  
  const categories = ['All', 'Marketing', 'Content', 'Layout', 'Interactive'];
  
  const filteredTemplates = selectedCategory === 'All'
    ? PRESET_TEMPLATES
    : PRESET_TEMPLATES.filter(t => t.category === selectedCategory);
  
  const saveCurrentAsTemplate = () => {
    const selectedWidget = aveManager.getSelectedWidget();
    if (!selectedWidget) {
      alert('Please select a widget first');
      return;
    }
    
    const templateName = prompt('Enter template name:');
    if (!templateName) return;
    
    const newTemplate = {
      id: `custom-${Date.now()}`,
      name: templateName,
      category: 'Custom',
      preview: '⭐',
      config: selectedWidget,
      isCustom: true
    };
    
    setSavedTemplates([...savedTemplates, newTemplate]);
  };
  
  const loadTemplate = (template) => {
    const newWidget = {
      ...template.config,
      id: `${template.config.type}_${Date.now()}`
    };
    
    aveManager.addWidget('dashboard', newWidget);
  };
  
  const toggleFavorite = (templateId) => {
    if (favorites.includes(templateId)) {
      setFavorites(favorites.filter(id => id !== templateId));
    } else {
      setFavorites([...favorites, templateId]);
    }
  };
  
  const deleteTemplate = (templateId) => {
    setSavedTemplates(savedTemplates.filter(t => t.id !== templateId));
  };
  
  const exportTemplates = () => {
    const data = JSON.stringify(savedTemplates, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'component-templates.json';
    a.click();
  };
  
  const importTemplates = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setSavedTemplates([...savedTemplates, ...imported]);
      } catch (error) {
        alert('Invalid template file');
      }
    };
    reader.readAsText(file);
  };
  
  const allTemplates = [...PRESET_TEMPLATES, ...savedTemplates];
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layout className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Component Templates</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={saveCurrentAsTemplate}
            className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
            title="Save Current Widget"
          >
            <Save className="w-4 h-4" />
          </button>
          
          <button
            onClick={exportTemplates}
            disabled={savedTemplates.length === 0}
            className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export Templates"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <label className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <input
              type="file"
              accept=".json"
              onChange={importTemplates}
              className="hidden"
            />
          </label>
        </div>
      </div>
      
      {/* Categories */}
      <div className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      {/* Templates Grid */}
      <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {filteredTemplates.map((template) => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02 }}
            className="relative p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group"
            onClick={() => loadTemplate(template)}
          >
            {/* Preview */}
            <div className="text-4xl mb-2 text-center">{template.preview}</div>
            
            {/* Name */}
            <div className="text-sm font-medium text-gray-900 dark:text-white text-center mb-1">
              {template.name}
            </div>
            
            {/* Category */}
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {template.category}
            </div>
            
            {/* Actions */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(template.id);
                }}
                className={`p-1 rounded ${
                  favorites.includes(template.id)
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Star className="w-3 h-3" />
              </button>
              
              {template.isCustom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTemplate(template.id);
                  }}
                  className="p-1 bg-red-500 text-white rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Info */}
      {savedTemplates.length > 0 && (
        <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <p className="text-xs text-indigo-600 dark:text-indigo-400">
            💾 {savedTemplates.length} custom template{savedTemplates.length !== 1 ? 's' : ''} saved
          </p>
        </div>
      )}
    </div>
  );
};

export default ComponentTemplates;
