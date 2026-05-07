import fs from "fs";
import path from "path";
import { getRemoteConfig } from "../../ask-docs/config.js";

async function walk(dir, exclude = []) {
  let files = [];
  let list;
  try {
    list = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    // Silently skip directories that can't be read (e.g., permissions)
    return [];
  }

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

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const config = await getRemoteConfig();
    const docsDir = path.resolve(config.appSettings.docsPath);
    
    if (!fs.existsSync(docsDir)) {
      return res.status(404).json({ error: 'Documentation directory not found', path: docsDir });
    }

    const exclude = config.appSettings.excludeFolders || ['.git', 'node_modules', 'archive'];
    const allFiles = await walk(docsDir, exclude);
    const files = allFiles.map(p => path.relative(docsDir, p));

    res.status(200).json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list documentation', details: error.message });
  }
}