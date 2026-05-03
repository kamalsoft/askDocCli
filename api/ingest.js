import { ingestDocs } from "../ask-docs/ingest.js";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { force, debug } = req.body;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    const onProgress = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    try {
      await ingestDocs({ force, debug, onProgress });
      return res.end();
    } catch (err) {
      onProgress({ type: "error", message: err.message });
      return res.end();
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}