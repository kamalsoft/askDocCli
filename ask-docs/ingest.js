// ask-docs/ingest.js

import fs from "fs";
import path from "path";
import { embed } from "./embed.js";
import { getRemoteConfig } from "./config.js";
import { loadCache, saveCache, shouldRebuildFile, updateFileEntry, updateCacheMeta } from "./cache.js";

/**
 * Recursively finds all files in a directory.
 */
async function walkDir(dir, exclude = []) {
  let files = [];
  let list;
  try {
    list = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
    return [];
  }

  for (const entry of list) {
    if (exclude.includes(entry.name)) continue;
    
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(await walkDir(res, exclude));
    else files.push(res);
  }
  return files;
}

function validateModels(config) {
  const settings = config.appSettings; // config is already from getRemoteConfig
  const modelsPath = path.resolve(settings.modelsPath);
  const modelKey = settings.activeModel;
  const modelInfo = config.reasoningModels[modelKey];
  const embedInfo = config.embeddingModels["jina-v2"];
  
  const isVercel = !!process.env.VERCEL;
  const isCloudReasoning = isVercel || settings.inferenceMode === 'openrouter';
  const isCloudEmbedding = isVercel || settings.cloudEmbeddings;

  if (isVercel) {
    return; // Skip integrity checks on Vercel as we use Cloud APIs
  }

  // Check for OpenRouter configuration
  const mode = settings.inferenceMode;
  if (mode === 'openrouter' || mode === 'auto') {
    if (!settings.openrouter.apiKey) {
      if (mode === 'openrouter') {
        throw new Error("Inference mode is 'openrouter' but OPENROUTER_API_KEY is missing.");
      }
      console.warn("⚠️  Warning: Inference mode is 'auto' but OpenRouter API Key is missing. Fallback to local model will be forced.");
    }
  }

  const modelChecks = [];

  // Only check for embedding model if not in BM25-only mode
  if (!settings.bm25Only && !isCloudEmbedding) {
    modelChecks.push({ info: embedInfo, relPath: path.join(embedInfo.repo, embedInfo.targetFile) });
  }

  // Always check for reasoning model
  if (!isCloudReasoning) {
    modelChecks.push({ info: modelInfo, relPath: path.join(modelInfo.repo, modelInfo.targetFile) });
  }

  if (!isCloudReasoning && modelInfo.isSplit) {
    modelChecks.push({ 
      info: { ...modelInfo, name: `${modelInfo.name} (Weights)`, minSize: 500000000 },
      relPath: path.join(modelInfo.repo, modelInfo.targetFile + "_data")
    });
  }

  for (const check of modelChecks) {
    const fullPath = path.join(modelsPath, check.relPath);
    if (!fs.existsSync(fullPath)) {
      const errorMsg = fullPath.endsWith('_data') 
        ? `Model data weights missing: ${fullPath}. Large models require the .onnx_data file.`
        : `Model file missing: ${fullPath}.`;
      throw new Error(`${errorMsg} Ensure you have run './download_models.sh' or enable cloud inference by setting 'cloudEmbeddings: true' in your config.`);
    }

    const stats = fs.statSync(fullPath);
    const minSize = check.info.minSize || 1000000;
    if (stats.size < minSize) {
      throw new Error(`Model file is too small (${(stats.size / 1024 / 1024).toFixed(2)} MB) for ${check.info.name}. This is likely a Git LFS pointer.`);
    }
  }
  console.log("✅ Model integrity verified.");
}

