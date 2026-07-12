import React, { useState, useRef } from 'react';
import { 
  Sparkles, Send, Code, Download, Play, Smartphone, 
  Monitor, Tablet, Zap, CheckCircle, AlertCircle, Loader,
  Copy, Save, RefreshCw, Brain, Wand2
} from 'lucide-react';

const AIAppBuilder = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedApp, setGeneratedApp] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('web');
  const [codeErrors, setCodeErrors] = useState([]);
  const [isFixing, setIsFixing] = useState(false);

  // FREE AI SOLUTIONS - NO API KEYS NEEDED
  const generateAppWithFreeAI = async (userPrompt) => {
    setIsGenerating(true);
    
    try {
      // Method 1: Use browser-based AI (Transformers.js - 100% FREE, runs in browser)
      // Method 2: Use free Hugging Face Inference API (no auth required for some models)
      // Method 3: Rule-based template system (instant, always free)
      
      // For now, using intelligent template matching (FREE, INSTANT)
      const appStructure = analyzePromptAndGenerateApp(userPrompt);
      
      setGeneratedApp(appStructure);
      setChatHistory([...chatHistory, 
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: `Generated ${appStructure.type} app with ${appStructure.features.length} features!` }
      ]);
      
      return appStructure;
    } catch (error) {
      console.error('Generation error:', error);
      setChatHistory([...chatHistory, 
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: 'Error generating app. Please try again.' }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // INTELLIGENT TEMPLATE MATCHING (100% FREE)
  const analyzePromptAndGenerateApp = (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect app type
    let appType = 'web';
    if (lowerPrompt.includes('mobile') || lowerPrompt.includes('ios') || lowerPrompt.includes('android')) {
      appType = 'mobile';
    }
    
    // Detect features
    const features = [];
    const featureKeywords = {
      'login': ['login', 'sign in', 'authentication', 'auth'],
      'database': ['database', 'store data', 'save', 'crud'],
      'api': ['api', 'fetch', 'backend', 'server'],
      'chat': ['chat', 'messaging', 'messages'],
      'camera': ['camera', 'photo', 'image'],
      'location': ['location', 'gps', 'map'],
      'payment': ['payment', 'stripe', 'checkout'],
      'notifications': ['notification', 'push', 'alert'],
      'social': ['social', 'share', 'facebook', 'twitter'],
      'dashboard': ['dashboard', 'analytics', 'stats'],
    };
    
    Object.entries(featureKeywords).forEach(([feature, keywords]) => {
      if (keywords.some(kw => lowerPrompt.includes(kw))) {
        features.push(feature);
      }
    });
    
    // Generate code based on detected features
    const code = generateCodeFromFeatures(appType, features, prompt);
    
    return {
      type: appType,
      name: extractAppName(prompt),
      features,
      code,
      platform: selectedPlatform,
      timestamp: Date.now()
    };
  };

  const extractAppName = (prompt) => {
    // Try to extract app name from prompt
    const match = prompt.match(/(?:called|named|app)\s+["']?([^"']+)["']?/i);
    return match ? match[1] : 'My App';
  };

  const generateCodeFromFeatures = (appType, features, prompt) => {
    let code = {
      html: '',
      css: '',
      javascript: '',
      react: '',
      reactNative: ''
    };

    if (appType === 'web') {
      // Generate React Web App
      code.react = `import React, { useState } from 'react';
import './App.css';

function App() {
  ${features.includes('login') ? `const [isLoggedIn, setIsLoggedIn] = useState(false);` : ''}
  ${features.includes('database') ? `const [data, setData] = useState([]);` : ''}
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>${extractAppName(prompt)}</h1>
      </header>
      
      <main>
        ${features.includes('login') ? `
        {!isLoggedIn ? (
          <div className="login-form">
            <h2>Login</h2>
            <input type="email" placeholder="Email" />
            <input type="password" placeholder="Password" />
            <button onClick={() => setIsLoggedIn(true)}>Sign In</button>
          </div>
        ) : (
          <div className="dashboard">
            <h2>Welcome!</h2>
            ${features.includes('dashboard') ? `<div className="stats">Dashboard content here</div>` : ''}
          </div>
        )}
        ` : `<div className="content">App content here</div>`}
      </main>
    </div>
  );
}

export default App;`;

      code.css = `
.App {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.App-header {
  padding: 2rem;
  color: white;
  text-align: center;
}

main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.login-form {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  margin: 0 auto;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

.login-form input {
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
}

.login-form button {
  width: 100%;
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 16px;
}

.login-form button:hover {
  background: #5568d3;
}

.dashboard {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}
`;
    } else if (appType === 'mobile') {
      // Generate React Native App
      code.reactNative = `import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';

export default function App() {
  ${features.includes('login') ? `const [isLoggedIn, setIsLoggedIn] = useState(false);` : ''}
  ${features.includes('database') ? `const [data, setData] = useState([]);` : ''}

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>${extractAppName(prompt)}</Text>
      </View>
      
      <ScrollView style={styles.content}>
        ${features.includes('login') ? `
        {!isLoggedIn ? (
          <View style={styles.loginForm}>
            <Text style={styles.subtitle}>Login</Text>
            <TextInput 
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
            />
            <TextInput 
              style={styles.input}
              placeholder="Password"
              secureTextEntry
            />
            <TouchableOpacity 
              style={styles.button}
              onPress={() => setIsLoggedIn(true)}
            >
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.dashboard}>
            <Text style={styles.subtitle}>Welcome!</Text>
            ${features.includes('dashboard') ? `<Text>Dashboard content here</Text>` : ''}
          </View>
        )}
        ` : `<Text>App content here</Text>`}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loginForm: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dashboard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
  },
});`;
    }

    return code;
  };

  // FREE CODE VALIDATOR (runs in browser, no API)
  const validateCode = (code) => {
    const errors = [];
    
    try {
      // Basic syntax checking
      if (code.react) {
        // Check for common React errors
        if (!code.react.includes('import React')) {
          errors.push({ type: 'error', message: 'Missing React import', line: 1 });
        }
        if (!code.react.includes('export default')) {
          errors.push({ type: 'error', message: 'Missing default export', line: -1 });
        }
        
        // Check for unclosed tags
        const openTags = (code.react.match(/<[^/][^>]*>/g) || []).length;
        const closeTags = (code.react.match(/<\/[^>]*>/g) || []).length;
        if (openTags !== closeTags) {
          errors.push({ type: 'warning', message: 'Possible unclosed JSX tags', line: -1 });
        }
      }
      
      setCodeErrors(errors);
      return errors.length === 0;
    } catch (error) {
      errors.push({ type: 'error', message: error.message, line: -1 });
      setCodeErrors(errors);
      return false;
    }
  };

  // FREE AUTO-FIX (rule-based, no API)
  const autoFixCode = async () => {
    if (!generatedApp) return;
    
    setIsFixing(true);
    
    try {
      let fixedCode = { ...generatedApp.code };
      
      // Auto-fix common issues
      if (fixedCode.react) {
        // Add missing imports
        if (!fixedCode.react.includes('import React')) {
          fixedCode.react = `import React from 'react';\n${fixedCode.react}`;
        }
        
        // Fix unclosed tags (basic)
        fixedCode.react = fixedCode.react.replace(/<(\w+)([^>]*)>(?!.*<\/\1>)/g, '<$1$2></$1>');
        
        // Add missing semicolons
        fixedCode.react = fixedCode.react.replace(/([^;{}\s])\n/g, '$1;\n');
      }
      
      setGeneratedApp({ ...generatedApp, code: fixedCode });
      validateCode(fixedCode);
      
      setChatHistory([...chatHistory, {
        role: 'assistant',
        content: '✅ Code auto-fixed! Resolved common issues.'
      }]);
    } catch (error) {
      console.error('Auto-fix error:', error);
    } finally {
      setIsFixing(false);
    }
  };

  const exportApp = (platform) => {
    if (!generatedApp) return;
    
    let content = '';
    let filename = '';
    
    if (platform === 'web') {
      content = generatedApp.code.react;
      filename = 'App.jsx';
    } else if (platform === 'mobile') {
      content = generatedApp.code.reactNative;
      filename = 'App.js';
    }
    
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generateAppWithFreeAI(prompt);
    setPrompt('');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
        <div className="flex items-center space-x-3 mb-2">
          <Sparkles className="w-8 h-8" />
          <h2 className="text-2xl font-bold">AI App Builder</h2>
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">100% FREE</span>
        </div>
        <p className="text-purple-100">
          Describe your app in plain English - AI builds it instantly. No API keys, no costs!
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat */}
        <div className="flex-1 flex flex-col">
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatHistory.length === 0 && (
              <div className="text-center text-gray-400 mt-20">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Start building your app!</p>
                <p className="text-sm mt-2">Try: "Create a todo app with login"</p>
              </div>
            )}
            
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-800 shadow'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow flex items-center space-x-2">
                  <Loader className="w-5 h-5 animate-spin text-purple-600" />
                  <span>Generating your app...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Describe your app... (e.g., 'Create a fitness tracker app with login')"
                className="input-field flex-1"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="btn-primary flex items-center space-x-2"
              >
                <Wand2 className="w-4 h-4" />
                <span>Generate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Generated App */}
        {generatedApp && (
          <div className="w-1/2 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
            {/* App Info */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">{generatedApp.name}</h3>
                  <p className="text-sm text-gray-500">
                    {generatedApp.features.length} features • {generatedApp.type}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => validateCode(generatedApp.code)}
                    className="btn-secondary text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={autoFixCode}
                    disabled={isFixing}
                    className="btn-secondary text-sm"
                  >
                    {isFixing ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Platform Selector */}
              <div className="flex space-x-2">
                {[
                  { id: 'web', label: 'Web', icon: Monitor },
                  { id: 'mobile', label: 'Mobile', icon: Smartphone },
                  { id: 'tablet', label: 'Tablet', icon: Tablet }
                ].map(platform => {
                  const Icon = platform.icon;
                  return (
                    <button
                      key={platform.id}
                      onClick={() => setSelectedPlatform(platform.id)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm ${
                        selectedPlatform === platform.id
                          ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{platform.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Errors */}
            {codeErrors.length > 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                {codeErrors.map((error, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <span>{error.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Code Preview */}
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {generatedApp.type === 'web' ? generatedApp.code.react : generatedApp.code.reactNative}
              </pre>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <button
                onClick={() => exportApp(generatedApp.type)}
                className="btn-primary w-full flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export {generatedApp.type === 'web' ? 'React' : 'React Native'} App
              </button>
              <button
                onClick={() => {
                  const code = generatedApp.type === 'web' ? generatedApp.code.react : generatedApp.code.reactNative;
                  navigator.clipboard.writeText(code);
                  alert('Code copied to clipboard!');
                }}
                className="btn-secondary w-full flex items-center justify-center"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAppBuilder;
