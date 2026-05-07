// This file was moved from the root to api/docs/search.js
import fs from "fs";
import path from "path";
import { getRemoteConfig } from "../../ask-docs/config.js";

async function walk(dir, exclude = []) {
  let files = [];
  let list;
  try {
    list = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    return [];
  }

  for (const entry of list) {
    if (exclude.includes(entry.name)) continue;
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await walk(res, exclude));
    } else if (entry.name.toLowerCase().endsWith(".md")) {
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

  const { q } = req.query;
  if (!q) return res.status(200).json({ results: [] });

  try {
    const config = await getRemoteConfig();
    const docsDir = path.resolve(config.appSettings.docsPath);
    if (!fs.existsSync(docsDir)) {
      throw new Error(`Docs directory not found at ${docsDir}`);
    }

    const exclude = config.appSettings.excludeFolders || ['.git', 'node_modules', 'archive'];

    const allFiles = await walk(docsDir, exclude);
    const results = allFiles
      .map(p => path.relative(docsDir, p))
      .filter(name => name.toLowerCase().includes(q.toLowerCase()));

    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ 
      error: 'Search failed', 
      details: error.message 
    });
  }
}