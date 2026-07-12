import React, { useState, useEffect } from 'react';
import { 
  Code, Eye, Save, Download, Upload, Copy, Trash2, 
  Plus, FileCode, Layers, Settings, Play, RefreshCw
} from 'lucide-react';

const ComponentEditor = () => {
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState(false);
  const [componentType, setComponentType] = useState('functional');
  const [props, setProps] = useState([]);
  const [state, setState] = useState([]);

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      const response = await fetch('/api/admin/components', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setComponents(data.components || []);
      }
    } catch (error) {
      console.error('Error loading components:', error);
    }
  };

  const generateComponent = () => {
    const componentName = selectedComponent?.name || 'NewComponent';
    
    let template = `import React${componentType === 'functional' ? ', { useState }' : ', { Component }'} from 'react';\n\n`;
    
    if (componentType === 'functional') {
      template += `const ${componentName} = (${props.length > 0 ? `{ ${props.map(p => p.name).join(', ')} }` : ''}) => {\n`;
      
      state.forEach(s => {
        template += `  const [${s.name}, set${s.name.charAt(0).toUpperCase() + s.name.slice(1)}] = useState(${s.defaultValue || 'null'});\n`;
      });
      
      template += `\n  return (\n    <div className="p-4">\n`;
      template += `      <h2 className="text-xl font-bold">${componentName}</h2>\n`;
      template += `      {/* Add your component content here */}\n`;
      template += `    </div>\n  );\n};\n\n`;
    } else {
      template += `class ${componentName} extends Component {\n`;
      template += `  constructor(props) {\n    super(props);\n    this.state = {\n`;
      state.forEach((s, i) => {
        template += `      ${s.name}: ${s.defaultValue || 'null'}${i < state.length - 1 ? ',' : ''}\n`;
      });
      template += `    };\n  }\n\n`;
      template += `  render() {\n    return (\n      <div className="p-4">\n`;
      template += `        <h2 className="text-xl font-bold">${componentName}</h2>\n`;
      template += `        {/* Add your component content here */}\n`;
      template += `      </div>\n    );\n  }\n}\n\n`;
    }
    
    template += `export default ${componentName};\n`;
    
    setCode(template);
  };

  const saveComponent = async () => {
    if (!selectedComponent) {
      alert('Please select or create a component first');
      return;
    }

    try {
      const response = await fetch('/api/admin/components', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedComponent.name,
          code,
          type: componentType,
          props,
          state
        })
      });

      if (response.ok) {
        alert('Component saved successfully!');
        loadComponents();
      }
    } catch (error) {
      console.error('Error saving component:', error);
      alert('Failed to save component');
    }
  };

  const createNewComponent = () => {
    const name = prompt('Enter component name (e.g., MyButton):');
    if (!name) return;

    setSelectedComponent({ name, isNew: true });
    setCode('');
    setProps([]);
    setState([]);
    generateComponent();
  };

  const addProp = () => {
    const name = prompt('Enter prop name:');
    if (!name) return;
    const type = prompt('Enter prop type (string, number, boolean, object, array):') || 'string';
    const required = window.confirm('Is this prop required?');
    
    setProps([...props, { name, type, required }]);
  };

  const addState = () => {
    const name = prompt('Enter state variable name:');
    if (!name) return;
    const defaultValue = prompt('Enter default value:') || 'null';
    
    setState([...state, { name, defaultValue }]);
  };

  const exportComponent = () => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedComponent?.name || 'Component'}.jsx`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileCode className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Component Editor</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create and edit React components visually
            </p>
          </div>
        </div>
        <button onClick={createNewComponent} className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Component</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Component List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="font-bold mb-4">Components</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {components.map((comp) => (
              <button
                key={comp.id}
                onClick={() => {
                  setSelectedComponent(comp);
                  setCode(comp.code || '');
                  setProps(comp.props || []);
                  setState(comp.state || []);
                  setComponentType(comp.type || 'functional');
                }}
                className={`w-full text-left p-3 rounded-lg transition ${
                  selectedComponent?.id === comp.id
                    ? 'bg-purple-100 dark:bg-purple-900/20 border-2 border-purple-600'
                    : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">{comp.name}</div>
                <div className="text-xs text-gray-500">{comp.type}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3 space-y-6">
          {selectedComponent && (
            <>
              {/* Component Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="font-bold mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Component Settings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Component Name</label>
                    <input
                      type="text"
                      value={selectedComponent.name}
                      onChange={(e) => setSelectedComponent({...selectedComponent, name: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={componentType}
                      onChange={(e) => setComponentType(e.target.value)}
                      className="input-field"
                    >
                      <option value="functional">Functional Component</option>
                      <option value="class">Class Component</option>
                    </select>
                  </div>
                </div>

                {/* Props */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Props</label>
                    <button onClick={addProp} className="text-sm text-purple-600 hover:text-purple-800">
                      + Add Prop
                    </button>
                  </div>
                  <div className="space-y-2">
                    {props.map((prop, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        <span className="font-mono text-sm">{prop.name}</span>
                        <span className="text-xs text-gray-500">({prop.type})</span>
                        {prop.required && <span className="text-xs text-red-600">*required</span>}
                        <button
                          onClick={() => setProps(props.filter((_, i) => i !== idx))}
                          className="ml-auto text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* State */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">State Variables</label>
                    <button onClick={addState} className="text-sm text-purple-600 hover:text-purple-800">
                      + Add State
                    </button>
                  </div>
                  <div className="space-y-2">
                    {state.map((s, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        <span className="font-mono text-sm">{s.name}</span>
                        <span className="text-xs text-gray-500">= {s.defaultValue}</span>
                        <button
                          onClick={() => setState(state.filter((_, i) => i !== idx))}
                          className="ml-auto text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={generateComponent}
                  className="btn-secondary w-full mt-4 flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate Code
                </button>
              </div>

              {/* Code Editor */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center">
                    <Code className="w-5 h-5 mr-2" />
                    Code Editor
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPreview(!preview)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportComponent}
                      className="text-sm text-green-600 hover:text-green-800"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input-field font-mono text-sm h-96"
                  spellCheck={false}
                />

                <div className="flex space-x-2 mt-4">
                  <button onClick={saveComponent} className="btn-primary flex-1 flex items-center justify-center">
                    <Save className="w-4 h-4 mr-2" />
                    Save Component
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="btn-secondary flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </button>
                </div>
              </div>

              {/* Preview */}
              {preview && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="font-bold mb-4">Preview</h3>
                  <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">
                      Component preview will render here (requires build)
                    </p>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                      <Layers className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">Preview: {selectedComponent.name}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentEditor;
