importScripts('workbox-sw.prod.v2.1.3.js');
importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

const workboxSW = new self.WorkboxSW();

workboxSW.router.registerRoute(
  /.*(?:googleapis|gstatic)\.com.*$/, 
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: 'google-fonts',
    cacheExpiration: {
      maxEntries: 3,
      maxAgeSeconds: 60 * 60 * 24 * 30
    }
  })
);


workboxSW.router.registerRoute(
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css', 
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: 'material-css'
  })
);

workboxSW.router.registerRoute(
  /.*(?:firebasestorage\.googleapis)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: 'post-images'
  })
);

workboxSW.router.registerRoute(
  'https://pwagram-29785.firebaseio.com/posts.json',
  function (args) {
    return fetch(args.event.request)
    .then(function(res) {
      var clonedRes = res.clone();
      clearStorage('posts')
        .then(function () {
          return clonedRes.json()
        })
        .then(function(data) {
          for(var key in data) {
            writeData('posts', data[key]);
          }
        })
      return res;
    });
  }
);

workboxSW.router.registerRoute(
  function(routeData) {
    return (routeData.event.request.headers.get('accept').includes('text/html'));
  },
  function (args) {
    return caches.match(args.event.request)
    .then(function(response) {
      if (response) {
        return response;
      } else {
        return fetch(args.event.request)
          .then(function (res) {
            return caches.open('dynamic')
              .then(function(cache) {
                cache.put(args.event.request.url, res.clone());
                return res;
              })
          })
          .catch(function(err) {
            return caches.match('/offline.html')
              .then(function(res) {
                  return res;
              })
          })
      } 
    })
  }
);

self.addEventListener('notificationclick', function(event) {
  var notification = event.notification;
  var action = event.action;

  console.log(notification);

  if (action === 'confirm') {
    console.log('Confirm was chosen');
    notification.close();
  } else {
    console.log(action);
    event.waitUntil(
      clients.matchAll()
        .then(function(clis) {
          var client = clis.find(function(c) {
            return c.visibilityState === 'visible';
          });

          if (client !== undefined ) {
            client.navigate(notification.data.url);
            client.focus();
          } else {
            clients.openWindow(notification.data.url);
          }
          notification.close();
        })
    );
    notification.close();
  }
});

workboxSW.precache([
  {
    "url": "404.html",
    "revision": "0a27a4163254fc8fce870c8cc3a3f94f"
  },
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "2cb5aea5a274c03b1dd800fcdb219b56"
  },
  {
    "url": "manifest.json",
    "revision": "d11c7965f5cfba711c8e74afa6c703d7"
  },
  {
    "url": "offline.html",
    "revision": "8151b235ac1c735e06c00315295930ad"
  },
  {
    "url": "src/css/app.css",
    "revision": "f27b4d5a6a99f7b6ed6d06f6583b73fa"
  },
  {
    "url": "src/css/feed.css",
    "revision": "cf788836709f6671085f25a0d07ad0df"
  },
  {
    "url": "src/css/help.css",
    "revision": "1c6d81b27c9d423bece9869b07a7bd73"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/images/sf-boat.jpg",
    "revision": "0f282d64b0fb306daf12050e812d6a19"
  },
  {
    "url": "src/js/app.min.js",
    "revision": "b47f6515af85d9d3379b4fa67e2c372e"
  },
  {
    "url": "src/js/feed.min.js",
    "revision": "90b674cf1daffddad9a0b8daca3323a1"
  },
  {
    "url": "src/js/fetch.min.js",
    "revision": "4174e53d81ed161be169bc7981cf6d49"
  },
  {
    "url": "src/js/idb.min.js",
    "revision": "88ae80318659221e372dd0d1da3ecf9a"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "713af0c6ce93dbbce2f00bf0a98d0541"
  },
  {
    "url": "src/js/promise.min.js",
    "revision": "abe12e93553296bf22d99b57a03ab62d"
  },
  {
    "url": "src/js/utility.min.js",
    "revision": "a96757eaf0ed5c89836c697674acf344"
  }
]);

self.addEventListener('sync', function(event) {
  console.log('[Service Worker] Background syncing', event);
  if (event.tag === 'sync-new-posts') {
    console.log('[Serice Worker] Syncing new post');
    event.waitUntil(
      readAllData('sync-posts')
        .then(function(data) {
          for (var dt of data) {
            var postData = new FormData();
            postData.append('id', dt.id);
            postData.append('title', dt.title);
            postData.append('location', dt.location);
            postData.append('rawLocationLat', dt.rawLocation.lat);
            postData.append('rawLocationLng', dt.rawLocation.lng);
            postData.append('file', dt.picture, dt.id + '.png');

            fetch('https://us-central1-pwagram-29785.cloudfunctions.net/storePostData', {
              method: 'POST',
              body: postData
            })
            .then(function(res) {
              console.log('Send data', res);
              if (res.ok) {
                res.json()
                  .then(function(resData) {
                    deleteItemById('sync-posts', resData.id);
                  })
              }
            })
            .catch(function(err) {
              console.log('while sending error', err);
            })
          }
        })
    );
  }
})

self.addEventListener('notificationclose', function(event) {
  console.log('Notification was closed', event);
});

self.addEventListener('push', function(event) {
  console.log('Push Notification received', event);

  var data = { title: 'New!', content: 'Something new happened!', openUrl: '/' };
  if (event.data) {
    data = JSON.parse(event.data.text());
  }

  var options = {
    body: data.content,
    icon: '/src/images/icons/app-icon-96x96.png',
    bache: '/src/images/icons/app-icon-96x96.png',
    data: {
      url: data.openUrl
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
});
