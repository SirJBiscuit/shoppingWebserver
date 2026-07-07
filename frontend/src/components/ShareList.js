import React, { useState } from 'react';
import { Share2, Copy, Mail, MessageCircle, X, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ShareList = ({ list, items, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [shareMethod, setShareMethod] = useState(null);

  if (!isOpen || !list) return null;

  const generateShareableText = () => {
    let text = `📋 ${list.name}\n\n`;
    
    items.forEach((item, index) => {
      text += `${index + 1}. ${item.item_name}`;
      if (item.quantity > 1) {
        text += ` (${item.quantity}${item.unit ? ' ' + item.unit : ''})`;
      }
      text += '\n';
    });
    
    text += `\n✨ Shared from Shopping List App`;
    return text;
  };

  const generateShareableLink = () => {
    // In production, this would be a real shareable link
    const listData = {
      name: list.name,
      items: items.map(i => ({
        name: i.item_name,
        quantity: i.quantity,
        unit: i.unit,
      })),
    };
    
    const encoded = btoa(JSON.stringify(listData));
    return `${window.location.origin}/shared/${encoded}`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Shopping List: ${list.name}`);
    const body = encodeURIComponent(generateShareableText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaSMS = () => {
    const text = encodeURIComponent(generateShareableText());
    window.location.href = `sms:?body=${text}`;
  };

  const shareViaWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: list.name,
          text: generateShareableText(),
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  };

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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Share2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Share List
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List Preview */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {list.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {items.length} items
            </p>
          </div>

          {/* Share Methods */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Choose sharing method:
            </h3>

            {/* Copy Link */}
            <button
              onClick={() => {
                copyToClipboard(generateShareableLink());
                setShareMethod('link');
              }}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <Copy className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Copy Link
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Share via any app
                  </p>
                </div>
              </div>
              {copied && shareMethod === 'link' && (
                <Check className="w-5 h-5 text-green-600" />
              )}
            </button>

            {/* Copy Text */}
            <button
              onClick={() => {
                copyToClipboard(generateShareableText());
                setShareMethod('text');
              }}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <Copy className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Copy as Text
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Plain text format
                  </p>
                </div>
              </div>
              {copied && shareMethod === 'text' && (
                <Check className="w-5 h-5 text-green-600" />
              )}
            </button>

            {/* Email */}
            <button
              onClick={shareViaEmail}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-3"
            >
              <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">
                  Share via Email
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Send to email address
                </p>
              </div>
            </button>

            {/* SMS */}
            <button
              onClick={shareViaSMS}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-3"
            >
              <MessageCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">
                  Share via SMS
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Send as text message
                </p>
              </div>
            </button>

            {/* Web Share API */}
            {navigator.share && (
              <button
                onClick={shareViaWebShare}
                className="w-full p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center space-x-3"
              >
                <Share2 className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">More Options</p>
                  <p className="text-sm opacity-90">
                    Share using system dialog
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Collaborative Features (Future) */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Real-time Collaboration Coming Soon!
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Share lists with family and sync changes in real-time
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShareList;
