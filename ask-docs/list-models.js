// ask-docs/list-models.js
import fs from "fs";
import path from "path";
import { loadConfig } from "./config.js";

const config = loadConfig();
const modelsPath = path.resolve(config.modelsPath);

console.log(`🔍 Checking local models in: ${modelsPath}\n`);

// Group models for a complete check
const modelGroups = [
    { label: "🧠 Reasoning Models", models: config.reasoningModels },
    { label: "🔡 Embedding Models", models: config.embeddingModels || (config.embeddingModel ? { "default": config.embeddingModel } : {}) }
];

for (const group of modelGroups) {
    console.log(`--- ${group.label} ---`);
    for (const [key, info] of Object.entries(group.models)) {
    const modelDir = path.join(modelsPath, info.repo);
    const expectedPath = path.join(modelDir, info.targetFile);
    const exists = fs.existsSync(expectedPath);
    
    const dataPath = expectedPath + "_data";
    const dataExists = fs.existsSync(dataPath);
    
    // Check for critical JSON files
    const tokenizerExists = fs.existsSync(path.join(modelDir, "tokenizer.json"));
    const configExists = fs.existsSync(path.join(modelDir, "config.json"));
    
    let status = "❌ Missing";
    let sizeStr = "";
    let totalSizeBytes = 0;
    let actualFile = "None";
    let jsonStatus = "";

    if (exists) {
        const stats = fs.statSync(expectedPath);
        totalSizeBytes = stats.size;

        if (stats.size < 2000) {
            status = "⚠️  Pointer (LFS/Error)";
        } else if (dataExists) {
            // If main file is small (graph) but _data exists, it's a split model
            status = "✅ Available (Split Weights)";
            totalSizeBytes += fs.statSync(dataPath).size;
            actualFile = `${info.targetFile} (+ data)`;
            
            if (totalSizeBytes > 3 * 1024 * 1024 * 1024) {
                status = "⚠️  Wrong Quantization? (Too large for 4-bit)";
            }
        } else if (stats.size < 800 * 1024 * 1024 && (key === 'phi-3.5' || key === 'llama-3.2') && !dataExists) {
            status = "❌ Missing Weights Data (.onnx_data)";
            actualFile = info.targetFile;
        } else if (stats.size < 100 * 1024 * 1024) { // Less than 100MB
            status = "⚠️  Suspiciously Small (Likely Corrupt)";
        } else {
            status = "✅ Available";
            actualFile = info.targetFile;
        }
        sizeStr = `(${(totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB)`;
    } else if (fs.existsSync(modelDir)) {
        // Look for any onnx files in the repo folder to help the user identify mismatches
        const onnxDir = path.join(modelDir, "onnx");
        if (fs.existsSync(onnxDir)) {
            const files = fs.readdirSync(onnxDir).filter(f => f.endsWith(".onnx"));
            if (files.length > 0) {
                const stats = fs.statSync(path.join(onnxDir, files[0]));
                status = "⚠️  Found weights with DIFFERENT name";
                actualFile = `onnx/${files[0]}`;
                sizeStr = `(${(stats.size / (1024 * 1024 * 1024)).toFixed(2)} GB)`;
            }
        }
    }

    if (!tokenizerExists || !configExists) {
        jsonStatus = ` (Missing: ${!tokenizerExists ? "tokenizer.json " : ""}${!configExists ? "config.json" : ""})`;
    }

    console.log(`- ${info.name} [${key}]`);
    console.log(`  Repo: ${info.repo}`);
    console.log(`  Configured: ${info.targetFile}`);
    console.log(`  Found On Disk: ${actualFile}`);
    console.log(`  Status: ${status} ${sizeStr}${jsonStatus}\n`);
}
}