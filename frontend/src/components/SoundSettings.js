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

  const handleUpload = async (e, category) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('sound', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('category', category);

    try {
      setUploading(true);
      await soundsAPI.uploadSound(formData);
      success('Sound uploaded successfully');
      loadData();
    } catch (err) {
      error('Failed to upload sound');
    } finally {
      setUploading(false);
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

  // Render content
  const renderContent = () => (
    <div className="p-6">
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

              {/* Check Sound Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Check Sound</h3>
                  {isAdmin && (
                    <label className="btn-secondary text-sm cursor-pointer">
                      <Upload className="w-4 h-4 inline mr-1" />
                      Upload
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleUpload(e, 'check')}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {sounds.filter(s => s.category === 'check').map(sound => (
                    <div
                      key={sound.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        preferences.check_sound_id === sound.id
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                      }`}
                      onClick={() => handleSoundSelect('check', sound.id)}
                    >
                      <span className="text-gray-900 dark:text-white">{sound.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySound(sound.file_path);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          disabled={!preferences.sound_enabled}
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        {isAdmin && !sound.is_default && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(sound);
                            }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pop Sound Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Pop Sound (Item to Cart)</h3>
                  {isAdmin && (
                    <label className="btn-secondary text-sm cursor-pointer">
                      <Upload className="w-4 h-4 inline mr-1" />
                      Upload
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleUpload(e, 'pop')}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {sounds.filter(s => s.category === 'pop').map(sound => (
                    <div
                      key={sound.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        preferences.pop_sound_id === sound.id
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                      }`}
                      onClick={() => handleSoundSelect('pop', sound.id)}
                    >
                      <span className="text-gray-900 dark:text-white">{sound.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySound(sound.file_path);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          disabled={!preferences.sound_enabled}
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        {isAdmin && !sound.is_default && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(sound);
                            }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uncheck Sound Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Uncheck Sound</h3>
                  {isAdmin && (
                    <label className="btn-secondary text-sm cursor-pointer">
                      <Upload className="w-4 h-4 inline mr-1" />
                      Upload
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleUpload(e, 'uncheck')}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {sounds.filter(s => s.category === 'uncheck').map(sound => (
                    <div
                      key={sound.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        preferences.uncheck_sound_id === sound.id
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                      }`}
                      onClick={() => handleSoundSelect('uncheck', sound.id)}
                    >
                      <span className="text-gray-900 dark:text-white">{sound.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySound(sound.file_path);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          disabled={!preferences.sound_enabled}
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        {isAdmin && !sound.is_default && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(sound);
                            }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Sound File Location Info */}
              {isAdmin && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Sound File Storage</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-400">
                    <strong>Location:</strong> <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">/backend/public/sounds/</code>
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-400 mt-2">
                    Uploaded sounds are stored on the server and accessible at <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">/sounds/filename.mp3</code>
                  </p>
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
