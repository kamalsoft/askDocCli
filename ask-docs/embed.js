// ask-docs/embed.js
// Local embedding using Xenova Jina Embeddings v2

import { pipeline, env } from "@huggingface/transformers";
import { loadConfig } from "./config.js";
import path from "path";

let embedder = null;

export async function embed(text) {
  const config = loadConfig();

  if (!embedder) {
    const settings = config.appSettings;
    env.allowRemoteModels = false;
    env.localModelPath = path.resolve(settings.modelsPath);

    env.backends.onnx.intraOpNumThreads = settings.intraOpNumThreads;
    env.backends.onnx.interOpNumThreads = settings.interOpNumThreads;
    
    const modelInfo = config.embeddingModels["jina-v2"];
    console.log(`📘 [embed] Loading ${modelInfo.name} from: ${env.localModelPath}`);
    embedder = await pipeline(
      "feature-extraction",
      modelInfo.repo,
      { dtype: "q4" }
    );
  }

  const output = await embedder(text, {
    pooling: "mean",
    normalize: true
  });

  return Array.from(output.data);
}
