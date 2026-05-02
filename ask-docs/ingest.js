// ask-docs/ingest.js

import fs from "fs";
import path from "path";
import { embed } from "./embed.js";
import { loadConfig } from "./config.js";
import { loadCache, saveCache, shouldRebuildFile, updateFileEntry, updateCacheMeta } from "./cache.js";

function validateModels(config) {
  const settings = config.appSettings;
  const modelsPath = path.resolve(settings.modelsPath);
  const modelKey = settings.activeModel;
  const modelInfo = config.reasoningModels[modelKey];
  const embedInfo = config.embeddingModels["jina-v2"];

  const modelChecks = [
    { info: embedInfo, relPath: path.join(embedInfo.repo, embedInfo.targetFile) },
    { info: modelInfo, relPath: path.join(modelInfo.repo, modelInfo.targetFile) }
  ];

  if (modelInfo.isSplit) {
    modelChecks.push({ 
      info: { ...modelInfo, name: `${modelInfo.name} (Weights)`, minSize: 500000000 },
      relPath: path.join(modelInfo.repo, modelInfo.targetFile + "_data")
    });
  }

  for (const check of modelChecks) {
    const fullPath = path.join(modelsPath, check.relPath);
    if (!fs.existsSync(fullPath)) {
      if (fullPath.endsWith('_data')) {
        console.error(`❌ Error: Model data weights missing: ${fullPath}`);
        console.error(`💡 This model is large and requires the external .onnx_data file.`);
      } else {
        console.error(`❌ Error: Model file missing: ${fullPath}`);
      }
      process.exit(1);
    }

    const stats = fs.statSync(fullPath);
    const minSize = check.info.minSize || 1000000;
    if (stats.size < minSize) {
      console.error(`❌ Error: Model file is too small (${(stats.size / 1024 / 1024).toFixed(2)} MB) for ${check.info.name}:`);
      console.error(`   ${fullPath}`);
      console.error(`\n💡 This is likely a Git LFS pointer or an interrupted download.`);
      process.exit(1);
    }
  }
  console.log("✅ Model integrity verified.");
}

function verifyStoreIntegrity(storePath, expectedVersion) {
  try {
    const data = JSON.parse(fs.readFileSync(storePath, "utf8"));
    
    if (!data.version || !data.chunks) {
      throw new Error("Invalid vector store format.");
    }

    if (data.version !== expectedVersion) {
      throw new Error(`Version mismatch. Expected ${expectedVersion}, found ${data.version}`);
    }

    console.log(`📡 Health Check: Vector store verified.`);
    console.log(`   - Version: ${data.version}`);
    console.log(`   - Chunks: ${data.chunks.length}`);
    return true;
  } catch (err) {
    console.error(`❌ Health Check Failed: ${err.message}`);
    return false;
  }
}

export async function ingestDocs({ force = false, debug = false } = {}) {
  const config = loadConfig();

  // Fail fast if models are missing or corrupt
  validateModels(config);

  const settings = config.appSettings;
  const cache = loadCache();
  const docsDir = settings.docsPath;
  const storePath = settings.storePath;

  console.log("📘 Ingesting docs from:", docsDir);

  if (!fs.existsSync(docsDir)) {
    throw new Error(`Docs folder not found: ${docsDir}`);
  }

  const files = (await fs.promises.readdir(docsDir)).filter(f => f.endsWith(".md"));
  if (files.length === 0) {
    throw new Error("No Markdown files found in docs folder.");
  }

  // Load existing store to preserve cached embeddings
  let existingChunks = [];
  try {
    await fs.promises.access(storePath);
    const rawData = JSON.parse(await fs.promises.readFile(storePath, "utf8"));
    existingChunks = rawData.chunks || (Array.isArray(rawData) ? rawData : []);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn("⚠️  Could not parse existing vector store, starting fresh.");
    }
    existingChunks = [];
  }

  const newChunks = [];

  for (const file of files) {
    try {
      const fullPath = path.join(docsDir, file);
      const text = await fs.promises.readFile(fullPath, "utf8");

      if (!force && !shouldRebuildFile(file, text, cache)) {
        if (debug) console.log(`i  Skipping ${file} (cache hit)`);
        // Recover existing chunks for this file
        const saved = existingChunks.filter(c => c.file === file);
        newChunks.push(...saved);
        continue;
      }

      const sections = splitIntoChunks(text, file, settings.chunkChars);

      for (const sec of sections) {
        const embedding = await embed(sec.text);
        newChunks.push({ ...sec, embedding });
      }

      updateFileEntry(file, text, cache);
      console.log(`✔ Processed ${file} (${sections.length} chunks)`);

    } catch (err) {
      console.error(`❌ Error processing ${file}:`, err);
    }
  }

  updateCacheMeta(cache);
  saveCache(cache);
  
  // Structured save with metadata
  const storeData = {
    version: settings.ingestVersion,
    model: settings.activeModel,
    createdAt: new Date().toISOString(),
    chunks: newChunks
  };

  await fs.promises.writeFile(storePath, JSON.stringify(storeData, null, 2));
  console.log(`\n✅ Ingest complete. ${newChunks.length} chunks saved to disk.`);

  // Perform Health Check
  verifyStoreIntegrity(storePath, settings.ingestVersion);
}

function splitIntoChunks(text, file, size) {
  const lines = text.split("\n");
  const chunks = [];
  let buffer = [];
  let start = 1;

  for (let i = 0; i < lines.length; i++) {
    buffer.push(lines[i]);

    if (buffer.join("\n").length >= size) {
      chunks.push({
        id: `${file}-${chunks.length}`,
        file,
        heading: extractHeading(buffer),
        startLine: start,
        endLine: i + 1,
        text: buffer.join("\n")
      });
      buffer = [];
      start = i + 2;
    }
  }

  if (buffer.length > 0) {
    chunks.push({
      id: `${file}-${chunks.length}`,
      file,
      heading: extractHeading(buffer),
      startLine: start,
      endLine: lines.length,
      text: buffer.join("\n")
    });
  }

  return chunks;
}

function extractHeading(lines) {
  const h = lines.find(l => l.startsWith("#"));
  return h ? h.replace(/^#+\s*/, "") : "Untitled";
}
