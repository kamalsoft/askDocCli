import http from "http";
import { askDocs } from "../ask.js";

const PORT = 5174;

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  if (req.method === "POST" && req.url === "/ask") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const question = parsed.question || "";

        if (!question.trim()) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          });
          return res.end(JSON.stringify({ error: "Missing 'question' field" }));
        }

        const { answer, citations, sections } = await askDocs(question);

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });

        res.end(
          JSON.stringify({
            answer,
            citations,
            sections
          })
        );
      } catch (err) {
        console.error("Error in /ask:", err);
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        res.end(JSON.stringify({ error: err.message || "Internal Server Error" }));
      }
    });

    return;
  }

  // Fallback for unknown routes
  res.writeHead(404, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`🌐 Web API running at http://localhost:${PORT}`);
});
