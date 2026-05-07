import fs from 'fs';
import path from 'path';
import { getRemoteConfig } from './config.js';

export async function verifyOpenRouter(config) {
  const { apiKey, baseUrl } = config.appSettings.openrouter;
  const results = { ok: false, message: "" };
  
  if (!apiKey && (config.appSettings.inferenceMode === 'openrouter' || config.appSettings.inferenceMode === 'auto')) {
    results.message = 'No OpenRouter API key found in config or environment.';
    return results;
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (response.ok) {
      results.ok = true;
      results.message = 'Connection successful and API key is valid.';
    } else {
      const err = await response.json();
      results.message = `API Error - ${err.error?.message || response.statusText}`;
    }
  } catch (error) {
    results.message = `Could not reach API - ${error.message}`;
  }
  return results;
}

export async function verifyLocalModels(config) {
  const { modelsPath, activeModel } = config.appSettings;
  const root = path.resolve(modelsPath);
  const reports = [];

  const modelsToCheck = [
    ...Object.values(config.reasoningModels),
    ...Object.values(config.embeddingModels)
  ];

  for (const model of modelsToCheck) {
    const modelDir = path.join(root, model.repo);
    const mainFile = path.join(modelDir, model.targetFile);
    const dataFile = mainFile + '_data';

    if (!fs.existsSync(mainFile)) {
      reports.push({ name: model.name, ok: false, error: "File missing" });
      continue;
    }

    const stats = fs.statSync(mainFile);
    const isLfsPointer = stats.size < 2048;

    if (isLfsPointer) {
      reports.push({ name: model.name, ok: false, error: "Git LFS pointer detected" });
      continue;
    }

    // Check for split weights if model is large
    const needsDataFile = model.minSize > 500000000;
    if (needsDataFile && !fs.existsSync(dataFile)) {
      reports.push({ name: model.name, ok: false, error: "Missing .onnx_data file" });
      continue;
    }

    reports.push({ name: model.name, ok: true });
  }
  return reports;
}

export async function runFullVerification() {
  const config = await getRemoteConfig();
  const mode = config.appSettings.inferenceMode;
  const local = await verifyLocalModels(config);
  const remote = (mode !== 'local') ? await verifyOpenRouter(config) : null;
  return { local, remote, mode };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🚀 Starting verification...");
  runFullVerification().then(res => {
    console.log(JSON.stringify(res, null, 2));
    console.log("\n✨ Verification complete.");
  });
}