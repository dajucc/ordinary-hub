#!/usr/bin/env node
// Builds the public hub file from the private dev source.
//
//   node tools/build.mjs [--src <dev file>] [--out <public file>]
//
// The dev source is never committed: this strips its comments, encrypts the
// payload and writes a small decoder stub as ordinary-hub.lua, which is the file
// the loader fetches. Run it after every change you want to publish.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const srcPath = path.resolve(
  argOf("--src", path.join(process.env.USERPROFILE || process.env.HOME || ".", "Desktop", "ordinary-hub.lua")),
);
const outPath = path.resolve(argOf("--out", "ordinary-hub.lua"));

const source = fs.readFileSync(srcPath, "utf8");

// --- keep a timestamped copy of the dev source before every build, so any
// shipped version can be restored without relying on memory -------------------
const version = (source.match(/HUB_VERSION\s*=\s*"([^"]+)"/) || [])[1] || "unknown";
const backupDir = path.join(path.dirname(srcPath), "ordinary-hub-backups");
const stamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 17);
const backupPath = path.join(backupDir, `ordinary-hub-v${version}-${stamp}.lua`);
let backupMsg = "backup   skipped";
try {
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(srcPath, backupPath);
  const kept = fs.readdirSync(backupDir).filter((f) => f.endsWith(".lua")).sort();
  while (kept.length > 40) fs.unlinkSync(path.join(backupDir, kept.shift()));
  backupMsg = "backup   " + backupPath;
} catch (error) {
  backupMsg = "backup   FAILED: " + error.message;
}

// --- strip comments, keep strings and long strings byte for byte -------------

function longBracketLevel(text, at) {
  if (text[at] !== "[") return null;
  let j = at + 1;
  let level = 0;
  while (text[j] === "=") {
    level += 1;
    j += 1;
  }
  return text[j] === "[" ? level : null;
}

function longBracketEnd(text, at, level) {
  const close = "]" + "=".repeat(level) + "]";
  const idx = text.indexOf(close, at);
  return idx < 0 ? text.length : idx + close.length;
}

function stripComments(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];

    if (c === "-" && text[i + 1] === "-") {
      const level = longBracketLevel(text, i + 2);
      if (level !== null) {
        i = longBracketEnd(text, i + 4, level);
        continue;
      }
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }

    if (c === '"' || c === "'") {
      let j = i + 1;
      out += c;
      while (j < text.length) {
        const d = text[j];
        out += d;
        if (d === "\\") {
          out += text[j + 1] ?? "";
          j += 2;
          continue;
        }
        j += 1;
        if (d === c) break;
      }
      i = j;
      continue;
    }

    if (c === "[") {
      const level = longBracketLevel(text, i);
      if (level !== null) {
        const end = longBracketEnd(text, i + level + 2, level);
        out += text.slice(i, end);
        i = end;
        continue;
      }
    }

    out += c;
    i += 1;
  }
  return out;
}

const stripped = stripComments(source);

// --- encrypt ---------------------------------------------------------------

const key = crypto.randomBytes(12).toString("hex"); // 24 chars, fresh per build
const keyBytes = Buffer.from(key, "utf8");
const data = Buffer.from(stripped, "utf8");
const enc = Buffer.alloc(data.length);
for (let i = 0; i < data.length; i += 1) {
  enc[i] = data[i] ^ keyBytes[i % keyBytes.length];
}

// every byte as \ddd keeps the stub free of newlines, quotes and escapes
let payload = "";
for (const byte of enc) payload += "\\" + String(byte).padStart(3, "0");

const chunks = [];
for (let i = 0; i < payload.length; i += 4000) chunks.push('"' + payload.slice(i, i + 4000) + '"');

const stub = `-- Ordinary Hub - public build, do not edit. Generated ${new Date().toISOString().slice(0, 10)}.
local k = "${key}"
local p = ${chunks.join(" ..\n")}
local out = table.concat((function()
\tlocal buf = {}
\tlocal kb = #k
\tlocal kbx = {}
\tfor i = 1, kb do kbx[i] = string.byte(k, i) end
\tfor i = 1, #p do
\t\tbuf[i] = string.char(bit32.bxor(string.byte(p, i), kbx[(i - 1) % kb + 1]))
\tend
\treturn buf
end)())
local fn, err = loadstring(out, "=ordinary-hub")
if not fn then error("ordinary-hub: " .. tostring(err), 0) end
return fn()
`;

fs.writeFileSync(outPath, stub, "utf8");

const pct = (n) => (n / 1024).toFixed(1) + " KiB";
console.log(backupMsg);
console.log("source   " + srcPath + "  " + pct(Buffer.byteLength(source)));
console.log("stripped " + pct(Buffer.byteLength(stripped)));
console.log("public   " + outPath + "  " + pct(Buffer.byteLength(stub)));
