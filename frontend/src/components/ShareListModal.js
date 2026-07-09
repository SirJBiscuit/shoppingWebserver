import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, Users, Mail, Link as LinkIcon, UserPlus, Trash2 } from 'lucide-react';

const ShareListModal = ({ isOpen, onClose, list, onShare, onRemoveUser }) => {
  const [shareMethod, setShareMethod] = useState('link'); // 'link' or 'email'
  const [email, setEmail] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);

  useEffect(() => {
    if (list) {
      // Generate share link
      const link = `${window.location.origin}/shared/${list.id}`;
      setShareLink(link);
      
      // Load shared users (mock data for now)
      setSharedUsers(list.shared_with || []);
    }
  }, [list]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareByEmail = async () => {
    if (!email) return;
    
    try {
      await onShare({ method: 'email', email, listId: list.id });
      setEmail('');
      alert(`Invitation sent to ${email}`);
    } catch (error) {
      alert('Failed to send invitation');
    }
  };

  if (!isOpen || !list) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <Share2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Share List</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{list.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Share Method Tabs */}
          <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShareMethod('link')}
              className={`px-4 py-2 font-medium transition-colors ${
                shareMethod === 'link'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LinkIcon className="w-4 h-4 inline mr-2" />
              Share Link
            </button>
            <button
              onClick={() => setShareMethod('email')}
              className={`px-4 py-2 font-medium transition-colors ${
                shareMethod === 'email'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4 inline mr-2" />
              Invite by Email
            </button>
          </div>

          {/* Share Link */}
          {shareMethod === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Share Link
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="input-field flex-1 font-mono text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="btn-primary flex items-center"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Anyone with this link can view and edit this list
                </p>
              </div>

              {/* QR Code placeholder */}
              <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <div className="w-48 h-48 mx-auto bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <div className="text-center">
                    <LinkIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">QR Code</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Coming Soon</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Invite */}
          {shareMethod === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="input-field flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleShareByEmail()}
                  />
                  <button
                    onClick={handleShareByEmail}
                    disabled={!email}
                    className="btn-primary flex items-center disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Invite
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  They'll receive an email invitation to collaborate on this list
                </p>
              </div>
            </div>
          )}

          {/* Shared Users */}
          {sharedUsers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Shared With ({sharedUsers.length})
              </h3>
              <div className="space-y-2">
                {sharedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveUser(user.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Permissions Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Collaboration Features
            </h4>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>✓ Real-time updates when others edit</li>
              <li>✓ See who's currently viewing</li>
              <li>✓ Add, edit, and check off items</li>
              <li>✓ Chat within the list</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button onClick={onClose} className="btn-secondary w-full">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareListModal;
