// /Users/kamalsoft/dev/Project/askDocCli/ask-docs-UI/api/documentation/get.js

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Set CORS headers for Vercel deployment
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { name } = req.query; // Vercel serverless functions parse query params into req.query

    if (!name) {
      return res.status(400).send('Missing "name" query parameter.');
    }

    // IMPORTANT: Assuming 'documentation' folder is now inside 'ask-docs-UI'
    const filePath = path.join(process.cwd(), 'documentation', name);

    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(content);
    } catch (error) {
      console.error(`Error reading documentation file ${name}:`, error);
      return res.status(404).send('Documentation file not found.');
    }
  }

  return res.status(405).send('Method Not Allowed');
}