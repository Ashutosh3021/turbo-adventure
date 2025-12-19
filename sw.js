// Service Worker for Multi-Personality Chat PWA
const CACHE_NAME = 'chat-pwa-v1.0';
const urlsToCache = [
  '/turbo-adventure/',
  '/turbo-adventure/index.html',
  '/turbo-adventure/android-chrome-192x192.png',
  '/turbo-adventure/android-chrome-512x512.png',
  '/turbo-adventure/apple-touch-icon.png',
  '/turbo-adventure/favicon-16x16.png',
  '/turbo-adventure/favicon-32x32.png',
  '/turbo-adventure/favicon.ico',
  '/turbo-adventure/site.webmanifest'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  // Handle API requests differently
  if (event.request.url.includes('openrouter.ai/api')) {
    // For API requests, try network first, then cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response as it can only be consumed once
          const responseClone = response.clone();
          
          // Cache the response for future use
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
            
          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(event.request)
            .then(response => {
              if (response) {
                return response;
              }
              
              // For chat messages, return a fallback response
              if (event.request.url.includes('/chat/completions')) {
                return new Response(
                  JSON.stringify({
                    choices: [{
                      message: {
                        content: "You are currently offline. Your message will be sent when you're back online."
                      }
                    }]
                  }),
                  { headers: { 'Content-Type': 'application/json' } }
                );
              }
            });
        })
    );
  } else {
    // For static assets, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Return cached version if found
          if (response) {
            return response;
          }
          
          // Otherwise, fetch from network
          return fetch(event.request)
            .then(response => {
              // Check if we received a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone the response as it can only be consumed once
              const responseClone = response.clone();
              
              // Cache the response for future use
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
                
              return response;
            })
            .catch(() => {
              // Fallback for offline access
              if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
              }
            });
        })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for pending messages (placeholder implementation)
function sendPendingMessages() {
  // This would typically handle sending messages that were queued while offline
  // For this app, we'd need to store messages in IndexedDB and send them when online
  console.log('Sending pending messages...');
  return Promise.resolve();
}

// Sync event - handle background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sendMessage') {
    event.waitUntil(sendPendingMessages());
  }
});

// Push notifications
self.addEventListener('push', event => {
  const title = 'New Message';
  const options = {
    body: 'You have a new message in your chat',
    icon: './android-chrome-192x192.png',
    badge: './favicon-32x32.png'
  };
  
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('./')
  );
});