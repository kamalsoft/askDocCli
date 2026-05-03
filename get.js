// Vercel serverless function to serve documentation guides
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { name } = req.query;

    if (!name) {
      return res.status(400).send('Missing "name" query parameter.');
    }

    // Look for the documentation folder relative to the UI root
    const filePath = path.join(process.cwd(), 'documentation', name);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(content);
    } catch (error) {
      return res.status(404).send('Documentation guide not found.');
    }
  }
  return res.status(405).send('Method Not Allowed');
}