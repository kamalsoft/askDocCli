// ask-docs/server/webServer.js

import http from "http";
import fs from "fs";
import path from "path";
import { askDocs } from "../ask.js";
import { loadConfig } from "../config.js";

const config = loadConfig();
const PORT = config.port || 5174;

function log(msg) {
  console.log(`📘 [server] ${msg}`);
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendText(res, status, text) {
  res.writeHead(status, {
    "Content-Type": "text/plain",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  const baseURL = `http://${req.headers.host || 'localhost'}`;
  const parsedUrl = new URL(req.url, baseURL);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams);
console.log(`➡ ${parsedUrl} ${pathname}`);
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  // Health
  if (pathname === "/health") {
    return sendJSON(res, 200, { status: "ok" });
  }

  // List docs
  if (pathname === "/api/docs/list") {
    const docsDir = path.resolve(config.appSettings.docsPath);
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith(".md"));
    return sendJSON(res, 200, files);
  }

  // Get doc
  if (pathname === "/api/docs/get") {
    const name = query.name;
    if (!name) return sendJSON(res, 400, { error: "Missing ?name=" });

    const filePath = path.resolve(config.appSettings.docsPath, name);
    if (!fs.existsSync(filePath)) {
      return sendJSON(res, 404, { error: "File not found" });
    }

    const content = fs.readFileSync(filePath, "utf8");
    return sendText(res, 200, content);
  }

  // Search docs
  if (pathname === "/api/docs/search") {
    const q = query.q?.toLowerCase() || "";
    const docsDir = path.resolve(config.appSettings.docsPath);
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith(".md"));

    const results = files.filter(f => f.toLowerCase().includes(q));
    return sendJSON(res, 200, results);
  }

  // Models summary
  if (pathname === "/api/models/summary") {
    const modelsPath = path.resolve(config.appSettings.modelsPath);
    const summary = Object.entries(config.reasoningModels).map(([key, info]) => {
      const modelDir = path.join(modelsPath, info.repo);
      const expectedPath = path.join(modelDir, info.targetFile);
      const exists = fs.existsSync(expectedPath);
      
      let status = "❌ Missing";
      let sizeBytes = 0;

      if (exists) {
        const stats = fs.statSync(expectedPath);
        sizeBytes = stats.size;
        const minSize = info.minSize || config.appSettings.minModelSize;

        if (sizeBytes < 2000) status = "⚠️ Pointer (LFS)";
        else if (fs.existsSync(expectedPath + "_data")) {
            status = "✅ Available (Split)";
            sizeBytes += fs.statSync(expectedPath + "_data").size;
        } else if (sizeBytes < minSize) {
            status = (key === 'phi-3.5' || key === 'llama-3.2') ? "❌ Missing .onnx_data" : "⚠️ Corrupt/Partial";
        } else {
            status = "✅ Available";
        }
      }

      return {
        id: key,
        name: info.name,
        status,
        sizeGB: (sizeBytes / (1024 * 1024 * 1024)).toFixed(2),
        isActive: key === config.appSettings.activeModel
      };
    });
    return sendJSON(res, 200, summary);
  }

  // Ask endpoint
  if (pathname === "/ask" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      try {
        const { question } = JSON.parse(body || "{}");
        if (!question) return sendJSON(res, 400, { error: "Missing 'question'" });

        log(`Q: ${question}`);
        const startTime = Date.now();
        
        // Detect if client wants a stream (Web UI) or a standard JSON response (CURL/API)
        const acceptHeader = req.headers.accept || "";
        const isStreaming = acceptHeader.includes("text/event-stream");

        let onToken = null;
        if (isStreaming) {
          // Set headers for Server-Sent Events
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          });

          onToken = (payload) => {
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
          };
        }

        let { answer, tps, tokenCount, ...metadata } = await askDocs(question, onToken);
        const result = { answer, ...metadata };

        // Strip embeddings from sections to reduce payload size
        if (result.sections) {
          result.sections = result.sections.map(s => {
            const { embedding, ...rest } = s;
            return rest;
          });
        }

        // Debug mode
        if (query.debug === "chunks") {
          return sendJSON(res, 200, {
            chunks: result.sections.map(s => ({
              file: s.file,
              heading: s.heading,
              score: s.score,
              preview: s.text.slice(0, 200)
            }))
          });
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log(`A: Generated answer in ${duration}s`);

        if (isStreaming) {
          // Send final metadata and close the SSE stream
          res.write(`data: ${JSON.stringify({ 
          done: true, 
          tps,
          tokenCount,
          ...result 
        })}\n\n`);
        return res.end();
        } else {
          return sendJSON(res, 200, result);
        }
      } catch (err) {
        console.error("Error:", err);
        return sendJSON(res, 500, { error: "Internal server error" });
      }
    });
    return;
  }

  // Static hosting for Web UI
  const webDist = path.resolve("web/dist");
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(webDist, safePath === "/" ? "index.html" : safePath);

  // Security Check: Ensure path is within webDist
  if (fs.existsSync(filePath) && filePath.startsWith(webDist) && !fs.lstatSync(filePath).isDirectory()) {
    const ext = path.extname(filePath);
    const type =
      ext === ".html" ? "text/html" :
      ext === ".js" ? "application/javascript" :
      ext === ".css" ? "text/css" :
      "text/plain";

    res.writeHead(200, { "Content-Type": type });
    // Use Streams for better memory efficiency
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return;
  }

  sendJSON(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  log(`🚀 Ask-Docs API running at http://localhost:${PORT}`);
});
