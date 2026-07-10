import React, { useState, useRef } from 'react';
import { Camera, DollarSign, MapPin, Package, Save, X, Sparkles, TrendingUp, Award } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { XP_REWARDS } from './LevelingSystem';

const PriceLearningModal = ({ isOpen, onClose, onSubmit, storeLocation = null }) => {
  const { success, error: showError, info } = useToast();
  const [formData, setFormData] = useState({
    item_name: '',
    price: '',
    sale_price: '',
    unit: '',
    size: '',
    brand: '',
    aisle_number: '',
    aisle_name: '',
    notes: '',
    on_sale: false
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setUseCamera(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      showError('Could not access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setUseCamera(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        setImage(blob);
        setImagePreview(URL.createObjectURL(blob));
        stopCamera();
        info('Photo captured! You can retake or continue.');
      }, 'image/jpeg', 0.8);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError('Image must be less than 5MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      info('Image uploaded! Fill in the details.');
    }
  };

  // Submit price data
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.item_name.trim() || !formData.price) {
      showError('Item name and price are required');
      return;
    }

    setLoading(true);
    
    try {
      const submitData = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });
      
      // Add store location if available
      if (storeLocation) {
        submitData.append('store_location_id', storeLocation.id);
      }
      
      // Add image if captured
      if (image) {
        submitData.append('image', image);
      }
      
      await onSubmit(submitData);
      
      // Award XP for contributing
      if (window.addXP) {
        window.addXP(XP_REWARDS.PRICE_LEARNED, `Learned price for ${formData.item_name}`);
      }
      
      success(`Price learned for ${formData.item_name}! +${XP_REWARDS.PRICE_LEARNED} XP`);
      
      // Reset form
      setFormData({
        item_name: '',
        price: '',
        sale_price: '',
        unit: '',
        size: '',
        brand: '',
        aisle_number: '',
        aisle_name: '',
        notes: '',
        on_sale: false
      });
      setImage(null);
      setImagePreview(null);
      
    } catch (err) {
      console.error('Error submitting price:', err);
      showError('Failed to save price. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-yellow-500" />
                Price Learning Tool
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Help improve prices and earn XP! 🎯
              </p>
            </div>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* XP Reward Badge */}
          <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Earn +{XP_REWARDS.PRICE_LEARNED} XP per submission
                </span>
              </div>
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Camera Section */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center text-gray-900 dark:text-white">
                <Camera className="w-4 h-4 mr-2" />
                Take a Photo (Optional)
              </h3>
              
              {!useCamera && !imagePreview && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="btn-primary flex items-center justify-center"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Use Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary flex items-center justify-center"
                  >
                    <Package className="w-5 h-5 mr-2" />
                    Upload Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {useCamera && (
                <div className="space-y-2">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="btn-primary flex-1"
                    >
                      📸 Capture
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {imagePreview && (
                <div className="space-y-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="btn-secondary w-full"
                  >
                    Remove Photo
                  </button>
                </div>
              )}
              
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Store Location */}
            {storeLocation && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
                <div className="flex items-center text-sm">
                  <MapPin className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {storeLocation.name}
                  </span>
                </div>
              </div>
            )}

            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="input-field"
                placeholder="e.g., Organic Bananas"
                required
              />
            </div>

            {/* Price and Sale Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Regular Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input-field pl-8"
                    placeholder="3.99"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sale Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value, on_sale: !!e.target.value })}
                    className="input-field pl-8"
                    placeholder="2.99"
                  />
                </div>
              </div>
            </div>

            {/* Size, Unit, Brand */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Size
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="input-field"
                  placeholder="1 lb"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select</option>
                  <option value="lb">lb</option>
                  <option value="oz">oz</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="each">each</option>
                  <option value="bunch">bunch</option>
                  <option value="bag">bag</option>
                  <option value="box">box</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="input-field"
                  placeholder="Dole"
                />
              </div>
            </div>

            {/* Aisle Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Aisle Number
                </label>
                <input
                  type="text"
                  value={formData.aisle_number}
                  onChange={(e) => setFormData({ ...formData, aisle_number: e.target.value })}
                  className="input-field"
                  placeholder="5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Aisle Name
                </label>
                <input
                  type="text"
                  value={formData.aisle_name}
                  onChange={(e) => setFormData({ ...formData, aisle_name: e.target.value })}
                  className="input-field"
                  placeholder="Produce"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-field"
                rows="2"
                placeholder="Any additional details..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center"
              >
                <Save className="w-5 h-5 mr-2" />
                {loading ? 'Saving...' : `Save & Earn ${XP_REWARDS.PRICE_LEARNED} XP`}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Define XP reward if not already defined
if (!XP_REWARDS.PRICE_LEARNED) {
  XP_REWARDS.PRICE_LEARNED = 15;
}

export default PriceLearningModal;
