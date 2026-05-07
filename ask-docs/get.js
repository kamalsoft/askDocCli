// This file was moved from the root to api/docs/get.js
import fs from "fs";
import path from "path";
import { getRemoteConfig } from "./config.js";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Missing "name" parameter' });

  try {
    const config = await getRemoteConfig();

    // Robust path resolution: handle internal guides vs user docs
    const isInternalDoc = req.url.includes('/api/documentation/') || req.headers?.referer?.includes('/api/documentation/');
    console.log(`Is internal doc: ${isInternalDoc}`);
    const docsDir = isInternalDoc 
      ? path.resolve(process.cwd(), 'api', 'documentation')
      : path.resolve(process.cwd(), config.appSettings.docsPath.replace(/^(\.\.\/|\.\/)/, ''));

    // Resolve the absolute path to prevent traversal attacks
    const filePath = path.resolve(docsDir, name);

    const normalizedDocsDir = docsDir.endsWith(path.sep) ? docsDir : docsDir + path.sep;
    if (!filePath.startsWith(normalizedDocsDir) && filePath !== docsDir) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    res.status(200).json({ 
      name, 
      content 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to read file', 
      details: error.message 
    });
  }
}