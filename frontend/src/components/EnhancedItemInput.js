import React, { useState, useEffect, useRef } from 'react';
import { Plus, Mic, Camera, StickyNote, Tag, DollarSign, Hash, X } from 'lucide-react';

const EnhancedItemInput = ({ onAddItem, categories }) => {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef(null);

  // Auto-capitalize first letter
  const handleNameChange = (e) => {
    const value = e.target.value;
    if (value.length === 1) {
      setItemName(value.charAt(0).toUpperCase());
    } else {
      setItemName(value);
    }
  };

  // Quick add with Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  // Voice input
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Auto-capitalize
      const capitalized = transcript.charAt(0).toUpperCase() + transcript.slice(1);
      setItemName(capitalized);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      alert('Voice input error. Please try again.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleAddItem = () => {
    if (!itemName.trim()) return;

    const item = {
      item_name: itemName.trim(),
      quantity: parseInt(quantity) || 1,
      price: price ? parseFloat(price) : null,
      category: category || 'Uncategorized',
      notes: notes.trim() || null
    };

    onAddItem(item);
    
    // Reset form
    setItemName('');
    setQuantity('1');
    setPrice('');
    setNotes('');
    setShowAdvanced(false);
    
    // Focus back on input
    inputRef.current?.focus();
  };

  return (
    <div className="card">
      <div className="space-y-4">
        {/* Main Input Row */}
        <div className="flex items-center space-x-2">
          {/* Item Name */}
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={itemName}
              onChange={handleNameChange}
              onKeyPress={handleKeyPress}
              placeholder="Add item... (auto-capitalizes)"
              className="input w-full text-lg"
              autoFocus
            />
          </div>

          {/* Voice Input Button */}
          <button
            onClick={startVoiceInput}
            className={`p-3 rounded-lg transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Voice input"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-3 rounded-lg transition-all ${
              showAdvanced
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="More options"
          >
            <StickyNote className="w-5 h-5" />
          </button>

          {/* Add Button */}
          <button
            onClick={handleAddItem}
            disabled={!itemName.trim()}
            className="btn-primary px-6 py-3"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Quantity */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Hash className="w-4 h-4 mr-1" />
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input w-full"
                min="1"
                step="1"
              />
            </div>

            {/* Price */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="w-4 h-4 mr-1" />
                Price (Optional)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input w-full"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            {/* Category */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="w-4 h-4 mr-1" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input w-full"
              >
                <option value="">Select category...</option>
                {categories.map((cat, index) => (
                  <option key={index} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <StickyNote className="w-4 h-4 mr-1" />
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input w-full"
                placeholder="e.g., organic, brand preference..."
              />
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <span>💡 Press Enter to add</span>
            <span>🎤 Click mic for voice</span>
            <span>📝 Click note for options</span>
          </div>
          {showAdvanced && (
            <button
              onClick={() => setShowAdvanced(false)}
              className="text-primary-600 hover:text-primary-700 flex items-center"
            >
              <X className="w-3 h-3 mr-1" />
              Hide options
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedItemInput;
