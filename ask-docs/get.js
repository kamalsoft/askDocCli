// This file was moved from the root to api/docs/get.js
import fs from "fs";
import path from "path";
import { getRemoteConfig } from "../../ask-docs/config.js";

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
    const docsDir = path.resolve(config.appSettings.docsPath);
    // Resolve the absolute path to prevent traversal attacks
    const filePath = path.resolve(docsDir, name);

    // Security: Prevent directory traversal outside of the docs folder
    if (!filePath.startsWith(docsDir + path.sep) && filePath !== docsDir) {
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