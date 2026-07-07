import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Scan, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BarcodeScanner = ({ isOpen, onClose, onScan }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [manualEntry, setManualEntry] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen && scanning) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, scanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      
      setError(null);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleManualSubmit = async () => {
    if (!manualEntry.trim()) return;
    
    await lookupBarcode(manualEntry);
  };

  const lookupBarcode = async (barcode) => {
    try {
      // Using Open Food Facts API for product lookup
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        const product = {
          barcode: barcode,
          name: data.product.product_name || 'Unknown Product',
          brand: data.product.brands || '',
          image: data.product.image_url || '',
          quantity: data.product.quantity || '',
          categories: data.product.categories_tags || [],
        };
        
        setResult(product);
        return product;
      } else {
        // Product not found, allow manual entry
        setResult({
          barcode: barcode,
          name: '',
          notFound: true,
        });
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      setError('Failed to lookup barcode. Please try again.');
    }
  };

  const handleAddToList = () => {
    if (result) {
      onScan({
        name: result.name || manualEntry,
        barcode: result.barcode,
        image: result.image,
        brand: result.brand,
      });
      
      setResult(null);
      setManualEntry('');
      onClose();
    }
  };

  // Simulated barcode detection (in production, use a library like quagga.js or zxing)
  const simulateScan = () => {
    // Generate a random barcode for demo
    const demoBarcode = Math.floor(Math.random() * 9000000000000) + 1000000000000;
    lookupBarcode(demoBarcode.toString());
    setScanning(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="card max-w-2xl w-full mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Scan className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Barcode Scanner
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Camera View */}
          {scanning && !result && (
            <div className="relative mb-6">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 bg-black rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-4 border-primary-500 w-64 h-32 rounded-lg"></div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white text-sm bg-black bg-opacity-50 inline-block px-4 py-2 rounded-full">
                  Position barcode within the frame
                </p>
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              {result.notFound ? (
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-gray-900 dark:text-white font-medium mb-2">
                    Product Not Found
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Barcode: {result.barcode}
                  </p>
                  <input
                    type="text"
                    value={manualEntry}
                    onChange={(e) => setManualEntry(e.target.value)}
                    placeholder="Enter product name manually"
                    className="input-field"
                  />
                </div>
              ) : (
                <div className="flex items-start space-x-4">
                  {result.image && (
                    <img
                      src={result.image}
                      alt={result.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {result.name}
                        </h3>
                        {result.brand && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {result.brand}
                          </p>
                        )}
                      </div>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Barcode: {result.barcode}
                    </p>
                    {result.quantity && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Size: {result.quantity}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Manual Entry */}
          {!scanning && !result && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or enter barcode manually:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={manualEntry}
                  onChange={(e) => setManualEntry(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                  placeholder="Enter barcode number"
                  className="input-field flex-1"
                />
                <button
                  onClick={handleManualSubmit}
                  className="btn-primary"
                >
                  Lookup
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {!scanning && !result && (
              <button
                onClick={() => setScanning(true)}
                className="btn-primary flex-1 flex items-center justify-center"
              >
                <Camera className="w-5 h-5 mr-2" />
                Start Camera
              </button>
            )}
            
            {scanning && !result && (
              <>
                <button
                  onClick={simulateScan}
                  className="btn-primary flex-1"
                >
                  Simulate Scan (Demo)
                </button>
                <button
                  onClick={() => {
                    setScanning(false);
                    stopCamera();
                  }}
                  className="btn-secondary flex-1"
                >
                  Stop
                </button>
              </>
            )}
            
            {result && (
              <>
                <button
                  onClick={handleAddToList}
                  disabled={result.notFound && !manualEntry}
                  className="btn-primary flex-1"
                >
                  Add to Shopping List
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setManualEntry('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Scan Another
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            💡 Tip: Point camera at barcode or enter manually
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BarcodeScanner;
