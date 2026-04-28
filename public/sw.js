const CACHE = 'momentum-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'STAGE_COMPLETE') {
    const { title, body, vibrate } = e.data;
    self.registration.showNotification(title, {
      body,
      icon:     '/icons/icon-192.svg',
      badge:    '/icons/icon-192.svg',
      tag:      'momentum-stage',
      renotify: true,
      vibrate:  vibrate ? [200, 100, 200, 100, 300] : undefined,
      data:     { url: self.location.origin }
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
