import fs from "fs";
import path from "path";
import { loadConfig } from "./ask-docs/config.js";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const config = loadConfig();
    const modelsPath = path.resolve(config.appSettings.modelsPath);
    
    const checkFile = (info, target) => {
      const relPath = path.join(info.repo, target);
      const fullPath = path.join(modelsPath, relPath);
      const exists = fs.existsSync(fullPath);
      let size = 0;
      let isLfsPointer = false;

      if (exists) {
        const stats = fs.statSync(fullPath);
        size = stats.size;
        // LFS pointers are usually < 1KB. 
        // If size is significantly less than the minSize defined in config, it's a pointer.
        const minSize = info.minSize || 1024 * 1024;
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
      modelsPath,
      reasoningModels: modelStatus,
      embeddingModels: embedStatus
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check model health', details: error.message });
  }
}