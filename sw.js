// sw.js
const CACHE_NAME = 'ysk-sales-pwa-v2'; // Bumped version
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  // All CDN resources from index.html
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/8.10.0/firebase-app.js',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/8.10.0/firebase-auth.js',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/8.10.0/firebase-database.js',
  'https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://esm.sh/react@18.2.0',
  'https://esm.sh/react-dom@18.2.0',
  'https://esm.sh/react-dom@18.2.0/client',
  'https://esm.sh/react-dom@18.2.0/',
  'https://esm.sh/recharts@2.12.7?deps=react@18.2.0',
  'https://aistudiocdn.com/idb@^8.0.3',
  'https://esm.sh/@google/genai',
  'https://i.postimg.cc/D0cf0y0m/512-x-512-1.png', // Logo
  'https://i.postimg.cc/fLTxbbTt/512-x-512-3.png' // Assistant icon
];

// Install: Open cache and add all core assets.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching core assets for offline use.');
        return cache.addAll(URLS_TO_CACHE).catch(error => {
          console.error('[Service Worker] Caching failed for some assets, but installation will proceed.', error);
        });
      })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Fetch: Implement caching strategies.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy 1: Network-first for navigation.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // Strategy 2: Stale-While-Revalidate for all other assets (CSS, JS, images, fonts).
  // This provides the "offline for a year" capability while also allowing for updates.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If the fetch is successful, update the cache.
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Return the cached response immediately if available, otherwise wait for the network.
        return cachedResponse || fetchPromise;
      });
    })
  );
});
