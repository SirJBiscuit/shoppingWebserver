import React, { useState, useEffect } from 'react';
import { 
  Store, Download, Star, Search, Filter, Eye, 
  Zap, ShoppingCart, Users, Heart, TrendingUp, Package
} from 'lucide-react';

const AppTemplateMarketplace = ({ onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const categories = [
    { id: 'all', name: 'All Templates', icon: Package },
    { id: 'ecommerce', name: 'E-Commerce', icon: ShoppingCart },
    { id: 'social', name: 'Social Media', icon: Users },
    { id: 'productivity', name: 'Productivity', icon: Zap },
    { id: 'health', name: 'Health & Fitness', icon: Heart },
    { id: 'content', name: 'Content & Blogs', icon: TrendingUp },
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/ai-apps/templates', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const loadTemplate = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    alert(`Template "${template.name}" loaded! Start customizing your app.`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center space-x-3 mb-2">
          <Store className="w-8 h-8" />
          <h2 className="text-2xl font-bold">App Template Marketplace</h2>
        </div>
        <p className="text-blue-100">
          Choose from pre-built templates to jumpstart your app development
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                  selectedCategory === category.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition cursor-pointer"
              onClick={() => {
                setSelectedTemplate(template);
                setShowPreview(true);
              }}
            >
              {/* Template Preview Image */}
              <div className="h-48 bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                <Package className="w-16 h-16 text-white opacity-50" />
              </div>

              {/* Template Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg">{template.name}</h3>
                  <div className="flex items-center space-x-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm">4.8</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {template.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(template.features || []).slice(0, 3).map((feature, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-600 px-2 py-1 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                  {template.features?.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{template.features.length - 3} more
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Download className="w-4 h-4" />
                    <span>{template.downloads || 0}</span>
                  </div>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 px-2 py-1 rounded">
                    {template.platform}
                  </span>
                </div>

                {/* Use Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    loadTemplate(template);
                  }}
                  className="btn-primary w-full mt-3 text-sm"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No templates found</p>
            <p className="text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-2">{selectedTemplate.name}</h2>
              <p className="text-gray-600 dark:text-gray-400">{selectedTemplate.description}</p>
            </div>

            {/* Preview Content */}
            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-bold mb-3">Features Included:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(selectedTemplate.features || []).map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold mb-3">Platform:</h3>
                <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-600 px-3 py-1 rounded-lg">
                  {selectedTemplate.platform}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="font-bold mb-3">Category:</h3>
                <span className="bg-purple-100 dark:bg-purple-900/20 text-purple-600 px-3 py-1 rounded-lg">
                  {selectedTemplate.category}
                </span>
              </div>
            </div>

            {/* Preview Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex space-x-3">
              <button
                onClick={() => {
                  loadTemplate(selectedTemplate);
                  setShowPreview(false);
                }}
                className="btn-primary flex-1"
              >
                Use This Template
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="btn-secondary flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppTemplateMarketplace;
