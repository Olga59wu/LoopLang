const CACHE_NAME = 'looplang-cache-v37';

// 預先快取核心資源，提升首屏載入速度
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/thai_list.html',
  '/styles/main.css',
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  // 清理舊版快取
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. 絕對排除 Firebase 生態圈的所有動態請求，避免干擾授權登入與雲端資料庫同步
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken')
  ) {
    return; // 放行不處理
  }

  // 2. 例外排除：忽略非 GET 請求
  if (event.request.method !== 'GET' || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    return;
  }

  // 3. 內容與入口優先 (Network First)：針對 JSON 資料檔及 HTML 頁面，保證最新內容，離線時轉快取
  if (url.pathname.includes('/data/') || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 4. 靜態資源優先 (Cache First)：針對 JS、CSS、圖片、組件，優先讀取本地快取
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 避免 Chrome DevTools 的 only-if-cached bug 導致 fetch 拋出錯誤並回傳 ERR_FAILED
      if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
        return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
      }

      return fetch(event.request).then((response) => {
        // 如果是跨域請求（例如 CDN 上的 Vue 或 Tailwind）可能 type 不為 basic，但也允許寫入
        if (!response || response.status !== 200) {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      }).catch((e) => {
        console.warn('[Service Worker] Fetch Failed:', e, event.request.url);
        // 避免回傳 undefined 導致 ERR_FAILED
        return new Response('Network error happened', { status: 408, headers: { 'Content-Type': 'text/plain' } });
      });
    })
  );
});
