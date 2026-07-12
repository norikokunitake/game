/* =========================================================
   くものうえ 学び王国 - sw.js (v2)
   ========================================================= */

const CACHE_NAME = "kumo-no-ue-gakuou-v2";

const FILES_TO_CACHE = [
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/sound.js",
  "./js/data-math.js",
  "./js/data-english.js",
  "./js/data-japanese.js",
  "./js/data-social.js",
  "./js/data-science.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
