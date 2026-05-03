console.log('[BOOTSTRAP] root ask.js initialized');

export default async function handler(req, res) {
  const startTime = Date.now();
  const env = process.env.VERCEL ? 'VERCEL' : 'LOCAL-API';
  console.info(`[${env}] [START] /ask (ROOT) started at ${new Date(startTime).toISOString()}`);
  console.log(`[${env}] [DEBUG] Method: ${req.method}`);
  console.log(`[${env}] Host: ${req.headers.host}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { question, documentId } = req.body;
      console.info(`[${env}] [ROOT] Handling POST /ask for: ${question}`);

      if (!question) {
        console.warn(`[${env}] [ROOT] Received empty question. Returning 400.`);
        return res.status(400).json({ error: "Missing question" });
      }

      console.log(`[${env}] [ROOT-MODEL] Executing local/remote logic...`);
      
      const duration = Date.now() - startTime;
      console.info(`[${env}] [ROOT-SUCCESS] Request finalized in ${duration}ms`);

      res.status(200).json({ 
        answer: `Processed question: "${question}" using remote inference.`,
        latency: duration
      });
    } catch (error) {
      console.error(`[${env}] [ROOT-ERROR] Fatal crash:`, error.stack);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  } else {
    console.warn(`[${env}] [WARN] Method ${req.method} not allowed`);
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}