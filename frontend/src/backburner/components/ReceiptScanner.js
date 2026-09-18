import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Loader, FileText } from 'lucide-react';

const ReceiptScanner = ({ isOpen, onClose, onItemsExtracted }) => {
  const [image, setImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        processReceipt(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processReceipt = async (imageData) => {
    setProcessing(true);
    
    // Simulate OCR processing (in production, use Tesseract.js or cloud OCR)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock extracted items
    const mockItems = [
      { name: 'Milk', price: 3.99, quantity: 1, category: 'Dairy' },
      { name: 'Bread', price: 2.49, quantity: 2, category: 'Bakery' },
      { name: 'Eggs', price: 4.29, quantity: 1, category: 'Dairy' },
      { name: 'Apples', price: 5.99, quantity: 1, category: 'Produce' },
      { name: 'Chicken Breast', price: 12.99, quantity: 1, category: 'Meat' }
    ];
    
    setExtractedItems(mockItems);
    setProcessing(false);
  };

  const handleConfirm = () => {
    onItemsExtracted(extractedItems);
    handleClose();
  };

  const handleClose = () => {
    setImage(null);
    setExtractedItems([]);
    setProcessing(false);
    onClose();
  };

  const removeItem = (index) => {
    setExtractedItems(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Receipt Scanner</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Scan or upload your receipt</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {!image ? (
            <div className="space-y-4">
              {/* Upload Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="font-semibold text-gray-900 dark:text-white">Take Photo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Use your camera</p>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="font-semibold text-gray-900 dark:text-white">Upload Image</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">From your device</p>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Instructions */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Tips for best results:</h3>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>• Ensure receipt is flat and well-lit</li>
                  <li>• Capture entire receipt in frame</li>
                  <li>• Avoid shadows and glare</li>
                  <li>• Hold camera steady</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative">
                <img
                  src={image}
                  alt="Receipt"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                />
                {processing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <Loader className="w-12 h-12 text-white animate-spin mx-auto mb-3" />
                      <p className="text-white font-semibold">Processing receipt...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Extracted Items */}
              {extractedItems.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Extracted Items ({extractedItems.length})
                    </h3>
                    <button
                      onClick={() => setImage(null)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Scan Another
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {extractedItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                          <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                            <span>Qty: {item.quantity}</span>
                            <span>•</span>
                            <span>${item.price.toFixed(2)}</span>
                            <span>•</span>
                            <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                              {item.category}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${extractedItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {extractedItems.length > 0 && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 btn-primary flex items-center justify-center"
              >
                <Check className="w-5 h-5 mr-2" />
                Add {extractedItems.length} Items
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptScanner;
