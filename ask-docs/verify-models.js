#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { loadConfig } from './config.js';

const config = loadConfig();
const modelsPath = path.resolve(config?.appSettings?.modelsPath || "./models");
const shouldReDownload = process.argv.includes('--re-download');
const downloadScript = path.join(path.dirname(import.meta.url.replace('file://', '')), 'download_models.sh');

async function getHash(filePath, size) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    let bytesRead = 0;

    stream.on('error', err => reject(err));
    stream.on('data', chunk => {
      bytesRead += chunk.length;
      const progress = ((bytesRead / size) * 100).toFixed(1);
      if (process.stdout.isTTY) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(2);
        process.stdout.write(`⏳ Hashing: ${progress}% [${path.basename(filePath)}]`);
      }
      hash.update(chunk);
    });
    stream.on('end', () => {
      if (process.stdout.isTTY) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(2);
      }
      resolve(hash.digest('hex'));
    });
  });
}

async function verify() {
  console.log(`🔍 Verifying model integrity in: ${modelsPath}\n`);
  let corruptionFound = false;

  const models = [
    ...Object.values(config.reasoningModels),
    ...Object.values(config.embeddingModels)
  ];

  for (const model of models) {
    const modelDir = path.join(modelsPath, model.repo);
    const onnxFile = path.join(modelDir, model.targetFile);
    const dataFile = onnxFile + '_data';

    const filesToVerify = [onnxFile];
    // Mandatory sidecar check for split-weight models
    const isSplitModel = model.repo.includes('Llama-3.2') || model.repo.includes('Phi-3.5') || model.repo.includes('Qwen2.5');
    
    if (isSplitModel || fs.existsSync(dataFile)) filesToVerify.push(dataFile);

    console.log(`📦 Model: ${model.name}`);

    for (const file of filesToVerify) {
      if (!fs.existsSync(file)) {
        console.log(`  ❌ Missing: ${path.basename(file)}`);
        corruptionFound = true;
        continue;
      }

      const stats = fs.statSync(file);
      
      if (stats.size < 2048) {
        console.log(`  ❌ ${path.basename(file)} is a Git LFS pointer (${stats.size} bytes). Download failed!`);
        console.log(`  🧹 Removing corrupt file: ${path.basename(file)}`);
        fs.unlinkSync(file);
        corruptionFound = true;
      } else {
        const hash = await getHash(file, stats.size);
        console.log(`✅ ${path.basename(file)}: ${hash}`);
      }
    }
    console.log('');
  }

  if (corruptionFound && shouldReDownload) {
    console.log(chalk?.cyan ? chalk.cyan('🔄 Corruption/Missing files found. Triggering re-download...') : '🔄 Corruption/Missing files found. Triggering re-download...');
    try {
      execSync(`bash "${downloadScript}"`, { stdio: 'inherit' });
    } catch (err) {
      console.error('❌ Re-download failed:', err.message);
    }
  } else if (corruptionFound) {
    console.log('💡 Tip: Run this script with --re-download to automatically fix these issues.');
  }
}

verify().catch(console.error);