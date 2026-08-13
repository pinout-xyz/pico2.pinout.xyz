"use strict";

const CACHE = "pinout-v2";
const NETWORK_TIMEOUT = 400;

const PRECACHE = [
    ".",
    "index.html",
    "manifest.json",
    "picow.html",
    "pinout-logo.png",
    "pinout.css",
    "pinout.js",
    "pipipi-icon-192.png",
    "pipipi-icon-48.png",
    "pipipi-icon-512.png",
    "raspberry-pi-pico-2-underside.svg",
    "raspberry-pi-pico-2.svg",
    "register_serviceworker.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names.filter((name) => name !== CACHE).map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    event.respondWith(network_first(event.request));
});

// Prefer a prompt network response, fall back to cache, and only wait out a
// slow network if nothing is cached. Cached copies are refreshed as we go so
// offline content does not freeze at whatever was current on install.
async function network_first(request) {
    const network = fetch(request).then((response) => {
        if (response.ok) store(request, response.clone());
        return response;
    });
    network.catch(() => {});

    const prompt_response = await Promise.race([
        network.catch(() => null),
        new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT, null))
    ]);
    if (prompt_response) return prompt_response;

    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, {ignoreSearch: true});
    return cached || network;
}

async function store(request, response) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response);
}
