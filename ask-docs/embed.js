// ask-docs/embed.js
// Local embedding using Xenova Jina Embeddings v2

import { pipeline, env } from "@huggingface/transformers";
import { getRemoteConfig } from "./config.js";
import path from "path";

let embedder = null;
let loadedEmbedRepo = null;

export async function embed(text) {
  const config = await getRemoteConfig();
  const settings = config.appSettings;
  const modelInfo = config.embeddingModels["jina-v2"];

  // Alternative: Use Jina AI Cloud API in production to avoid bundling heavy models
  if (process.env.VERCEL || settings.cloudEmbeddings) {
    if (!settings.jina.apiKey) {
      throw new Error("JINA_API_KEY is missing. Required for cloud embeddings.");
    }

    const response = await fetch(settings.jina.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.jina.apiKey}`
      },
      body: JSON.stringify({
        model: "jina-embeddings-v2-base-en",
        input: [text]
      })
    });

    const result = await response.json();
    return result.data[0].embedding;
  }

  if (!embedder || loadedEmbedRepo !== modelInfo.repo) {
    env.allowRemoteModels = false;
    env.localModelPath = path.resolve(settings.modelsPath);

    env.backends.onnx.intraOpNumThreads = settings.intraOpNumThreads;
    env.backends.onnx.interOpNumThreads = settings.interOpNumThreads;
    
    console.log(`📘 [embed] Loading ${modelInfo.name} from: ${env.localModelPath}`);
    embedder = await pipeline(
      "feature-extraction",
      modelInfo.repo,
      { dtype: "q4" }
    );
    loadedEmbedRepo = modelInfo.repo;
  }

  const output = await embedder(text, {
    pooling: "mean",
    normalize: true
  });

  return Array.from(output.data);
}
