// ask-docs-UI/uiServer.js

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Import Engine logic from the CLI folder
import { askDocs } from "../ask-docs/ask.js";
import { ingestDocs } from "../ask-docs/ingest.js";
import { runFullVerification } from "../ask-docs/verify-models.js";
import { loadConfig } from "../ask-docs/config.js";

// CRITICAL: Logic in ask-docs expects to be run from the engine directory
// for relative path resolution of the vector store and models.
const engineRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../ask-docs");
process.chdir(engineRoot);

const config = loadConfig();
const PORT = config.port || 5174;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(msg) {
  console.log(`🖥️  [UI-Server] ${msg}`);
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

async function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch (e) { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const baseURL = `http://${req.headers.host || 'localhost'}`;
  const parsedUrl = new URL(req.url, baseURL);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams);

  // Health
  if (pathname === "/health") {
    return sendJSON(res, 200, { status: "ok" });
  }

  // API endpoints (consuming CLI logic)
  if (pathname === "/api/docs/list") {
    try {
      const docsDir = path.resolve(config.appSettings.docsPath);
      const files = await fs.promises.readdir(docsDir);
      return sendJSON(res, 200, files.filter(f => f.endsWith(".md")));
    } catch (e) {
      return sendJSON(res, 500, { error: "Could not list docs" });
    }
  }

  if (pathname === "/api/docs/get") {
    const name = query.name;
    if (!name) return sendJSON(res, 400, { error: "Missing ?name=" });
    const filePath = path.resolve(config.appSettings.docsPath, name);
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
      return res.end(content);
    } catch {
      return sendJSON(res, 404, { error: "File not found" });
    }
  }

  if (pathname === "/api/docs/search") {
    const q = query.q?.toLowerCase() || "";
    const docsDir = path.resolve(config.appSettings.docsPath);
    const files = await fs.promises.readdir(docsDir);
    const results = files.filter(f => f.endsWith(".md") && f.toLowerCase().includes(q));
    return sendJSON(res, 200, results);
  }

  if (pathname === "/api/models/summary") {
    const modelsPath = path.resolve(config.appSettings.modelsPath);
    const summary = await Promise.all(Object.entries(config.reasoningModels).map(async ([key, info]) => {
      const expectedPath = path.join(modelsPath, info.repo, info.targetFile);
      let status = "❌ Missing";
      let sizeBytes = 0;
      try {
        const stats = await fs.promises.stat(expectedPath);
        sizeBytes = stats.size;
        const dataPath = expectedPath + "_data";
        const hasSplitData = await fs.promises.access(dataPath).then(() => true).catch(() => false);
        if (sizeBytes < 2000) status = "⚠️ Pointer (LFS)";
        else if (hasSplitData) status = "✅ Available (Split)";
        else if (sizeBytes < (info.minSize || 1000000)) status = info.isSplit ? "❌ Missing .onnx_data" : "⚠️ Corrupt";
        else status = "✅ Available";
      } catch {}
      return { id: key, name: info.name, status, isActive: key === config.appSettings.activeModel };
    }));
    return sendJSON(res, 200, summary);
  }

  if (pathname === "/api/config" && req.method === "GET") {
    return sendJSON(res, 200, config.appSettings);
  }

  if (pathname === "/api/config" && req.method === "POST") {
    const updates = await getRequestBody(req);
    Object.assign(config.appSettings, updates);
    return sendJSON(res, 200, { status: "success" });
  }

  if (pathname === "/api/ingest" && req.method === "POST") {
    try {
      await ingestDocs();
      return sendJSON(res, 200, { status: "success" });
    } catch (err) {
      return sendJSON(res, 500, { error: err.message });
    }
  }

  if (pathname === "/api/models/verify" && req.method === "POST") {
    const results = await runFullVerification();
    return sendJSON(res, 200, results);
  }

  if (pathname === "/ask" && req.method === "POST") {
    const { question } = await getRequestBody(req);
    const acceptHeader = req.headers.accept || "";
    const isStreaming = acceptHeader.includes("text/event-stream");

    let onToken = null;
    if (isStreaming) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });
      onToken = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }

    const result = await askDocs(question, onToken);
    
    if (isStreaming) {
      res.write(`data: ${JSON.stringify({ done: true, ...result })}\n\n`);
      return res.end();
    } else {
      return sendJSON(res, 200, result);
    }
  }

  // Static File Serving (hosting built React assets)
  const distDir = path.resolve(__dirname, "dist");
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "").replace(/\\/g, "/");
  let filePath = path.join(distDir, safePath === "/" ? "index.html" : safePath);

  if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
    filePath = path.join(distDir, "index.html"); // SPA Fallback
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    const type = ext === ".html" ? "text/html" : ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : "text/plain";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  log(`🚀 UI and API Server running at http://localhost:${PORT}`);
});