export function verifyStoreIntegrity(storePath, expectedVersion) {
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

async function testOpenRouterConnectivity(config) {
  const { apiKey, baseUrl } = config.appSettings.openrouter;
  if (!apiKey) return;

  process.stdout.write("📡 Testing OpenRouter connection... ");
  try {
    const res = await fetch(`${baseUrl}/models`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    if (res.ok) console.log("✅");
    else console.log("⚠️  (API reachable, but key may be invalid)");
  } catch (e) {
    console.log(`❌ (Failed: ${e.message})`);
  }
}

async function testJinaConnectivity(config) {
  const { apiKey, baseUrl } = config.appSettings.jina;
  if (!apiKey) {
    console.warn("⚠️  Warning: 'cloudEmbeddings' is enabled but JINA_API_KEY is missing. Ingestion will likely fail.");
    return;
  }

  process.stdout.write("📡 Testing Jina AI connection... ");
  try {
    const res = await fetch(baseUrl.replace('/embeddings', ''), { method: 'HEAD' });
    if (res.ok || res.status === 404) console.log("✅");
    else console.log(`⚠️  (Status: ${res.status})`);
  } catch (e) {
    console.log(`❌ (Failed: ${e.message})`);
  }
}

export async function ingestDocs({ force = false, debug = false, onProgress = null, exclude = [] } = {}) {
  const config = await getRemoteConfig();

  if (process.env.VERCEL) {
    throw new Error("Ingestion is not supported in a serverless environment (Vercel) due to read-only filesystem limitations. Please run 'ask-docs ingest' locally and commit the generated 'vector-store/docs.json' to your repository.");
  }

  // Fail fast if models are missing or corrupt
  validateModels(config);
  if (config.appSettings.inferenceMode !== 'local') await testOpenRouterConnectivity(config);
  if (config.appSettings.cloudEmbeddings) await testJinaConnectivity(config);

  const settings = config.appSettings;
  const cache = loadCache();
  const docsDir = settings.docsPath;
  const storePath = settings.storePath;

  console.log("📘 Ingesting docs from:", docsDir);

  if (!fs.existsSync(docsDir)) {
    throw new Error(`Docs folder not found: ${docsDir}`);
  }
  
  // Merge provided exclusions with app defaults
  const defaultExclude = config.appSettings.excludeFolders || ['.git', 'node_modules', 'archive'];
  const finalExclude = [...new Set([...defaultExclude, ...exclude])];

  const allFilePaths = await walkDir(docsDir, finalExclude);
  const files = allFilePaths.filter(f => f.endsWith(".md")).map(f => ({
    relative: path.relative(docsDir, f),
    absolute: f
  }));

  if (files.length === 0) {
    throw new Error("No Markdown files found in docs folder.");
  }

  if (onProgress) onProgress({ type: 'start', total: files.length });

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

  for (const { relative: file, absolute: fullPath } of files) {
    try {
      const text = await fs.promises.readFile(fullPath, "utf8");

      if (!force && !shouldRebuildFile(file, text, cache)) {
        if (onProgress) onProgress({ type: 'skip', file });
        else if (debug) console.log(`i  Skipping ${file} (cache hit)`);
        // Recover existing chunks for this file
        const saved = existingChunks.filter(c => c.file === file);
        newChunks.push(...saved);
        continue;
      }

      if (onProgress) onProgress({ type: 'process', file });
      const sections = splitIntoChunks(text, file, settings.chunkChars);

      for (const sec of sections) {
        let embedding = null;
        // Skip embedding generation if BM25-only is enabled
        if (!settings.bm25Only) {
          embedding = await embed(sec.text);
        }
        newChunks.push({ ...sec, embedding: embedding });
      }

      updateFileEntry(file, text, cache);
      if (!onProgress) console.log(`✔ Processed ${file} (${sections.length} chunks)`);

    } catch (err) {
      if (onProgress) onProgress({ type: 'error', file, message: err.message });
      else console.error(`❌ Error processing ${file}:`, err);
    }
  }

  updateCacheMeta(cache);
  saveCache(cache);
  
  // Calculate BM25 stats before saving
  console.log("📊 Pre-calculating BM25 statistics...");
  const bm25 = calculateBM25Stats(newChunks);

  // Structured save with metadata
  const storeData = {
    version: settings.ingestVersion,
    model: settings.activeModel,
    createdAt: new Date().toISOString(),
    bm25Stats: bm25, // Persist stats for hybrid search
    chunks: newChunks
  };

  await fs.promises.writeFile(storePath, JSON.stringify(storeData, null, 2));
  
  const msg = `Ingest complete. ${newChunks.length} chunks saved to disk.`;
  if (onProgress) onProgress({ type: 'done', message: msg, chunks: newChunks.length });
  else console.log(`\n✅ ${msg}`);

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

function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1);
}

/**
 * Computes corpus-wide BM25 statistics
 */
function calculateBM25Stats(chunks) {
  const docCount = chunks.length;
  if (docCount === 0) return null;

  let totalLen = 0;
  const df = {}; // document frequency

  chunks.forEach(chunk => {
    const tokens = tokenize(chunk.text);
    totalLen += tokens.length;
    new Set(tokens).forEach(t => df[t] = (df[t] || 0) + 1);
  });

  const idf = {};
  for (const term in df) {
    idf[term] = Math.log((docCount - df[term] + 0.5) / (df[term] + 0.5) + 1);
  }

  return { avgdl: totalLen / docCount, idf };
}

function extractHeading(lines) {
  const h = lines.find(l => l.startsWith("#"));
  return h ? h.replace(/^#+\s*/, "") : "Untitled";
}
