import React, { useState, useRef, useEffect } from 'react';
import { 
  GitBranch, Plus, Trash2, Play, Save, Download,
  Zap, Database, Code, MousePointer, Link2
} from 'lucide-react';

const NodeCraftEditor = ({ onCodeGenerate }) => {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const canvasRef = useRef(null);

  // Node types
  const nodeTypes = [
    { id: 'start', name: 'Start', color: 'bg-green-500', icon: Play, outputs: ['next'] },
    { id: 'action', name: 'Action', color: 'bg-blue-500', icon: Zap, inputs: ['in'], outputs: ['out'] },
    { id: 'condition', name: 'If/Else', color: 'bg-yellow-500', icon: GitBranch, inputs: ['in'], outputs: ['true', 'false'] },
    { id: 'data', name: 'Get Data', color: 'bg-purple-500', icon: Database, inputs: ['in'], outputs: ['out'] },
    { id: 'function', name: 'Function', color: 'bg-indigo-500', icon: Code, inputs: ['in'], outputs: ['out'] },
    { id: 'end', name: 'End', color: 'bg-red-500', icon: MousePointer, inputs: ['in'] },
  ];

  // Premade action templates
  const actionTemplates = {
    'show-alert': { name: 'Show Alert', code: 'alert("Hello!")' },
    'set-state': { name: 'Set State', code: 'setState(value)' },
    'api-call': { name: 'API Call', code: 'fetch("/api/endpoint")' },
    'navigate': { name: 'Navigate', code: 'navigate("/page")' },
    'log': { name: 'Console Log', code: 'console.log(data)' },
  };

  const addNode = (type) => {
    const nodeType = nodeTypes.find(t => t.id === type);
    const newNode = {
      id: Date.now(),
      type,
      name: nodeType.name,
      position: { x: 100, y: 100 },
      data: {},
      inputs: nodeType.inputs || [],
      outputs: nodeType.outputs || []
    };
    setNodes([...nodes, newNode]);
  };

  const updateNode = (id, updates) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNode = (id) => {
    setNodes(nodes.filter(n => n.id !== id));
    setConnections(connections.filter(c => c.from !== id && c.to !== id));
    if (selectedNode?.id === id) setSelectedNode(null);
  };

  const startConnection = (nodeId, output) => {
    setConnecting({ from: nodeId, output });
  };

  const completeConnection = (nodeId, input) => {
    if (!connecting) return;
    
    const newConnection = {
      id: Date.now(),
      from: connecting.from,
      to: nodeId,
      fromOutput: connecting.output,
      toInput: input
    };
    
    setConnections([...connections, newConnection]);
    setConnecting(null);
  };

  const generateCode = () => {
    if (nodes.length === 0) return '';

    let code = '// Auto-generated from NodeCraft\n\n';
    code += 'const generatedFunction = async () => {\n';
    
    // Find start node
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) {
      return '// Error: No start node found';
    }

    // Traverse nodes
    const visited = new Set();
    const traverse = (nodeId, indent = '  ') => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      switch (node.type) {
        case 'action':
          code += `${indent}// ${node.name}\n`;
          code += `${indent}${node.data.code || 'console.log("Action")'}\n`;
          break;
        
        case 'condition':
          code += `${indent}if (${node.data.condition || 'true'}) {\n`;
          const trueConn = connections.find(c => c.from === nodeId && c.fromOutput === 'true');
          if (trueConn) traverse(trueConn.to, indent + '  ');
          code += `${indent}} else {\n`;
          const falseConn = connections.find(c => c.from === nodeId && c.fromOutput === 'false');
          if (falseConn) traverse(falseConn.to, indent + '  ');
          code += `${indent}}\n`;
          return;
        
        case 'data':
          code += `${indent}const data = ${node.data.source || 'null'};\n`;
          break;
        
        case 'function':
          code += `${indent}${node.data.code || '// Custom function'}\n`;
          break;
      }

      // Follow next connection
      const nextConn = connections.find(c => c.from === nodeId && c.fromOutput === 'out');
      if (nextConn) traverse(nextConn.to, indent);
    };

    traverse(startNode.id);
    
    code += '};\n\n';
    code += 'export default generatedFunction;\n';

    if (onCodeGenerate) onCodeGenerate(code);
    return code;
  };

  const handleNodeDrag = (e, node) => {
    if (e.type === 'mousedown') {
      setDraggingNode(node);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggingNode && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        updateNode(draggingNode.id, {
          position: { x, y }
        });
      }
    };

    const handleMouseUp = () => {
      setDraggingNode(null);
    };

    if (draggingNode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNode]);

  return (
    <div className="h-full flex">
      {/* Node Palette */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-bold mb-4 flex items-center">
          <GitBranch className="w-5 h-5 mr-2 text-purple-600" />
          Node Types
        </h3>
        
        <div className="space-y-2">
          {nodeTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => addNode(type.id)}
                className={`w-full flex items-center space-x-2 p-3 rounded-lg ${type.color} text-white hover:opacity-90 transition`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{type.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <h4 className="font-bold text-sm mb-2">Actions</h4>
          <div className="space-y-1">
            {Object.entries(actionTemplates).map(([key, template]) => (
              <button
                key={key}
                onClick={() => {
                  const node = nodes.find(n => n.id === selectedNode?.id);
                  if (node && node.type === 'action') {
                    updateNode(node.id, { data: { ...node.data, code: template.code } });
                  }
                }}
                className="w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900 rounded hover:bg-purple-100 dark:hover:bg-purple-900/20"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={() => {
              const code = generateCode();
              console.log(code);
              alert('Code generated! Check console.');
            }}
            className="btn-primary w-full text-sm flex items-center justify-center"
          >
            <Play className="w-4 h-4 mr-2" />
            Generate Code
          </button>
          <button
            onClick={() => {
              const code = generateCode();
              const blob = new Blob([code], { type: 'text/javascript' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'generated-function.js';
              a.click();
            }}
            className="btn-secondary w-full text-sm flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Code
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <div
          ref={canvasRef}
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Connections */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
            {connections.map(conn => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.position.x + 150;
              const y1 = fromNode.position.y + 40;
              const x2 = toNode.position.x;
              const y2 = toNode.position.y + 40;

              return (
                <line
                  key={conn.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#8b5cf6" />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const nodeType = nodeTypes.find(t => t.id === node.type);
            const Icon = nodeType?.icon;
            
            return (
              <div
                key={node.id}
                className={`absolute ${nodeType?.color} text-white rounded-lg shadow-lg cursor-move ${
                  selectedNode?.id === node.id ? 'ring-4 ring-purple-400' : ''
                }`}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  width: 150,
                  zIndex: 10
                }}
                onMouseDown={(e) => handleNodeDrag(e, node)}
                onClick={() => setSelectedNode(node)}
              >
                <div className="p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span className="font-medium text-sm">{node.name}</span>
                  </div>
                  
                  {/* Input ports */}
                  {node.inputs.map((input, idx) => (
                    <div
                      key={input}
                      className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-current cursor-pointer hover:scale-150 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        completeConnection(node.id, input);
                      }}
                    />
                  ))}
                  
                  {/* Output ports */}
                  {node.outputs.map((output, idx) => (
                    <div
                      key={output}
                      className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-current cursor-pointer hover:scale-150 transition"
                      style={{ top: `${50 + idx * 20}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        startConnection(node.id, output);
                      }}
                    />
                  ))}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Empty State */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <GitBranch className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium">Start Building Logic</p>
                <p className="text-sm">Drag nodes from the left sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <h3 className="font-bold mb-4">Node Properties</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={selectedNode.name}
                onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
                className="input-field text-sm"
              />
            </div>

            {selectedNode.type === 'action' && (
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <textarea
                  value={selectedNode.data.code || ''}
                  onChange={(e) => updateNode(selectedNode.id, { 
                    data: { ...selectedNode.data, code: e.target.value }
                  })}
                  className="input-field font-mono text-sm h-32"
                  placeholder="Enter JavaScript code..."
                />
              </div>
            )}

            {selectedNode.type === 'condition' && (
              <div>
                <label className="block text-sm font-medium mb-1">Condition</label>
                <input
                  type="text"
                  value={selectedNode.data.condition || ''}
                  onChange={(e) => updateNode(selectedNode.id, { 
                    data: { ...selectedNode.data, condition: e.target.value }
                  })}
                  className="input-field font-mono text-sm"
                  placeholder="e.g., value > 10"
                />
              </div>
            )}

            {selectedNode.type === 'data' && (
              <div>
                <label className="block text-sm font-medium mb-1">Data Source</label>
                <input
                  type="text"
                  value={selectedNode.data.source || ''}
                  onChange={(e) => updateNode(selectedNode.id, { 
                    data: { ...selectedNode.data, source: e.target.value }
                  })}
                  className="input-field font-mono text-sm"
                  placeholder="e.g., localStorage.getItem('key')"
                />
              </div>
            )}

            {selectedNode.type === 'function' && (
              <div>
                <label className="block text-sm font-medium mb-1">Function Code</label>
                <textarea
                  value={selectedNode.data.code || ''}
                  onChange={(e) => updateNode(selectedNode.id, { 
                    data: { ...selectedNode.data, code: e.target.value }
                  })}
                  className="input-field font-mono text-sm h-48"
                  placeholder="Enter function code..."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeCraftEditor;
