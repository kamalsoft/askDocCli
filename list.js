// This file was moved from api/list.js to api/docs/list.js
import fs from "fs";
import path from "path";
import { loadConfig } from "../../ask-docs/config.js";

/**
 * Recursively finds all markdown files in a directory.
 */
async function walk(dir, exclude = []) {
  let files = [];
  const list = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of list) {
    if (exclude.includes(entry.name)) continue;
    
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await walk(res, exclude));
    } else if (entry.name.endsWith(".md")) {
      files.push(res);
    }
  }
  return files;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const config = loadConfig();
    const settings = config.appSettings;
    const docsDir = path.resolve(settings.docsPath);

    if (!fs.existsSync(docsDir)) {
      return res.status(404).json({ error: `Docs directory not found: ${docsDir}` });
    }

    const defaultExclude = settings.excludeFolders || ['.git', 'node_modules', 'archive'];
    const absolutePaths = await walk(docsDir, defaultExclude);
    const files = absolutePaths.map(p => path.relative(docsDir, p));

    res.status(200).json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list documentation', details: error.message });
  }
}