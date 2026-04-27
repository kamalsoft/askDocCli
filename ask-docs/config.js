import fs from "fs";
import path from "path";

const DEFAULT_CONFIG = {
  appSettings: {
    docsPath: "../docs",
    storePath: "./vector-store/docs.json",
    cachePath: "./vector-store/cache.json",
    modelsPath: "./models",
    activeModel: "llama-3.2", // Switched from phi-3.5 for speed
    allowRemoteModels: false,
    chunkChars: 1200,
    topK: 5,
    confidenceThreshold: 0.12,
    ingestVersion: 1,
    // ONNX Threading optimization
    intraOpNumThreads: 4, 
    interOpNumThreads: 4,
    maxNewTokens: 256,
    minModelSize: 100000000 // 100MB default to catch LFS pointers
  },
  // Registry of supported small/tiny reasoning models
  reasoningModels: {
    "llama-3.2": {
      name: "Llama 3.2 1B Instruct",
      repo: "onnx-community/Llama-3.2-1B-Instruct",
      targetFile: "onnx/model_q4.onnx",
      dtype: "q4",
      minSize: 600000000 // ~600MB minimum for 1B Q4
    },
    "phi-3.5": {
      name: "Phi 3.5 Mini Instruct",
      repo: "onnx-community/Phi-3.5-mini-instruct-ONNX-GQA",
      targetFile: "onnx/model_q4.onnx",
      dtype: "q4",
      minSize: 600000000 // ~650MB for the graph, weights are in _data
    },
    "qwen-0.5b": {
      name: "Qwen 2.5 0.5B Instruct (Tiny)",
      repo: "onnx-community/Qwen2.5-0.5B-Instruct",
      targetFile: "onnx/model_q4.onnx",
      dtype: "q4"
    }
  },
  embeddingModels: {
    "jina-v2": {
      name: "Jina Embeddings v2 (Base)",
      repo: "Xenova/jina-embeddings-v2-base-en",
      targetFile: "onnx/model_q4.onnx"
    }
  }
};

export function loadConfig() {
  const configPath = path.resolve("ask-docs.config.json");

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const userConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  // Deep merge appSettings to prevent "undefined" path errors
  return { 
    ...DEFAULT_CONFIG, 
    ...userConfig,
    appSettings: {
      ...DEFAULT_CONFIG.appSettings,
      ...(userConfig.appSettings || {})
    }
  };
}
