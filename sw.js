// ── Dysmantle Map Service Worker ──
const CACHE_VERSION = 'dysmap-v1';

// 缓存策略配置
const TILE_CACHE    = 'dysmap-tiles-v1';   // 地图瓦片 — Cache First，长期缓存
const ICON_CACHE    = 'dysmap-icons-v1';   // 图标 PNG  — Cache First
const STATIC_CACHE  = 'dysmap-static-v1';  // CDN JS/CSS — Stale While Revalidate

// 需要预缓存的静态资源（CDN）
const PRECACHE_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.min.js',
];

// ── Install：预缓存静态资源 ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// ── Activate：清理旧 cache ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![TILE_CACHE, ICON_CACHE, STATIC_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch：按来源分策略 ──
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 地图瓦片：Cache First（命中直接返回，未命中则请求后缓存）
  if (url.includes('ogmods.github.io/dysmantle-map/tiles/')) {
    event.respondWith(cacheFirst(event.request, TILE_CACHE));
    return;
  }

  // 图标 PNG：Cache First
  if (url.includes('ogmods.github.io/dysmantle-map/images/')) {
    event.respondWith(cacheFirst(event.request, ICON_CACHE));
    return;
  }

  // CDN 静态资源 & Google Fonts：Stale While Revalidate
  if (url.includes('cdnjs.cloudflare.com') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  // 其他请求走网络
});

// ── 策略：Cache First ──
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return new Response('Network error', { status: 503 });
  }
}

// ── 策略：Stale While Revalidate ──
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // 后台刷新
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => {});

  return cached || fetchPromise;
}
