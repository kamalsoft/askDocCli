import fs from 'fs';
import path from 'path';
import { loadConfig } from './config.js';

async function verifyOpenRouter(config) {
  const { apiKey, baseUrl } = config.appSettings.openrouter;
  console.log('📡 Verifying OpenRouter connectivity...');
  
  if (!apiKey && (config.appSettings.inferenceMode === 'openrouter' || config.appSettings.inferenceMode === 'auto')) {
    console.warn('⚠️  Warning: No OpenRouter API key found in config or environment.');
    return false;
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (response.ok) {
      console.log('✅ OpenRouter: Connection successful and API key is valid.');
      return true;
    } else {
      const err = await response.json();
      console.error(`❌ OpenRouter: API Error - ${err.error?.message || response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ OpenRouter: Could not reach API - ${error.message}`);
    return false;
  }
}

async function verifyLocalModels(config) {
  const { modelsPath, activeModel } = config.appSettings;
  const root = path.resolve(modelsPath);
  console.log(`📂 Verifying local models in: ${root}`);

  const modelsToCheck = [
    ...Object.values(config.reasoningModels),
    ...Object.values(config.embeddingModels)
  ];

  for (const model of modelsToCheck) {
    const modelDir = path.join(root, model.repo);
    const mainFile = path.join(modelDir, model.targetFile);
    const dataFile = mainFile + '_data';

    if (!fs.existsSync(mainFile)) {
      console.error(`❌ Missing: ${model.name} (${model.repo})`);
      continue;
    }

    const stats = fs.statSync(mainFile);
    const isLfsPointer = stats.size < 2048;

    if (isLfsPointer) {
      console.error(`❌ Error: ${model.name} is a Git LFS pointer. Please download the actual weights.`);
      continue;
    }

    // Check for split weights if model is large
    const needsDataFile = model.minSize > 500000000;
    if (needsDataFile && !fs.existsSync(dataFile)) {
      console.error(`❌ Error: ${model.name} is missing its .onnx_data file.`);
      continue;
    }

    console.log(`✅ Validated: ${model.name}`);
  }
}

async function run() {
  const config = loadConfig();
  const mode = config.appSettings.inferenceMode;

  console.log(`🚀 Starting verification for mode: ${mode}\n`);

  await verifyLocalModels(config);
  
  if (mode === 'openrouter' || mode === 'auto') {
    console.log('');
    const apiOk = await verifyOpenRouter(config);
    if (!apiOk && mode === 'openrouter') {
      console.error('\n🚨 Critical: Inference mode is set to "openrouter" but the API is unreachable.');
      process.exit(1);
    }
  }

  console.log('\n✨ Verification complete.');
}

run();