import fs from "fs";
import path from "path";
import crypto from "crypto";
import { loadConfig } from "./config.js";

const config = loadConfig();

function getCachePath() {
  return config.cachePath || "./vector-store/cache.json";
}

export function loadCache() {
  const cachePath = getCachePath();
  if (!fs.existsSync(cachePath)) {
    return {
      version: config.ingestVersion,
      chunkChars: config.chunkChars,
      files: {}
    };
  }
  const data = JSON.parse(fs.readFileSync(cachePath, "utf8"));

  return {
    version: data.version ?? 0,
    chunkChars: data.chunkChars ?? config.chunkChars,
    files: data.files ?? {}
  };
}

export function saveCache(cache) {
  const cachePath = getCachePath();
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

export function clearCache() {
  const cachePath = getCachePath();
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
    return true;
  }
  return false;
}

export function hashContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function shouldRebuildFile(filePath, content, cache) {
  const hash = hashContent(content);
  const entry = cache.files[filePath];

  if (!entry) return true;
  if (entry.hash !== hash) return true;
  if (cache.chunkChars !== config.chunkChars) return true;
  if (cache.version !== config.ingestVersion) return true;

  return false;
}

export function updateFileEntry(filePath, content, cache) {
  const hash = hashContent(content);
  cache.files[filePath] = { hash };
}

export function updateCacheMeta(cache) {
  cache.version = config.ingestVersion;
  cache.chunkChars = config.chunkChars;
}
