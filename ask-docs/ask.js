// ask.js
import fs from "fs";
import path from "path";
import { embed } from "./embed.js";
import { synthesizeAnswer } from "./synthesizer.js";
import { getRemoteConfig } from "./config.js";

let cachedStore = null;
let cachedBM25Stats = null;

function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1);
}

export async function askDocs(question, onToken = null) {
  const config = await getRemoteConfig();
  const settings = config.appSettings;
  const storePath = path.resolve(settings.storePath);

  const searchTool = async (query) => {
    const qEmbed = await embed(query);
    const { sections } = await performSearch(query, qEmbed, cachedStore, settings);
    return sections.map((i, idx) => `[[${idx + 1}]] Source: ${i.file} > ${i.heading}\n${i.text}`).join("\n\n---\n\n");
  };

  if (!cachedStore) {
    if (!fs.existsSync(storePath)) {
      throw new Error("Vector store not found. Run: ask-docs ingest");
    }
    const rawData = JSON.parse(fs.readFileSync(storePath, "utf8"));
    
    // Handle structured format or legacy array format
    cachedStore = rawData.chunks || rawData;
    cachedBM25Stats = rawData.bm25Stats || null;
  }

  const store = cachedStore;

  // 1. Embed question
  let qEmbedding = null;
  if (!settings.bm25Only) {
    try {
      qEmbedding = await embed(question);
    } catch (err) {
      // Objective: Keyword-only fallback if model fails
      console.warn("⚠️  Embedding model failed to load. Falling back to keyword-only search.");
    }
  } else {
    console.log("🔍 BM25-only mode enabled. Skipping embeddings.");
  }
  
  // 2. Perform Hybrid Search (Vector + BM25)
  const { sections: topSections, scored, hasMoreContext } = await performSearch(question, qEmbedding, store, settings);

  const topScore = topSections[0]?.score ?? 0;
  const threshold = settings.confidenceThreshold ?? 0.12;

  // 3. Fallback mode
  if (topScore < threshold) {
    const { answer } = await synthesizeAnswer(question, "No relevant context.", onToken, 0, searchTool);
    return {
      answer,
      citations: [],
      sections: [],
      confidence: topScore,
      fallback: true
    };
  }

  // 4. Merge context
  const combined = topSections.map((s, idx) => `[[${idx + 1}]] Source: ${s.file} > ${s.heading}\n${s.text}`).join("\n\n---\n\n");

  // 5. LLM synthesis
  const { answer, tps, tokenCount } = await synthesizeAnswer(question, combined, onToken, 0, searchTool);

  // 6. Citations
  const citations = topSections.map(s => {
    return `- ${s.file} :: "${s.heading}" :: lines ${s.startLine}-${s.endLine}`;
  });

  return {
    answer,
    citations,
    sections: topSections,
    confidence: topScore,
    fallback: false,
    hasMoreContext,
    tps,
    tokenCount
  };
}

/**
 * Core search logic combining vector similarity and BM25 keyword scoring.
 */
async function performSearch(query, qEmbedding, store, settings) {
  // Use pre-calculated stats from store, or empty defaults
  const stats = cachedBM25Stats || { avgdl: 1, idf: {} };
  const qTokens = tokenize(query);
  const k1 = 1.2, b = 0.75;

  const scored = store.map(chunk => {
    // Handle potential null embedding for keyword-only mode
    const vScore = qEmbedding ? dot(qEmbedding, chunk.embedding) : 0;

    const docTokens = tokenize(chunk.text);
    const tf = {};
    docTokens.forEach(t => tf[t] = (tf[t] || 0) + 1);
    
    let bm25 = 0;
    qTokens.forEach(token => {
      const termIdf = stats.idf[token] || 0;
      const freq = tf[token] || 0;
      bm25 += termIdf * (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * (docTokens.length / stats.avgdl)));
    });

    // Combine: Semantic similarity [0,1] + Keyword weight [0,N]
    // Weight 0.05 is calibrated for technical documents.
    // If embedding is missing, we use pure BM25.
    const finalScore = qEmbedding ? (vScore + (bm25 * 0.05)) : bm25;
    
    return { ...chunk, score: finalScore, vectorScore: vScore };
  });

  scored.sort((a, b) => b.score - a.score);
  let topSections = scored.slice(0, settings.topK || 5);
  
  const threshold = settings.confidenceThreshold ?? 0.12;
  const totalRelevantCount = scored.filter(s => s.vectorScore >= threshold).length;
  const hasMoreContext = totalRelevantCount > topSections.length;

  return { sections: topSections, scored, hasMoreContext };
}

function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
