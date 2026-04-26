import fs from "fs";
import path from "path";

const DEFAULT_CONFIG = {
  docsPath: "../docs",
  storePath: "./vector-store/docs.json",
  cachePath: "./vector-store/cache.json",
  chunkChars: 1200,
  topK: 5,
  ingestVersion: 1
};

export function loadConfig() {
  const configPath = path.resolve("ask-docs.config.json");

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const userConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return { ...DEFAULT_CONFIG, ...userConfig };
}
