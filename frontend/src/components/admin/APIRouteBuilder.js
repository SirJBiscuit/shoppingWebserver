import React, { useState, useEffect } from 'react';
import { 
  Zap, Plus, Trash2, Save, Download, Code, Play, 
  Database, Shield, Clock, FileText, Copy
} from 'lucide-react';

const APIRouteBuilder = () => {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [generatedCode, setGeneratedCode] = useState('');

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const authTypes = ['none', 'required', 'admin', 'optional'];

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const response = await fetch('/api/admin/routes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRoutes(data.routes || []);
      }
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };

  const createNewRoute = () => {
    const newRoute = {
      id: Date.now(),
      name: 'New Route',
      method: 'GET',
      path: '/api/new-route',
      auth: 'required',
      description: '',
      parameters: [],
      queryParams: [],
      bodySchema: [],
      response: { type: 'json', schema: [] },
      middleware: [],
      database: { enabled: false, query: '' },
      rateLimit: { enabled: false, max: 100, window: 60000 }
    };
    setRoutes([...routes, newRoute]);
    setSelectedRoute(newRoute);
  };

  const updateRoute = (field, value) => {
    const updated = { ...selectedRoute, [field]: value };
    setSelectedRoute(updated);
    setRoutes(routes.map(r => r.id === updated.id ? updated : r));
  };

  const addParameter = (type) => {
    const name = prompt(`Enter ${type} parameter name:`);
    if (!name) return;
    
    const param = {
      name,
      type: 'string',
      required: true,
      description: ''
    };

    if (type === 'path') {
      updateRoute('parameters', [...selectedRoute.parameters, param]);
    } else if (type === 'query') {
      updateRoute('queryParams', [...selectedRoute.queryParams, param]);
    } else if (type === 'body') {
      updateRoute('bodySchema', [...selectedRoute.bodySchema, param]);
    }
  };

  const generateRouteCode = () => {
    if (!selectedRoute) return;

    let code = `const express = require('express');\nconst router = express.Router();\n`;
    
    if (selectedRoute.database.enabled) {
      code += `const db = require('../database/db');\n`;
    }
    
    code += `\n// ${selectedRoute.description || selectedRoute.name}\n`;
    code += `router.${selectedRoute.method.toLowerCase()}('${selectedRoute.path}'`;
    
    // Add middleware
    if (selectedRoute.auth !== 'none') {
      code += `, requireAuth`;
      if (selectedRoute.auth === 'admin') {
        code += `, requireAdmin`;
      }
    }
    
    if (selectedRoute.rateLimit.enabled) {
      code += `, rateLimit({ max: ${selectedRoute.rateLimit.max}, windowMs: ${selectedRoute.rateLimit.window} })`;
    }
    
    code += `, async (req, res) => {\n`;
    code += `  try {\n`;
    
    // Extract parameters
    if (selectedRoute.parameters.length > 0) {
      code += `    const { ${selectedRoute.parameters.map(p => p.name).join(', ')} } = req.params;\n`;
    }
    
    if (selectedRoute.queryParams.length > 0) {
      code += `    const { ${selectedRoute.queryParams.map(p => p.name).join(', ')} } = req.query;\n`;
    }
    
    if (selectedRoute.bodySchema.length > 0 && ['POST', 'PUT', 'PATCH'].includes(selectedRoute.method)) {
      code += `    const { ${selectedRoute.bodySchema.map(p => p.name).join(', ')} } = req.body;\n`;
    }
    
    // Validation
    const requiredParams = [
      ...selectedRoute.parameters.filter(p => p.required),
      ...selectedRoute.queryParams.filter(p => p.required),
      ...selectedRoute.bodySchema.filter(p => p.required)
    ];
    
    if (requiredParams.length > 0) {
      code += `\n    // Validation\n`;
      requiredParams.forEach(param => {
        code += `    if (!${param.name}) {\n`;
        code += `      return res.status(400).json({ error: '${param.name} is required' });\n`;
        code += `    }\n`;
      });
    }
    
    // Database query
    if (selectedRoute.database.enabled && selectedRoute.database.query) {
      code += `\n    // Database query\n`;
      code += `    const result = await db.query(\n`;
      code += `      \`${selectedRoute.database.query}\`,\n`;
      code += `      [${selectedRoute.parameters.map(p => p.name).join(', ')}]\n`;
      code += `    );\n\n`;
      code += `    res.json(result.rows);\n`;
    } else {
      code += `\n    // TODO: Implement your logic here\n`;
      code += `    res.json({ message: 'Success', data: {} });\n`;
    }
    
    code += `  } catch (error) {\n`;
    code += `    console.error('Error:', error);\n`;
    code += `    res.status(500).json({ error: 'Internal server error' });\n`;
    code += `  }\n`;
    code += `});\n\n`;
    code += `module.exports = router;\n`;
    
    setGeneratedCode(code);
  };

  const saveRoute = async () => {
    if (!selectedRoute) return;

    try {
      const response = await fetch('/api/admin/routes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedRoute)
      });

      if (response.ok) {
        alert('Route saved successfully!');
        loadRoutes();
      }
    } catch (error) {
      console.error('Error saving route:', error);
      alert('Failed to save route');
    }
  };

  const deleteRoute = (routeId) => {
    if (window.confirm('Delete this route?')) {
      setRoutes(routes.filter(r => r.id !== routeId));
      if (selectedRoute?.id === routeId) setSelectedRoute(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">API Route Builder</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create REST API endpoints without writing code
            </p>
          </div>
        </div>
        <button onClick={createNewRoute} className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Route</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Routes List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="font-bold mb-4">API Routes</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {routes.map((route) => (
              <div
                key={route.id}
                onClick={() => setSelectedRoute(route)}
                className={`p-3 rounded-lg cursor-pointer transition ${
                  selectedRoute?.id === route.id
                    ? 'bg-purple-100 dark:bg-purple-900/20 border-2 border-purple-600'
                    : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    route.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                    route.method === 'POST' ? 'bg-green-100 text-green-800' :
                    route.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                    route.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {route.method}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRoute(route.id);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="font-mono text-sm">{route.path}</div>
                <div className="text-xs text-gray-500 mt-1">{route.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Route Editor */}
        {selectedRoute && (
          <div className="lg:col-span-3 space-y-6">
            {/* Basic Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="font-bold mb-4">Route Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Route Name</label>
                  <input
                    type="text"
                    value={selectedRoute.name}
                    onChange={(e) => updateRoute('name', e.target.value)}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">HTTP Method</label>
                  <select
                    value={selectedRoute.method}
                    onChange={(e) => updateRoute('method', e.target.value)}
                    className="input-field"
                  >
                    {httpMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Path</label>
                  <input
                    type="text"
                    value={selectedRoute.path}
                    onChange={(e) => updateRoute('path', e.target.value)}
                    className="input-field font-mono"
                    placeholder="/api/resource/:id"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Authentication</label>
                  <select
                    value={selectedRoute.auth}
                    onChange={(e) => updateRoute('auth', e.target.value)}
                    className="input-field"
                  >
                    {authTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={selectedRoute.description}
                    onChange={(e) => updateRoute('description', e.target.value)}
                    className="input-field h-20"
                    placeholder="What does this endpoint do?"
                  />
                </div>
              </div>
            </div>

            {/* Parameters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="font-bold mb-4">Parameters</h3>
              
              <div className="space-y-4">
                {/* Path Parameters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Path Parameters</label>
                    <button
                      onClick={() => addParameter('path')}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedRoute.parameters.map((param, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        <span className="font-mono text-sm flex-1">{param.name}</span>
                        <span className="text-xs text-gray-500">({param.type})</span>
                        {param.required && <span className="text-xs text-red-600">*</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Query Parameters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Query Parameters</label>
                    <button
                      onClick={() => addParameter('query')}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedRoute.queryParams.map((param, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        <span className="font-mono text-sm flex-1">{param.name}</span>
                        <span className="text-xs text-gray-500">({param.type})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body Schema */}
                {['POST', 'PUT', 'PATCH'].includes(selectedRoute.method) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Request Body</label>
                      <button
                        onClick={() => addParameter('body')}
                        className="text-sm text-purple-600 hover:text-purple-800"
                      >
                        + Add Field
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedRoute.bodySchema.map((field, idx) => (
                        <div key={idx} className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                          <span className="font-mono text-sm flex-1">{field.name}</span>
                          <span className="text-xs text-gray-500">({field.type})</span>
                          {field.required && <span className="text-xs text-red-600">*</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Database Integration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Database Query
                </h3>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoute.database.enabled}
                    onChange={(e) => updateRoute('database', {...selectedRoute.database, enabled: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Enable</span>
                </label>
              </div>
              
              {selectedRoute.database.enabled && (
                <textarea
                  value={selectedRoute.database.query}
                  onChange={(e) => updateRoute('database', {...selectedRoute.database, query: e.target.value})}
                  className="input-field font-mono text-sm h-32"
                  placeholder="SELECT * FROM table WHERE id = $1"
                />
              )}
            </div>

            {/* Generated Code */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center">
                  <Code className="w-5 h-5 mr-2" />
                  Generated Code
                </h3>
                <button
                  onClick={generateRouteCode}
                  className="btn-secondary text-sm flex items-center"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Generate
                </button>
              </div>
              
              {generatedCode && (
                <>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono max-h-96 overflow-y-auto">
                    {generatedCode}
                  </pre>
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedCode)}
                      className="btn-secondary flex items-center"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Save Button */}
            <button onClick={saveRoute} className="btn-primary w-full flex items-center justify-center">
              <Save className="w-4 h-4 mr-2" />
              Save Route
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default APIRouteBuilder;
