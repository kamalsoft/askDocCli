// ask-docs/synthesizer.js
// Local LLM Answer Synthesis using Phi-3.5 Mini (Xenova)

import { pipeline, env, TextStreamer } from "@huggingface/transformers";
import { loadConfig } from "./config.js";
import path from "path";
import fs from "fs";

let generator = null;
let loadedModelRepo = null;

/**
 * Heuristic to detect if the small model has fallen into a repetitive token loop
 */
function isLooping(text) {
  if (!text || text.length < 150) return false;
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (words.length < 20) return false;
  
  const tail = text.slice(-200).toLowerCase();
  const phrase = words.slice(-3).join(" ");
  const occurrences = tail.split(phrase).length - 1;
  
  // If the same phrase appears repeatedly at the end, or vocabulary collapses
  if (phrase.length > 10 && occurrences >= 3) return true;
  const uniqueWords = new Set(words);
  return (uniqueWords.size / words.length) < 0.35; 
}

export async function synthesizeAnswer(question, context, onToken = null, retryAttempt = 0) {
  const config = loadConfig();
  const settings = config.appSettings;

  let modelKey = settings.activeModel || "llama-3.2";
  let modelInfo = config.reasoningModels[modelKey];

  if (!generator || loadedModelRepo !== modelInfo?.repo) {
    const modelsPath = path.resolve(settings.modelsPath);
    // For split models (Phi, Llama, Qwen), the main .onnx file is smaller as weights are in _data
    const defaultMinSize = settings.minModelSize || 1000000;
    const minSize = (modelKey === 'phi-3.5' || modelKey === 'llama-3.2' || modelKey === 'qwen-0.5b') ? 500000000 : defaultMinSize;

    // Check if configured model exists, otherwise find the first available one
    const configuredPath = path.join(modelsPath, modelInfo.repo, modelInfo.targetFile);
    if (!fs.existsSync(configuredPath) || fs.statSync(configuredPath).size < minSize) {
      console.warn(`⚠️  Configured model ${modelKey} not found at ${configuredPath}`);

      const availableModelKey = Object.keys(config.reasoningModels).find(key => {
        const info = config.reasoningModels[key];
        const p = path.join(modelsPath, info.repo, info.targetFile);
        const mSize = (key === 'phi-3.5' || key === 'llama-3.2' || key === 'qwen-0.5b') ? 500000000 : defaultMinSize;
        return fs.existsSync(p) && fs.statSync(p).size >= mSize;
      });

      if (availableModelKey) {
        modelKey = availableModelKey;
        modelInfo = config.reasoningModels[modelKey];
        console.log(`🔄 Found available model on disk. Falling back to: ${modelInfo.name}`);
      } else {
        throw new Error(`❌ No valid models found in ${modelsPath}. Please run ./download_models.sh`);
      }
    }

    // Force offline mode
    env.allowRemoteModels = settings.allowRemoteModels ?? false;
    env.localModelPath = modelsPath;

    // ONNX Threading Optimization
    env.backends.onnx.intraOpNumThreads = settings.intraOpNumThreads;
    env.backends.onnx.interOpNumThreads = settings.interOpNumThreads;
    
    console.log(`📘 [synthesizer] Loading ${modelInfo.name} from: ${env.localModelPath}`);

    generator = await pipeline(
      "text-generation",
      modelInfo.repo,
      {
        dtype: modelInfo.dtype || "q4"
      }
    );
    loadedModelRepo = modelInfo.repo;
  }

  // Setup streaming if a callback is provided
  let streamer = null;
  if (onToken) {
    let answerStarted = false;
    let streamBuffer = "";
    const MAX_THOUGHT_CHARS = 1200; 

    streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      callback_function: (text) => {
        streamBuffer += text;

        if (answerStarted) {
          // Clean the incoming text of any closing tags to prevent UI glitches
          let cleanText = text;
          if (cleanText.includes("</answer>")) {
            cleanText = cleanText.split("</answer>")[0];
            answerStarted = false; // Stop processing further for this stream
          }
          
          if (cleanText && onToken) {
            onToken({ type: "answer", text: cleanText });
          }
        } else {
          // Look for the answer tag in the accumulated buffer to handle split chunks
          const answerTagIndex = streamBuffer.toLowerCase().indexOf("<answer>");
          
          if (answerTagIndex !== -1) {
            answerStarted = true;
            // Send the start signal
            if (onToken) onToken({ type: "answer_start" });

            // Extract content that came AFTER the <answer> tag
            const postTagContent = streamBuffer.slice(answerTagIndex + 8);
            if (postTagContent && onToken) onToken({ type: "answer", text: postTagContent });
            
            // Clear buffer so we don't process it again
            streamBuffer = ""; 
          } else if (streamBuffer.length > MAX_THOUGHT_CHARS) {
            // Fallback: If the model rambles without tags, force the UI to answer state
            answerStarted = true;
            if (onToken) {
              onToken({ type: "answer_start" });
              onToken({ type: "answer", text: streamBuffer.replace(/<thought>/g, "") });
            }
            streamBuffer = "";
          } else {
            // Still thinking - strip the tag from the UI view
            const displayThought = text.replace(/<thought>/g, "");
            if (displayThought && onToken) onToken({ type: "thought", text: displayThought });
          }
        }
      },
    });
  }

  const t = modelInfo.template || { system: "", user: "", assistant: "" };
  const rethinkEnabled = settings.enableRethink ?? true;
  const thoughtMarker = rethinkEnabled ? `${t.assistant}<thought>\n` : `${t.assistant}<answer>\n`;

  // Strict grounding prompt for 1B models with citation instructions
  const prompt = `${t.system}You are a documentation assistant.
Strict Rules:
1. Answer ONLY using the provided Context. 
2. If the context is insufficient, say "I am sorry, but the documentation does not contain this information."
3. Use numerical citations like [1], [2] based on the context snippets.

Format:
<thought> Analyze the context and plan the answer </thought>
<answer> Concise response with citations </answer>

${t.user}Context:
"""
${context}
"""

Question: ${question}${thoughtMarker}`;

  // Scale penalty on retry
  const penalty = retryAttempt > 0 ? 1.6 : settings.repetition_penalty;
  const startTime = Date.now();

  const output = await generator(prompt, {
    max_new_tokens: settings.maxNewTokens + 200, // Extra buffer for reasoning
    temperature: settings.temperature,
    top_p: settings.top_p,
    repetition_penalty: penalty,
    return_full_text: false,
    streamer,
  });

  const durationMs = Date.now() - startTime;
  const fullText = output[0].generated_text;
  const tokenCount = fullText.split(/\s+/).length; // Rough estimate
  const tps = (tokenCount / (durationMs / 1000)).toFixed(2);
  
  if (retryAttempt === 0) {
    console.log(`📊 Stats: ${tokenCount} tokens generated at ${tps} tokens/sec`);
  }

  // Automatic Loop Recovery
  if ((isLooping(fullText) || !fullText.toLowerCase().includes("<answer>")) && retryAttempt < 1) {
    console.warn(`🔄 Model looping or format failed. Retrying with penalty ${penalty + 0.4}...`);
    if (onToken) onToken({ type: "status", text: "Refining response logic..." });
    return await synthesizeAnswer(question, context, onToken, retryAttempt + 1);
  }
  
  if (settings.enableRethink) {
    // Look for the last <answer> tag to handle cases where the model might repeat itself
    const parts = fullText.split(/<answer>/i);
    if (parts.length > 1) {
      const answer = parts[parts.length - 1].split(/<\/answer>/i)[0].trim();
      return { answer, tps, tokenCount };
    }
    
    // Secondary fallback: split by </thought>
    const answer = fullText.split(/<\/thought>/i)[1]?.trim() || fullText.trim();
    return { answer, tps, tokenCount };
  }

  return { 
    answer: fullText.trim(), 
    tps, 
    tokenCount 
  };
}
