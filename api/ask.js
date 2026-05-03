console.log('[BOOTSTRAP] api/ask.js initialized');
import { askDocs } from "../ask-docs/ask.js";

export default async function handler(req, res) {
  const startTime = Date.now();
  const env = process.env.VERCEL ? 'VERCEL' : 'LOCAL-API';
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({ error: "Missing question" });
      }

      // Support streaming via SSE protocol
      if (req.headers.accept === 'text/event-stream') {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendSSE = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

        // Phase 1: Retrieval status (Thought Token)
        sendSSE({ type: 'thought', text: 'Searching documentation and calculating relevance scores...' });

        let answerStarted = false;
        const result = await askDocs(question, (token) => {
          // Phase 2: Signal transition from retrieval to answering
          if (!answerStarted) {
            sendSSE({ type: 'answer_start' });
            answerStarted = true;
          }

          if (typeof token === 'string') {
            sendSSE({ type: 'answer', text: token });
          } else {
            // Pass through typed objects (like status or thought) if emitted by synthesizer
            sendSSE(token);
          }
        });

        // Phase 3: Final payload with citations and timing
        sendSSE({ done: true, ...result, latency: Date.now() - startTime });
        return res.end();
      }

      // Standard JSON response logic
      const result = await askDocs(question);
      const duration = Date.now() - startTime;

      res.status(200).json({ ...result, latency: duration });
    } catch (error) {
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        return res.end();
      }
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}