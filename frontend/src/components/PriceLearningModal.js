import React, { useState, useRef } from 'react';
import { Camera, DollarSign, MapPin, Package, Save, X, Sparkles, TrendingUp, Award } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { XP_REWARDS } from './LevelingSystem';

const PriceLearningModal = ({ isOpen, onClose, onSubmit, storeLocation = null, onAddToList = null }) => {
  const { success, error: showError, info } = useToast();
  const [selectedStore, setSelectedStore] = useState(storeLocation?.name || '');
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
  const [addToList, setAddToList] = useState(true); // Default to true
  const [keepScanning, setKeepScanning] = useState(true); // Keep modal open for continuous scanning
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
        const previewUrl = URL.createObjectURL(blob);
        setImagePreview(previewUrl);
        stopCamera();
        
        // Try to detect price from image using OCR
        detectPriceFromImage(blob);
        
        info('Photo captured! Detecting price...');
      }, 'image/jpeg', 0.8);
    }
  };

  // Detect price from image using OCR (Tesseract.js)
  const detectPriceFromImage = async (imageBlob) => {
    try {
      // Simple regex to find price patterns like $3.99, 3.99, etc.
      // For now, we'll use a basic approach
      // TODO: Integrate Tesseract.js for better OCR
      info('💡 Tip: Enter the price manually for now. OCR coming soon!');
    } catch (err) {
      console.error('Error detecting price:', err);
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
      
      // Add selected store
      if (selectedStore) {
        submitData.append('store_name', selectedStore);
      }
      
      // Add image if captured
      if (image) {
        submitData.append('image', image);
      }
      
      await onSubmit(submitData);
      
      // Add to shopping list if checkbox is checked
      if (addToList && onAddToList) {
        await onAddToList({
          itemName: formData.item_name,
          quantity: 1,
          price: parseFloat(formData.price),
          category: '',
          notes: formData.notes
        });
      }
      
      // Award XP for contributing
      if (window.addXP) {
        window.addXP(XP_REWARDS.PRICE_LEARNED, `Learned price for ${formData.item_name}`);
      }
      
      const message = addToList && onAddToList 
        ? `Price learned & added to list! +${XP_REWARDS.PRICE_LEARNED} XP`
        : `Price learned for ${formData.item_name}! +${XP_REWARDS.PRICE_LEARNED} XP`;
      success(message);
      
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
      
      // Close modal only if keepScanning is false
      if (!keepScanning) {
        onClose();
      } else {
        info('Ready for next item! 🚀');
      }
      
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
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="btn-primary flex items-center justify-center flex-1"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Take Photo of Price Tag
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary flex items-center justify-center flex-1"
                    >
                      <Package className="w-5 h-5 mr-2" />
                      Upload Photo
                    </button>
                  </div>
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    📸 Snap the price tag for quick entry • Barcode scanning coming soon!
                  </p>
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

            {/* Store Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🏪 Store *
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Select a store...</option>
                <option value="Walmart">Walmart</option>
                <option value="Target">Target</option>
                <option value="Kroger">Kroger</option>
                <option value="Aldi">Aldi</option>
                <option value="Costco">Costco</option>
                <option value="Whole Foods">Whole Foods</option>
                <option value="Safeway">Safeway</option>
                <option value="Publix">Publix</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                💡 Store will stay selected for quick scanning
              </p>
            </div>

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

            {/* Price (Simplified - single field) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="input-field pl-8 text-lg font-semibold"
                  placeholder="3.99"
                  required
                  autoFocus={!image}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                💡 Tip: Take a photo of the price tag for automatic detection
              </p>
            </div>

            {/* Optional: Aisle Information (Collapsible) */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <span className="mr-2">📍</span>
                Optional: Add Aisle Info
                <span className="ml-2 text-xs text-gray-500">(click to expand)</span>
              </summary>
              <div className="mt-3 space-y-3 pl-6 border-l-2 border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Aisle Number
                    </label>
                    <input
                      type="text"
                      value={formData.aisle_number}
                      onChange={(e) => setFormData({ ...formData, aisle_number: e.target.value })}
                      className="input-field text-sm"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Aisle Name
                    </label>
                    <input
                      type="text"
                      value={formData.aisle_name}
                      onChange={(e) => setFormData({ ...formData, aisle_name: e.target.value })}
                      className="input-field text-sm"
                      placeholder="Produce"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-field text-sm"
                    rows="2"
                    placeholder="Any additional details..."
                  />
                </div>
              </div>
            </details>

            {/* Options */}
            <div className="space-y-2">
              {/* Add to Shopping List Checkbox */}
              {onAddToList && (
                <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
                  <input
                    type="checkbox"
                    id="addToList"
                    checked={addToList}
                    onChange={(e) => setAddToList(e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="addToList" className="ml-2 text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                    🛒 Add this item to my shopping list
                  </label>
                </div>
              )}

              {/* Keep Scanning Checkbox */}
              <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
                <input
                  type="checkbox"
                  id="keepScanning"
                  checked={keepScanning}
                  onChange={(e) => setKeepScanning(e.target.checked)}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="keepScanning" className="ml-2 text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                  🔄 Keep scanning more items at this store
                </label>
              </div>
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
