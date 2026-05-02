import fs from "fs";
import path from "path";

const DEFAULT_CONFIG = {
  appSettings: {
    docsPath: "../docs",
    storePath: "./vector-store/docs.json",
    cachePath: "./vector-store/cache.json",
    modelsPath: "./models",
    activeModel: "lama-3.2", // Switched from phi-3.5 for speed
    activeProfile: "standard",
    allowRemoteModels: false,
    chunkChars: 600,        // Further reduction: 600 chars is ~100-150 tokens.
    topK: 2,                // Extreme focus: Only send the 2 most relevant chunks.
    confidenceThreshold: 0.12,
    ingestVersion: 1,
    // ONNX Threading optimization
    intraOpNumThreads: 0,    // 0 = Auto-detect (Let ONNX optimize for your specific CPU)
    interOpNumThreads: 1,    
    maxNewTokens: 256,
    minModelSize: 100000000,
    temperature: 0.0,        // Maximum precision.
    top_p: 0.9,
    repetition_penalty: 1.2, // Base penalty to prevent loops
    rerankTopK: 5,          // Reduced to prevent instruction-drift in small models
    enableReranker: true,   // High-fidelity chunk selection
    enableRethink: true,    // Two-pass reasoning
  },
  profiles: {
    standard: {}, // Uses defaults above
    fast: {
      topK: 1,              // Absolute minimum context
      chunkChars: 500,      // Tiny chunks for fast prefill
      maxNewTokens: 128,    // Shorter answers
      enableRethink: false, // Skip internal reasoning pass
      enableReranker: false,// Skip secondary sorting
      intraOpNumThreads: 2  // Prevent CPU thermal throttling
    }
  },
  // Registry of supported small/tiny reasoning models
  reasoningModels: {
    "llama-3.2": {
      name: "Llama 3.2 1B Instruct",
      repo: "onnx-community/Llama-3.2-1B-Instruct",
      targetFile: "onnx/model_q4.onnx",
      dtype: "q4",
      minSize: 600000000,
      template: {
        system: "<|start_header_id|>system<|end_header_id|>\n\n",
        user: "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n",
        assistant: "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
      }
    },
    "phi-3.5": {
      name: "Phi 3.5 Mini Instruct",
      repo: "onnx-community/Phi-3.5-mini-instruct-ONNX-GQA",
      targetFile: "onnx/model_q4.onnx",
      dtype: "q4",
      minSize: 600000000,
      template: {
        system: "<|system|>\n",
        user: "<|user|>\n",
        assistant: "<|assistant|>\n"
      }
    },
    "qwen-0.5b": {
      name: "Qwen 2.5 0.5B Instruct (Tiny)",
      repo: "onnx-community/Qwen2.5-0.5B-Instruct",
      targetFile: "onnx/model_q4.onnx",
      dtype: "q4",
      minSize: 300000000
    }
  },
  embeddingModels: {
    "jina-v2": {
      name: "Jina Embeddings v2 (Base)",
      repo: "Xenova/jina-embeddings-v2-base-en",
      targetFile: "onnx/model_q4.onnx",
      minSize: 100000000 // 100MB minimum
    }
  }
};

export function loadConfig() {
  const configPath = path.resolve("ask-docs.config.json");

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const userConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const activeProfileKey = userConfig.appSettings?.activeProfile || DEFAULT_CONFIG.appSettings.activeProfile;
  const profileSettings = DEFAULT_CONFIG.profiles[activeProfileKey] || {};

  const finalConfig = { 
    ...DEFAULT_CONFIG, 
    ...userConfig,
    appSettings: {
      ...DEFAULT_CONFIG.appSettings,
      ...profileSettings,
      ...(userConfig.appSettings || {})
    }
  };

  // Quick validation
  const p = path.resolve(finalConfig.appSettings.docsPath);
  if (!fs.existsSync(p)) {
    console.warn(`⚠️ Warning: docsPath does not exist: ${p}`);
  }

  return finalConfig;
}
