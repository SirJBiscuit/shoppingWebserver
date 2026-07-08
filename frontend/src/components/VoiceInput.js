import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceInput = ({ onResult, isOpen, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setTranscript(prev => prev + final);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && recognitionRef.current) {
      // Stop any existing recognition before starting
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if not started
      }
      // Small delay to ensure previous recognition is stopped
      setTimeout(() => {
        startListening();
      }, 100);
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
    };
  }, [isOpen]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        setInterimTranscript('');
        setError(null);
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        if (error.message && error.message.includes('already started')) {
          // Recognition is already running, just update state
          setIsListening(true);
        } else {
          setError('Failed to start voice recognition. Please try again.');
        }
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleDone = () => {
    stopListening();
    if (transcript.trim()) {
      onResult(transcript.trim());
    }
    onClose();
  };

  const handleClear = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="card max-w-lg w-full"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Voice Input
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isListening ? 'Listening... Speak now' : 'Click the microphone to start'}
            </p>
          </div>

          {/* Microphone Animation */}
          <div className="flex justify-center mb-6">
            <motion.button
              onClick={isListening ? stopListening : startListening}
              className={`relative p-8 rounded-full ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-primary-600 hover:bg-primary-700'
              } transition-colors`}
              whileTap={{ scale: 0.95 }}
            >
              {isListening ? (
                <>
                  <MicOff className="w-12 h-12 text-white" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-red-500"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </>
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </motion.button>
          </div>

          {/* Transcript Display */}
          <div className="mb-6">
            <div className="min-h-32 max-h-48 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {transcript || interimTranscript ? (
                <p className="text-gray-900 dark:text-white">
                  {transcript}
                  <span className="text-gray-400 dark:text-gray-500">
                    {interimTranscript}
                  </span>
                </p>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 text-center">
                  Your speech will appear here...
                </p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Voice Commands Help */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                  Voice Commands
                </p>
                <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                  <li>• "Add milk" - Adds milk to list</li>
                  <li>• "Add 2 pounds of chicken" - Adds with quantity</li>
                  <li>• "Add eggs, bread, and butter" - Adds multiple items</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleClear}
              disabled={!transcript}
              className="btn-secondary flex-1"
            >
              Clear
            </button>
            <button
              onClick={handleDone}
              disabled={!transcript}
              className="btn-primary flex-1"
            >
              Done
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            💡 Works best in Chrome, Edge, or Safari
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper function to parse voice input into items
export const parseVoiceInput = (text) => {
  const items = [];
  
  // Remove common filler words
  text = text.toLowerCase()
    .replace(/^(add|get|buy|need)\s+/i, '')
    .replace(/\s+(please|thanks|thank you)$/i, '');

  // Split by common separators
  const parts = text.split(/\s+and\s+|\s*,\s*/);

  parts.forEach(part => {
    part = part.trim();
    if (!part) return;

    // Try to extract quantity and unit
    const quantityMatch = part.match(/^(\d+(?:\.\d+)?)\s*(\w+)?\s+(.+)$/);
    
    if (quantityMatch) {
      const [, quantity, unit, name] = quantityMatch;
      items.push({
        name: name.trim(),
        quantity: parseFloat(quantity),
        unit: unit || '',
      });
    } else {
      items.push({
        name: part,
        quantity: 1,
        unit: '',
      });
    }
  });

  return items;
};

export default VoiceInput;
