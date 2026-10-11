import type * as ThreeNS from "three";
import type { TexName, TexReply } from "./textures.worker";

/**
 * The finishes, cached in the visitor's browser.
 *
 * First visit: a worker computes each map and returns it as PNG; it is stored
 * in IndexedDB. Every later visit decodes the stored PNGs directly (off the
 * main thread, via createImageBitmap) and the worker is never started.
 *
 * Why IndexedDB and not localStorage: localStorage holds only strings, about
 * 5 MB in total, and every read blocks the main thread — the opposite of
 * smooth. IndexedDB stores binary blobs asynchronously.
 *
 * Bump TEX_VERSION when a generator changes, so old maps are not reused.
 */

export const TEX_VERSION = 5;
const DB = "qasioun";
const STORE = "textures";

export const TEX_NAMES: TexName[] = ["cotesNormal", "cotesAniso", "perlageNormal", "perlageAniso", "sunNormal", "sunAniso", "brushedNormal", "leatherNormal", "grainNormal", "grainAniso"];

export type Maps = Record<TexName, ThreeNS.Texture>;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null); // private mode, or storage blocked: generate every time
    }
  });
}

function idb<T>(db: IDBDatabase | null, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  if (!db) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    try {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

const key = (n: TexName) => `v${TEX_VERSION}:${n}`;

/** Blobs for every map: from IndexedDB when present, from the worker when not. */
async function blobs(onProgress: (done: number, total: number) => void): Promise<Record<TexName, Blob>> {
  const db = await openDb();
  const out = {} as Record<TexName, Blob>;
  const missing: TexName[] = [];
  for (const n of TEX_NAMES) {
    const b = await idb<Blob>(db, "readonly", (s) => s.get(key(n)) as IDBRequest<Blob>);
    if (b instanceof Blob) out[n] = b;
    else missing.push(n);
  }
  let done = TEX_NAMES.length - missing.length;
  onProgress(done, TEX_NAMES.length);
  if (missing.length) {
    const worker = new Worker(new URL("./textures.worker.ts", import.meta.url), { type: "module" });
    await new Promise<void>((resolve, reject) => {
      worker.onerror = (e) => reject(e);
      worker.onmessage = (e: MessageEvent<TexReply>) => {
        out[e.data.name] = e.data.blob;
        void idb(db, "readwrite", (s) => s.put(e.data.blob, key(e.data.name)));
        onProgress(++done, TEX_NAMES.length);
        if (missing.every((n) => out[n])) resolve();
      };
      worker.postMessage({ names: missing });
    }).finally(() => worker.terminate());
    // tidy maps left by older versions
    void idb(db, "readwrite", (s) => {
      const req = s.getAllKeys();
      req.onsuccess = () => {
        for (const k of req.result) if (typeof k === "string" && !k.startsWith(`v${TEX_VERSION}:`)) s.delete(k);
      };
      return req;
    });
  }
  db?.close();
  return out;
}

export async function loadMaps(THREE: typeof ThreeNS, maxAnisotropy: number, onProgress: (done: number, total: number) => void = () => {}): Promise<Maps> {
  const raw = await blobs(onProgress);
  const maps = {} as Maps;
  await Promise.all(
    TEX_NAMES.map(async (n) => {
      // decoded off the main thread; ImageBitmaps are uploaded without a flip
      const bmp = await createImageBitmap(raw[n], { colorSpaceConversion: "none", premultiplyAlpha: "none" });
      const t = new THREE.Texture(bmp);
      t.flipY = false;
      t.colorSpace = THREE.NoColorSpace; // every map here is data, not colour
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = maxAnisotropy;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.needsUpdate = true;
      maps[n] = t;
    }),
  );
  return maps;
}

/** A texture sharing `src`'s image, with its own tiling: one upload, many scales. */
export function tiled(src: ThreeNS.Texture, repeatX: number, repeatY = repeatX, offsetX = 0, offsetY = 0, rotation = 0) {
  const t = src.clone();
  t.repeat.set(repeatX, repeatY);
  t.offset.set(offsetX, offsetY);
  t.rotation = rotation;
  t.needsUpdate = true;
  return t;
}
