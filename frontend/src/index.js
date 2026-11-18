import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/mobile.css';
import './styles/optimization.css';
import './styles/tutorial.css';
import './styles/scrollbar.css';
import App from './App';
import { installSessionGuard } from './services/sessionGuard';

installSessionGuard();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker — it keeps the app shell usable while the origin
// is down mid-deploy (see public/service-worker.js). Update prompting lives
// in <UpdateBanner/> — do NOT add window.confirm or controllerchange reloads
// back here; auto-reloading kicks users out of whatever they're doing.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.update();
        setInterval(() => registration.update(), 60000);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
