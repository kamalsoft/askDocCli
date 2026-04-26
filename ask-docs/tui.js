import readline from "readline";
import { askDocs } from "./ask.js";
import { openPanelUI } from "./panel.js";

/* -------------------------------------------------------
   Built‑in text wrapper
------------------------------------------------------- */
function wrap(text, width = 80) {
  const words = text.split(" ");
  let line = "";
  const lines = [];

  for (const w of words) {
    if ((line + w).length > width) {
      lines.push(line.trim());
      line = "";
    }
    line += w + " ";
  }

  if (line.trim().length > 0) {
    lines.push(line.trim());
  }

  return lines.join("\n");
}

/* -------------------------------------------------------
   Chat Mode (Terminal.app safe)
------------------------------------------------------- */
export async function askDocsTUI() {
  console.clear();
  console.log("📘 ask-docs interactive mode");
  console.log("Type your question. Press F2 for panel mode. Ctrl+C to exit.\n");

  // CRITICAL FIX: raw mode OFF
  if (process.stdin.isTTY) process.stdin.setRawMode(false);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "ask-docs> "
  });

  readline.emitKeypressEvents(process.stdin);

  process.stdin.on("keypress", async (str, key) => {
    if (key.name === "f2") {
      // CRITICAL FIX: remove all listeners + raw mode OFF
      process.stdin.removeAllListeners("keypress");
      if (process.stdin.isTTY) process.stdin.setRawMode(false);

      rl.pause();

      console.clear();
      await openPanelUI();

      // Restore chat mode cleanly
      console.clear();
      console.log("📘 Returned to chat mode\n");

      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);

      rl.resume();
      rl.prompt();
    }
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const question = line.trim();
    if (!question) {
      rl.prompt();
      return;
    }

    console.log("\n🔍 Searching...\n");

    try {
      const result = await askDocs(question);

      const lines = result.trim().split("\n");
      const answerLines = [];
      const citationLines = [];

      let inCitations = false;

      for (const l of lines) {
        if (l.includes("--- CITATIONS ---")) {
          inCitations = true;
          continue;
        }
        if (!inCitations) answerLines.push(l);
        else citationLines.push(l);
      }

      console.log("🟦 Answer:\n");
      console.log(wrap(answerLines.join(" "), 80) + "\n");

      console.log("📎 Citations:");
      console.log(citationLines.join("\n") || "No citations\n");
    } catch (err) {
      console.error("❌ Error:", err.message);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nGoodbye!");
    process.exit(0);
  });
}
