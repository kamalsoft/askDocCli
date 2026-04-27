// ask-docs/synthesizer.js
// Local LLM Answer Synthesis using Phi-3.5 Mini (Xenova)

import { pipeline, env } from "@huggingface/transformers";
import { loadConfig } from "./config.js";
import path from "path";
import fs from "fs";

let generator = null;

export async function synthesizeAnswer(question, context) {
  const config = loadConfig();
  const settings = config.appSettings;

  if (!generator) {
    let modelKey = settings.activeModel;
    let modelInfo = config.reasoningModels[modelKey];
    const modelsPath = path.resolve(settings.modelsPath);

    // Check if configured model exists, otherwise find the first available one
    const configuredPath = path.join(modelsPath, modelInfo.repo, modelInfo.targetFile);
    if (!fs.existsSync(configuredPath) || fs.statSync(configuredPath).size < settings.minModelSize) {
      console.warn(`⚠️  Configured model ${modelKey} not found at ${configuredPath}`);
      
      const availableModelKey = Object.keys(config.reasoningModels).find(key => {
        const info = config.reasoningModels[key];
        const p = path.join(modelsPath, info.repo, info.targetFile);
        return fs.existsSync(p) && fs.statSync(p).size > settings.minModelSize;
      });

      if (availableModelKey) {
        modelKey = availableModelKey;
        modelInfo = config.reasoningModels[modelKey];
        console.log(`🔄 Found available model on disk. Falling back to: ${modelInfo.name}`);
      } else {
        throw new Error(`❌ No valid models found in ${modelsPath}. Please run ./download_models.sh`);
      }
    }

    // Force offline mode
    env.allowRemoteModels = settings.allowRemoteModels ?? false;
    env.localModelPath = modelsPath;

    // ONNX Threading Optimization
    env.backends.onnx.intraOpNumThreads = settings.intraOpNumThreads;
    env.backends.onnx.interOpNumThreads = settings.interOpNumThreads;
    
    console.log(`📘 [synthesizer] Loading ${modelInfo.name} from: ${env.localModelPath}`);

    generator = await pipeline(
      "text-generation",
      modelInfo.repo,
      {
        dtype: modelInfo.dtype || "q4"
      }
    );
  }

  const prompt = `
Rewrite the answer using ONLY the information in the context.
Do NOT invent details.
Write a clear, concise answer in 3–5 sentences.

Question:
${question}

Context:
${context}

Answer:
`;

  const output = await generator(prompt, {
    max_new_tokens: settings.maxNewTokens,
    temperature: 0.2,
    top_p: 0.9,
    repetition_penalty: 1.1,
    return_full_text: false,
  });

  return output[0].generated_text.trim();
}
