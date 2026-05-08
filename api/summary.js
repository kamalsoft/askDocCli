import fs from "fs";
import path from "path";
import { getRemoteConfig } from "../../ask-docs/config.js";

export default async function handler(req, res) {
  console.log(`[SYSTEM] Model health check initiated at ${new Date().toISOString()}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const config = await getRemoteConfig();

    let latency = null;
    if (req.query.checkLatency === 'true') {
      const testPing = async (url, headers, method = 'GET', body = null) => {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        try {
          const res = await fetch(url, { 
            method, 
            headers, 
            body: body ? JSON.stringify(body) : null,
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          return res.ok ? Date.now() - start : -1;
        } catch (e) {
          clearTimeout(timeoutId);
          return -1;
        }
      };

      latency = {
        openrouter: config.appSettings.openrouter.apiKey 
          ? await testPing(`${config.appSettings.openrouter.baseUrl}/models`, { 'Authorization': `Bearer ${config.appSettings.openrouter.apiKey}` })
          : null,
        jina: config.appSettings.jina.apiKey
          ? await testPing(config.appSettings.jina.baseUrl, { 'Authorization': `Bearer ${config.appSettings.jina.apiKey}`, 'Content-Type': 'application/json' }, 'POST', { model: 'jina-embeddings-v2-base-en', input: ['ping'] })
          : null
      };
    }

    const modelsPath = path.resolve(config.appSettings.modelsPath);
    console.log(`[SYSTEM] Scanning models directory: ${modelsPath}`);
    
    const checkFile = (info, target) => {
      const relPath = path.join(info.repo, target);
      const fullPath = path.join(modelsPath, relPath);
      const exists = fs.existsSync(fullPath);
      let size = 0;
      let isLfsPointer = false;

      if (exists) {
        const stats = fs.statSync(fullPath);
        size = stats.size;
        const minSize = info.minSize || 1024 * 1024;
        // LFS pointers are usually small text files containing hashes
        isLfsPointer = size < 10240 && size < minSize; 
      }

      return {
        path: relPath,
        exists,
        size,
        sizeMb: (size / (1024 * 1024)).toFixed(2),
        isLfsPointer
      };
    };

    const modelStatus = {};
    for (const [id, info] of Object.entries(config.reasoningModels)) {
      modelStatus[id] = {
        name: info.name,
        mainFile: checkFile(info, info.targetFile),
        dataFile: info.isSplit ? checkFile(info, info.targetFile + "_data") : null
      };
    }

    const embedStatus = {};
    for (const [id, info] of Object.entries(config.embeddingModels)) {
      embedStatus[id] = {
        name: info.name,
        mainFile: checkFile(info, info.targetFile)
      };
    }

    res.status(200).json({
      activeModel: config.appSettings.activeModel,
      inferenceMode: config.appSettings.inferenceMode,
      isVercel: !!process.env.VERCEL,
      cloudConfig: {
        openrouter: !!config.appSettings.openrouter.apiKey,
        jina: !!config.appSettings.jina.apiKey
      },
      latency,
      modelsPath,
      reasoningModels: modelStatus,
      embeddingModels: embedStatus
    });
  } catch (error) {
    console.error('[ERROR] Health check failed:', error);
    res.status(500).json({ error: 'Failed to check model health', details: error.message });
  }
}