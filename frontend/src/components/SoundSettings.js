import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Upload, Trash2, X } from 'lucide-react';
import soundsAPI from '../services/soundsAPI';
import { useToast } from '../hooks/useToast';
import soundManager from '../utils/soundEffects';
import ConfirmModal from './ConfirmModal';

const SoundSettings = ({ isOpen, onClose, isAdmin }) => {
  const [sounds, setSounds] = useState([]);
  const [preferences, setPreferences] = useState({
    sound_enabled: false,
    sound_volume: 0.3,
    check_sound_id: null,
    uncheck_sound_id: null,
    pop_sound_id: null
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState('functions'); // 'functions' or 'library'
  const { success, error } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [soundsData, prefsData] = await Promise.all([
        soundsAPI.getAllSounds(),
        soundsAPI.getPreferences()
      ]);
      setSounds(soundsData);
      setPreferences(prefsData);
      
      // Update sound manager
      soundManager.setEnabled(prefsData.sound_enabled);
      soundManager.setVolume(prefsData.sound_volume);
    } catch (err) {
      console.error('Error loading sound data:', err);
      error('Failed to load sound settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSound = async () => {
    const newEnabled = !preferences.sound_enabled;
    try {
      await soundsAPI.updatePreferences({
        ...preferences,
        sound_enabled: newEnabled
      });
      setPreferences({ ...preferences, sound_enabled: newEnabled });
      soundManager.setEnabled(newEnabled);
      success(newEnabled ? 'Sounds enabled' : 'Sounds disabled');
    } catch (err) {
      error('Failed to update settings');
    }
  };

  const handleVolumeChange = async (newVolume) => {
    try {
      await soundsAPI.updatePreferences({
        ...preferences,
        sound_volume: newVolume
      });
      setPreferences({ ...preferences, sound_volume: newVolume });
      soundManager.setVolume(newVolume);
    } catch (err) {
      error('Failed to update volume');
    }
  };

  const handleSoundSelect = async (category, soundId) => {
    const key = `${category}_sound_id`;
    try {
      await soundsAPI.updatePreferences({
        ...preferences,
        [key]: soundId
      });
      setPreferences({ ...preferences, [key]: soundId });
      success('Sound updated');
    } catch (err) {
      error('Failed to update sound');
    }
  };

  const handlePlaySound = (soundPath) => {
    const audio = new Audio(soundPath);
    audio.volume = preferences.sound_volume;
    audio.play().catch(err => console.error('Play failed:', err));
  };

  const handleUpload = async (file, category = 'general') => {
    if (!file) return;

    const formData = new FormData();
    formData.append('sound', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('category', category);

    try {
      setUploading(true);
      await soundsAPI.uploadSound(formData);
      success(`Sound "${file.name}" uploaded successfully`);
      loadData();
    } catch (err) {
      error('Failed to upload sound');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e, category) => {
    const file = e.target.files[0];
    if (file) handleUpload(file, category);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // Check if it's an audio file
      if (file.type.startsWith('audio/')) {
        handleUpload(file, 'general');
      } else {
        error('Please upload an audio file (mp3, wav, ogg, m4a)');
      }
    }
  };

  const handleDelete = async (soundId) => {
    try {
      await soundsAPI.deleteSound(soundId);
      success('Sound deleted');
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      error('Failed to delete sound');
    }
  };

  if (!isOpen) return null;

  // Define available functions
  const soundFunctions = [
    { key: 'check', label: 'Item Checked', description: 'When checking off an item', icon: '✓' },
    { key: 'uncheck', label: 'Item Unchecked', description: 'When unchecking an item', icon: '○' },
    { key: 'pop', label: 'Item to Cart', description: 'When item flies to cart', icon: '🛒' }
  ];

  // Render content
  const renderContent = () => (
    <div className="p-6"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sound Settings</h2>
            {!isAdmin && onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          
          {/* Drag and Drop Overlay */}
          {dragActive && (
            <div className="fixed inset-0 bg-primary-500 bg-opacity-20 border-4 border-dashed border-primary-500 rounded-lg flex items-center justify-center z-50 pointer-events-none">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl">
                <Upload className="w-16 h-16 text-primary-600 mx-auto mb-4" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">Drop audio file here</p>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Supports: MP3, WAV, OGG, M4A</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Enable/Disable Sounds */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  {preferences.sound_enabled ? (
                    <Volume2 className="w-6 h-6 text-primary-600" />
                  ) : (
                    <VolumeX className="w-6 h-6 text-gray-400" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Sound Effects</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {preferences.sound_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleSound}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.sound_enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.sound_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Volume: {Math.round(preferences.sound_volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={preferences.sound_volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  disabled={!preferences.sound_enabled}
                />
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setViewMode('functions')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    viewMode === 'functions'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Functions
                </button>
                <button
                  onClick={() => setViewMode('library')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    viewMode === 'library'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Sound Library ({sounds.length})
                </button>
              </div>

              {/* Functions View */}
              {viewMode === 'functions' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Assign sounds to different app functions. Click on a function to select which sound plays.
                  </p>
                  {soundFunctions.map(func => {
                    const selectedSound = sounds.find(s => s.id === preferences[`${func.key}_sound_id`]);
                    return (
                      <div key={func.key} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{func.icon}</span>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">{func.label}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{func.description}</p>
                            </div>
                          </div>
                          {selectedSound && (
                            <button
                              onClick={() => handlePlaySound(selectedSound.file_path)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                              disabled={!preferences.sound_enabled}
                              title="Test sound"
                            >
                              <Play className="w-5 h-5 text-primary-600" />
                            </button>
                          )}
                        </div>
                        <select
                          value={preferences[`${func.key}_sound_id`] || ''}
                          onChange={(e) => handleSoundSelect(func.key, e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="">No sound</option>
                          {sounds.filter(s => s.category === func.key || s.category === 'general').map(sound => (
                            <option key={sound.id} value={sound.id}>
                              {sound.name} {sound.is_default ? '(Default)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sound Library View */}
              {viewMode === 'library' && (
                <div className="space-y-4">
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-900 dark:text-white font-medium mb-2">
                      Drag & drop audio files here
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      or click to browse (MP3, WAV, OGG, M4A)
                    </p>
                    <label className="btn-primary cursor-pointer inline-block">
                      Choose File
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleFileInput(e, 'general')}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    {uploading && (
                      <p className="text-sm text-primary-600 mt-2">Uploading...</p>
                    )}
                  </div>

                  {/* Sound List */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      All Sounds ({sounds.length})
                    </h3>
                    {sounds.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No sounds uploaded yet. Upload your first sound above!
                      </p>
                    ) : (
                      sounds.map(sound => (
                        <div
                          key={sound.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{sound.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {sound.category} {sound.is_default && '• Default'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePlaySound(sound.file_path)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-500 rounded"
                              disabled={!preferences.sound_enabled}
                              title="Play sound"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            {isAdmin && !sound.is_default && (
                              <button
                                onClick={() => setDeleteConfirm(sound)}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                                title="Delete sound"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
    </div>
  );

  // If in admin mode, render as embedded component
  if (isAdmin) {
    return (
      <>
        {renderContent()}
        <ConfirmModal
          isOpen={deleteConfirm !== null}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          title="Delete Sound"
          message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmStyle="danger"
        />
      </>
    );
  }

  // Otherwise render as modal
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {renderContent()}
        </div>
      </div>
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        title="Delete Sound"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmStyle="danger"
      />
    </>
  );
};

export default SoundSettings;
