console.log('[BOOTSTRAP] api/documentation/get.js module initialized');

import fs from 'fs/promises';
import path from 'path';
import { getRemoteConfig } from "../ask-docs/config.js";

export default async function handler(req, res) {
  const startTime = Date.now();
  const env = process.env.VERCEL ? 'VERCEL' : 'LOCAL-API';
  console.info(`[${env}] [START] /api/documentation/get started at ${new Date(startTime).toISOString()}`);
  console.log(`[${env}] [DEBUG] Query:`, JSON.stringify(req.query));
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log(`[${env}] [DEBUG] Handled OPTIONS preflight`);
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { name } = req.query;
    if (!name) {
      console.warn(`[${env}] [GET-DOC] Attempted to fetch without 'name' parameter.`);
      return res.status(400).send('Missing "name" query parameter.');
    }

    try {
      const config = await getRemoteConfig();
      const docsDir = path.resolve(config.appSettings.docsPath);
      // Resolve the absolute path to prevent traversal attacks
      const filePath = path.resolve(docsDir, name);
      console.log(`[${env}] [FS-RESOLVE] Path: ${filePath}`);

      // Security: Prevent directory traversal outside of the docs folder
      if (!filePath.startsWith(docsDir + path.sep) && filePath !== docsDir) {
        return res.status(403).send('Access denied');
      }

      const content = await fs.readFile(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      console.info(`[${env}] [GET-SUCCESS] Served: ${name} (${content.length} bytes)`);
      return res.status(200).json({ name, content });
    } catch (error) {
      console.error(`[${env}] [FS-ERROR] Failed to read ${name}: ${error.message}`);
      return res.status(404).send('Documentation guide not found.');
    }
  }
  console.warn(`[${env}] [WARN] Method ${req.method} not allowed on this endpoint`);
  return res.status(405).send('Method Not Allowed');
}