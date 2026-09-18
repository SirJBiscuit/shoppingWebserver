import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Zap, MessageCircle, X } from 'lucide-react';

const VoiceAssistant = ({ onCommand, isOpen, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);

        if (event.results[current].isFinal) {
          processCommand(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    // Initialize Speech Synthesis
    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setResponse('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text) => {
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      synthRef.current.speak(utterance);
    }
  };

  const processCommand = (command) => {
    const lowerCommand = command.toLowerCase();
    let responseText = '';
    let action = null;

    // Add milk
    if (lowerCommand.includes('add') && lowerCommand.includes('milk')) {
      responseText = 'Adding milk to your shopping list';
      action = { type: 'add_item', item: 'milk' };
    }
    // What's expiring
    else if (lowerCommand.includes('expiring') || lowerCommand.includes('expire')) {
      responseText = 'Checking items expiring soon...';
      action = { type: 'check_expiring' };
    }
    // Find recipes
    else if (lowerCommand.includes('recipe') || lowerCommand.includes('cook')) {
      responseText = 'Let me find some recipes for you';
      action = { type: 'find_recipes' };
    }
    // How much spent
    else if (lowerCommand.includes('spent') || lowerCommand.includes('budget')) {
      responseText = 'Checking your spending...';
      action = { type: 'check_spending' };
    }
    // Start shopping
    else if (lowerCommand.includes('start shopping') || lowerCommand.includes('begin shopping')) {
      responseText = 'Starting shopping timer. Good luck!';
      action = { type: 'start_timer' };
    }
    // Complete list
    else if (lowerCommand.includes('complete') || lowerCommand.includes('finish')) {
      responseText = 'Marking list as complete';
      action = { type: 'complete_list' };
    }
    // Help
    else if (lowerCommand.includes('help')) {
      responseText = 'I can help you add items, check expiring food, find recipes, track spending, and more. Just ask!';
    }
    // Default
    else {
      responseText = `I heard: "${command}". Try saying "add milk" or "what's expiring"`;
    }

    setResponse(responseText);
    speak(responseText);

    // Add to conversation
    setConversation(prev => [
      ...prev,
      { type: 'user', text: command },
      { type: 'assistant', text: responseText }
    ]);

    // Execute action
    if (action && onCommand) {
      onCommand(action);
    }

    // Auto-stop listening after command
    setTimeout(() => stopListening(), 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-pink-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Mic className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Voice Assistant</h2>
                <p className="text-white/90 text-sm">Say a command to get started</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Microphone Control */}
          <div className="flex justify-center mb-6">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`relative p-8 rounded-full transition-all ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isListening ? (
                <MicOff className="w-12 h-12 text-white" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
              )}
            </button>
          </div>

          {/* Status */}
          <div className="text-center mb-6">
            <p className={`text-lg font-semibold ${
              isListening ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
            }`}>
              {isListening ? 'Listening...' : 'Click microphone to start'}
            </p>
            {isSpeaking && (
              <div className="flex items-center justify-center space-x-2 mt-2 text-primary-600 dark:text-primary-400">
                <Volume2 className="w-5 h-5 animate-pulse" />
                <span className="text-sm">Speaking...</span>
              </div>
            )}
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">You said:</p>
              <p className="text-gray-900 dark:text-white">{transcript}</p>
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
              <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-1">Assistant:</p>
              <p className="text-gray-900 dark:text-white">{response}</p>
            </div>
          )}

          {/* Conversation History */}
          {conversation.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-3 mb-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Conversation History
              </p>
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-gray-100 dark:bg-gray-700 ml-8'
                      : 'bg-primary-100 dark:bg-primary-900/30 mr-8'
                  }`}
                >
                  <p className="text-sm text-gray-900 dark:text-white">{msg.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Quick Commands */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Try saying:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Add milk to my list',
                'What\'s expiring this week?',
                'Find recipes with chicken',
                'How much did I spend?',
                'Start shopping timer',
                'Complete my list'
              ].map((command, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setTranscript(command);
                    processCommand(command);
                  }}
                  className="p-2 text-left text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-3 h-3 inline mr-1" />
                  "{command}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Powered by Web Speech API</span>
            </div>
            <button
              onClick={() => setConversation([])}
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              Clear History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
