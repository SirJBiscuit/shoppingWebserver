import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/mobile.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA with aggressive updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Force update check on every load
    navigator.serviceWorker
      .register('/service-worker.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Force immediate update check
        registration.update();
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('New service worker found, installing...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('New service worker activated!');
              // Reload page to use new service worker
              if (window.confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        });
        
        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
  
  // Handle controller change (new SW took over)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service worker controller changed, reloading...');
    window.location.reload();
  });
}
