// ask.js
import fs from "fs";
import path from "path";
import { embed } from "./embed.js";
import { synthesizeAnswer } from "./synthesizer.js";
import { loadConfig } from "./config.js";

let cachedStore = null;

export async function askDocs(question, onToken = null) {
  const config = loadConfig();
  const settings = config.appSettings;
  const storePath = path.resolve(settings.storePath);

  if (!cachedStore) {
    if (!fs.existsSync(storePath)) {
      throw new Error("Vector store not found. Run: ask-docs ingest");
    }
    const rawData = JSON.parse(fs.readFileSync(storePath, "utf8"));
    
    // Handle structured format or legacy array format
    cachedStore = rawData.chunks || rawData;
  }

  const store = cachedStore;

  // 1. Embed question
  const qEmbedding = await embed(question);

  // 2. Score chunks
  const scored = store.map(chunk => ({
    ...chunk,
    score: dot(qEmbedding, chunk.embedding)
  }));

  scored.sort((a, b) => b.score - a.score);

  // 1.5 Reranker Step: Broad retrieval followed by filtering
  let topSections = scored.slice(0, settings.rerankTopK || 10);
  
  if (settings.enableReranker) {
    const topHeading = topSections[0]?.heading;
    // Boost chunks that belong to the same heading as the top match
    topSections = topSections.map(s => ({
      ...s,
      rerankScore: s.score + (s.heading === topHeading ? 0.05 : 0)
    })).sort((a, b) => b.rerankScore - a.rerankScore);
  }

  topSections = topSections.slice(0, settings.topK || 5);

  const topScore = topSections[0]?.score ?? 0;
  const threshold = settings.confidenceThreshold ?? 0.12;

  // 3. Fallback mode
  if (topScore < threshold) {
    const llmAnswer = await synthesizeAnswer(question, "No relevant context.", onToken);
    return {
      answer: llmAnswer,
      citations: [],
      sections: [],
      confidence: topScore,
      fallback: true
    };
  }

  // 4. Merge context
  const combined = topSections.map(s => s.text).join("\n\n");

  // 5. LLM synthesis
  const llmAnswer = await synthesizeAnswer(question, combined, onToken);

  // 6. Citations
  const citations = topSections.map(s => {
    return `- ${s.file} :: "${s.heading}" :: lines ${s.startLine}-${s.endLine}`;
  });

  return {
    answer: llmAnswer,
    citations,
    sections: topSections,
    confidence: topScore,
    fallback: false
  };
}

function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
