import fs from "fs";
import { pipeline } from "@xenova/transformers";
import { loadConfig } from "./config.js";

const config = loadConfig();

/* -------------------------------------------------------
   Load Vector Store
------------------------------------------------------- */
function loadStore() {
  const storePath = config.storePath || "./vector-store/docs.json";

  if (!fs.existsSync(storePath)) {
    throw new Error(`Vector store not found at ${storePath}. Run: ask-docs ingest`);
  }

  const raw = fs.readFileSync(storePath, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Vector store is empty. Run: ask-docs ingest");
  }

  return data;
}

/* -------------------------------------------------------
   Cosine Similarity
------------------------------------------------------- */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1e-8);
}

/* -------------------------------------------------------
   Sentence Splitter
------------------------------------------------------- */
function splitIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------
   Group chunks by section (file + heading)
------------------------------------------------------- */
function groupChunksBySection(chunks) {
  const sections = new Map();

  for (const chunk of chunks) {
    const key = `${chunk.file}::${chunk.heading || "ROOT"}`;

    if (!sections.has(key)) {
      sections.set(key, {
        key,
        file: chunk.file,
        heading: chunk.heading || "ROOT",
        chunks: [],
        score: 0
      });
    }

    sections.get(key).chunks.push(chunk);
  }

  return Array.from(sections.values());
}

/* -------------------------------------------------------
   Main askDocs function
------------------------------------------------------- */
export async function askDocs(question) {
  const store = loadStore();

  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/jina-embeddings-v2-base-en"
  );

  // Embed question
  const qEmb = (await embedder(question, {
    pooling: "mean",
    normalize: true
  })).data;

  // Score chunks
  const scoredChunks = store.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(qEmb, chunk.embedding)
  }));

  // Group by section
  const sections = groupChunksBySection(scoredChunks);

  // Score each section by max chunk score
  for (const section of sections) {
    section.score = section.chunks.reduce(
      (max, c) => (c.score > max ? c.score : max),
      0
    );
  }

  // Pick top sections
  const topSectionCount = config.topSections || 3;
  const topSections = sections
    .sort((a, b) => b.score - a.score)
    .slice(0, topSectionCount);

  // Extract sentences from top sections
  const sentenceEntries = [];

  for (const section of topSections) {
    for (const chunk of section.chunks) {
      const sentences = splitIntoSentences(chunk.text);

      for (const s of sentences) {
        sentenceEntries.push({
          text: s,
          file: chunk.file,
          heading: section.heading,
          startLine: chunk.startLine,
          endLine: chunk.endLine
        });
      }
    }
  }

  if (sentenceEntries.length === 0) {
    return {
      answer: "The documentation does not specify.",
      citations: [],
      sections: []
    };
  }

  // Embed all sentences
  const sentenceTexts = sentenceEntries.map(s => s.text);
  const sentEmb = (await embedder(sentenceTexts, {
    pooling: "mean",
    normalize: true
  })).data;

  // Score sentences
  const scoredSentences = sentenceEntries.map((entry, idx) => ({
    ...entry,
    score: cosineSimilarity(qEmb, sentEmb[idx])
  }));

  // Pick top N sentences
  const topN = config.topSentences || 4;
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  /* -------------------------------------------------------
     Context Windowing
  ------------------------------------------------------- */
  function getSentenceContext(entry, allEntries, windowSize = 1) {
    const index = allEntries.indexOf(entry);
    const start = Math.max(0, index - windowSize);
    const end = Math.min(allEntries.length - 1, index + windowSize);

    return allEntries.slice(start, end + 1);
  }

  let contextWindows = [];

  for (const s of topSentences) {
    const window = getSentenceContext(s, scoredSentences, 1);
    contextWindows.push(...window);
  }

  // Deduplicate
  const merged = [];
  const seenText = new Set();

  for (const s of contextWindows) {
    if (!seenText.has(s.text)) {
      seenText.add(s.text);
      merged.push(s);
    }
  }

  // Sort by original order
  merged.sort((a, b) => a.startLine - b.startLine);

  /* -------------------------------------------------------
     Answer Synthesis (2–4 crisp sentences)
  ------------------------------------------------------- */
  const mergedTexts = merged.map(s => s.text);

  const mergedEmb = (await embedder(mergedTexts, {
    pooling: "mean",
    normalize: true
  })).data;

  const synthesisScored = merged.map((entry, idx) => ({
    ...entry,
    synthScore: cosineSimilarity(qEmb, mergedEmb[idx])
  }));

  const synthN = config.synthSentences || 3;
  const finalSentences = synthesisScored
    .sort((a, b) => b.synthScore - a.synthScore)
    .slice(0, synthN)
    .sort((a, b) => a.startLine - b.startLine);

  const answer = finalSentences.map(s => s.text).join(" ");

  // Build citations
  const seen = new Set();
  const citations = [];

  for (const s of finalSentences) {
    const key = `${s.file}:${s.heading}:${s.startLine}-${s.endLine}`;
    if (seen.has(key)) continue;
    seen.add(key);

    citations.push(
      `- ${s.file} :: "${s.heading}" :: lines ${s.startLine}-${s.endLine}`
    );
  }

  // Build sections for UI (generic, no hardcoding)
  const uiSections = topSections.map(section => ({
    heading: section.heading,
    file: section.file,
    score: section.score,
    preview: section.chunks[0]?.text.slice(0, 200) + "..."
  }));

  return {
    answer,
    citations,
    sections: uiSections
  };
}
