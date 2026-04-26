import blessed from "blessed";
import { askDocs } from "./ask.js";

/* -------------------------------------------------------
   Fullscreen Blessed UI (Terminal.app safe)
------------------------------------------------------- */
export async function openPanelUI() {
  return new Promise((resolve) => {
    const screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: "ask-docs Panel Mode"
    });

    // CRITICAL FIX: Blessed will manage raw mode internally
    // We do NOT enable mouse, so no garbage events.

    /* ------------------------------
       LAYOUT
    ------------------------------ */

    const sectionsBox = blessed.list({
      parent: screen,
      label: " Sections ",
      width: "30%",
      height: "100%",
      border: "line",
      style: {
        fg: "white",
        border: { fg: "cyan" },
        selected: { bg: "blue", fg: "white" }
      },
      keys: true,
      vi: true
    });

    const answerBox = blessed.box({
      parent: screen,
      label: " Answer ",
      left: "30%",
      width: "70%",
      height: "70%",
      border: "line",
      style: {
        fg: "white",
        border: { fg: "green" }
      },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      tags: true
    });

    const citationsBox = blessed.box({
      parent: screen,
      label: " Citations ",
      top: "70%",
      left: "30%",
      width: "70%",
      height: "30%",
      border: "line",
      style: {
        fg: "white",
        border: { fg: "yellow" }
      },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true
    });

    const input = blessed.textbox({
      parent: screen,
      bottom: 0,
      height: 3,
      width: "100%",
      border: "line",
      label: " Ask ",
      inputOnFocus: true,
      style: {
        fg: "white",
        border: { fg: "magenta" }
      }
    });

    input.focus();

    /* ------------------------------
       QUERY HANDLER
    ------------------------------ */
    async function runQuery(q) {
      const result = await askDocs(q);

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

      answerBox.setContent(answerLines.join("\n"));
      citationsBox.setContent(citationLines.join("\n"));

      sectionsBox.setItems([
        "Top Section",
        "Related Section",
        "More Context"
      ]);

      screen.render();
    }

    input.on("submit", async (value) => {
      await runQuery(value);
      input.clearValue();
      input.focus();
    });

    /* ------------------------------
       KEYBINDINGS
    ------------------------------ */

    const exitPanel = () => {
      screen.destroy();

      // CRITICAL FIX: restore cooked mode
      if (process.stdin.isTTY) process.stdin.setRawMode(false);

      resolve();
    };

    screen.key(["escape", "q", "C-c"], exitPanel);

    screen.render();
  });
}
