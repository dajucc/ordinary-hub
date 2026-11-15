#!/usr/bin/env node
// Prints the djb2 hash that ordinary-hub.lua stores in KEY.hashes for a key.
//
//   node tools/keyhash.mjs welcome2026
//
// Paste the number into KEY.hashes. The key itself is never written to disk.

const key = process.argv.slice(2).join(" ");
if (!key) {
  console.error("usage: node tools/keyhash.mjs <key>");
  process.exit(1);
}

const normalized = key.toUpperCase().replace(/[^A-Z0-9]/g, "");
let hash = 5381;
for (const ch of normalized) hash = (hash * 33 + ch.charCodeAt(0)) % 4294967296;

console.log("key        " + key);
console.log("normalised " + normalized);
console.log("hash       " + hash);
