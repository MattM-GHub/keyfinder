// Simple Service Worker for Offline App Shell capability
const CACHE_NAME = 'key-index-v1';
const ASSETS_TO_CACHE =[
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests for our shell assets. 
  // Supabase API calls (POST/GET) bypass the cache to ensure real-time data.
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
      return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});