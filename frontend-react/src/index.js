// Suppress harmless SecurityErrors from browser extensions first (before React)
import './suppressSandboxErrors';

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initAnalytics } from './services/analytics';
import './i18n'; // Initialize i18n

if (typeof window !== 'undefined') initAnalytics();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

// Register Service Worker for PWA support - TEMPORARILY DISABLED FOR DEBUGGING
if (false && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Unregister any existing service workers
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
        console.log('🗑️ Service Worker unregistered');
      }
    });
    
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope);
        
        // Check for updates less frequently to avoid flickering
        setInterval(() => {
          registration.update();
        }, 300000); // Check every 5 minutes instead of 1 minute
        
        // Handle updates without causing page flicker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, but don't force reload
              console.log('🔄 New content available. Refresh to update.');
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

// Unregister existing service workers on load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('🗑️ Service Worker unregistered for debugging');
    }
  });
}

// Prompt user to install PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💾 PWA install prompt available');
  e.preventDefault();
  deferredPrompt = e;
  
  // Show custom install button (can be implemented in UI later)
  const installButton = document.getElementById('pwa-install-button');
  if (installButton) {
    installButton.style.display = 'block';
    installButton.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        deferredPrompt = null;
        installButton.style.display = 'none';
      }
    });
  }
});

// Track PWA installation
window.addEventListener('appinstalled', () => {
  console.log('✅ KIDSCODE PWA installed successfully!');
  deferredPrompt = null;
});
