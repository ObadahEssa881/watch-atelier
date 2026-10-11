/*
 * Qasioun service worker: the site's files, kept in the visitor's browser.
 *
 *  - /_next/static/* (scripts, styles, the three.js chunk, fonts) are named by
 *    content hash, so they never change under a name: cache-first, forever.
 *  - the still photographs and other images: cache-first.
 *  - optimised images (/_next/image): served from cache at once, refreshed
 *    behind the scenes (stale-while-revalidate).
 *  - pages: network-first, falling back to the cached copy when offline, so a
 *    return visit opens instantly and still gets new content.
 *
 * The 3D finishes are not here: they live in IndexedDB (see textures.ts).
 * Bump VERSION to drop every cache on the next visit.
 */
const VERSION = "q01-v1";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const IMAGES = `images-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll(["/"]))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const cacheFirst = async (req, name) => {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
};

const staleWhileRevalidate = async (req, name) => {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const fresh = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fresh;
};

const networkFirst = async (req, name) => {
  const cache = await caches.open(name);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), 4000))]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await cache.match("/")) || Response.error();
  }
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // the API and anything else: untouched
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(req, STATIC));
  if (url.pathname.startsWith("/_next/image")) return event.respondWith(staleWhileRevalidate(req, IMAGES));
  if (url.pathname.startsWith("/stills/") || /\.(?:webp|avif|png|jpe?g|svg|woff2?)$/.test(url.pathname)) return event.respondWith(cacheFirst(req, IMAGES));
  if (req.mode === "navigate") return event.respondWith(networkFirst(req, PAGES));
});
