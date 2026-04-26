import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";
import { loadConfig } from "./config.js";
import {
  loadCache,
  saveCache,
  shouldRebuildFile,
  updateFileEntry,
  updateCacheMeta
} from "./cache.js";

const config = loadConfig();

/* -------------------------------------------------------
   Walk docs directory
------------------------------------------------------- */
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

/* -------------------------------------------------------
   Heading‑aware chunking
------------------------------------------------------- */
function chunkText(text, chunkSize) {
  const lines = text.split("\n");
  const chunks = [];
  let buffer = [];
  let startLine = 1;
  let currentHeading = "ROOT";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const headingMatch = line.match(/^#{1,6}\s+(.*)/);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim() || "ROOT";
    }

    buffer.push(line);

    if (buffer.join("\n").length >= chunkSize) {
      chunks.push({
        text: buffer.join("\n"),
        startLine,
        endLine: i + 1,
        heading: currentHeading
      });
      buffer = [];
      startLine = i + 2;
    }
  }

  if (buffer.length > 0) {
    chunks.push({
      text: buffer.join("\n"),
      startLine,
      endLine: lines.length,
      heading: currentHeading
    });
  }

  return chunks;
}

/* -------------------------------------------------------
   Progress bar
------------------------------------------------------- */
function renderProgress(current, total) {
  const width = 30;
  const ratio = total === 0 ? 1 : current / total;
  const filled = Math.round(ratio * width);
  const bar = "█".repeat(filled) + " ".repeat(width - filled);
  const pct = Math.round(ratio * 100);
  process.stdout.write(`\r[${bar}] ${pct}% (${current}/${total})`);
}

/* -------------------------------------------------------
   Load old store (for hybrid merge)
------------------------------------------------------- */
function loadOldStore(storePath) {
  if (!fs.existsSync(storePath)) return [];
  try {
    const raw = fs.readFileSync(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* -------------------------------------------------------
   MAIN INGEST FUNCTION
------------------------------------------------------- */
export async function ingestDocs(opts = {}) {
  const force = opts.force === true;

  const docsPath = config.docsPath || "../docs";
  const storePath = config.storePath || "./vector-store/docs.json";

  console.log(`\n📁 Scanning docs directory: ${docsPath}`);

  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/jina-embeddings-v2-base-en"
  );

  const files = walk(docsPath);
  console.log(`📄 Found ${files.length} Markdown files\n`);

  const cache = loadCache();
  const oldStore = loadOldStore(storePath);

  const chunksByFile = {};
  for (const chunk of oldStore) {
    if (!chunk.filePath) continue;
    if (!chunksByFile[chunk.filePath]) {
      chunksByFile[chunk.filePath] = [];
    }
    chunksByFile[chunk.filePath].push(chunk);
  }

  const newStore = [];
  let processed = 0;
  const total = files.length;

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, "utf8");
    const needsRebuild = shouldRebuildFile(filePath, raw, cache);

    if (!force && !needsRebuild && chunksByFile[filePath]) {
      console.log(`✔ Using cached chunks for: ${filePath}`);
      newStore.push(...chunksByFile[filePath]);
      processed++;
      renderProgress(processed, total);
      continue;
    }

    console.log(`🔄 Rebuilding embeddings for: ${filePath}`);

    const chunks = chunkText(raw, config.chunkChars || 1200);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      console.log(`   → Adding chunk ${i + 1}/${chunks.length} from ${filePath}`);

      const emb = await embedder(chunk.text, {
        pooling: "mean",
        normalize: true
      });

      const vec = emb.data;

      if (!Array.isArray(vec) || vec.length === 0) {
        console.warn("⚠️ Empty embedding for chunk:", chunk.text.slice(0, 40));
      }

      newStore.push({
        id: `${filePath}-${i}`,
        file: path.basename(filePath),
        filePath,
        heading: chunk.heading,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        text: chunk.text,
        embedding: vec
      });
    }

    updateFileEntry(filePath, raw, cache);
    console.log(`   ✔ Updated cache entry for: ${filePath}`);

    processed++;
    renderProgress(processed, total);
  }

  process.stdout.write("\n");

  const finalStore =
    newStore.length === 0 && oldStore.length > 0 ? oldStore : newStore;

  console.log(`\n📦 Writing ${finalStore.length} chunks to ${storePath}`);
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(finalStore, null, 2));

  updateCacheMeta(cache);
  saveCache(cache);

  console.log(`🗂  Cache updated: ${Object.keys(cache.files).length} files tracked`);
  console.log("✅ Ingest complete.\n");
}
