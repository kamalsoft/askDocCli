import blessed from 'blessed';
import { askDocs } from './ask.js';

/**
 * Launches the Terminal User Interface for interactive chat.
 */
export async function runTUI() {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Ask-Docs TUI',
    fullUnicode: true
  });

  // Main conversation area
  const chatLog = blessed.log({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%-3',
    border: 'line',
    label: ' {bold}Conversation{/bold} ',
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollback: 1000,
    scrollbar: {
      ch: ' ',
      track: { bg: 'cyan' },
      style: { inverse: true }
    },
    style: {
      border: { fg: 'blue' }
    }
  });

  // Input area at the bottom
  const input = blessed.textbox({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    border: 'line',
    label: ' {bold}Ask a question (Enter to send, Esc to quit){/bold} ',
    tags: true,
    inputOnFocus: true,
    style: {
      border: { fg: 'green' }
    }
  });

  // Global exit keys
  screen.key(['escape', 'C-c'], () => process.exit(0));

  input.on('submit', async (text) => {
    if (!text || text.trim() === '') {
      input.focus();
      return;
    }

    // Display user question
    chatLog.log(`{blue-fg}{bold}You:{/bold}{/blue-fg} ${text}`);
    input.clearValue();
    input.focus();
    screen.render();

    // Prepare for AI response
    chatLog.log(`{green-fg}{bold}AI:{/bold}{/green-fg} `);
    const lines = chatLog.getLines();
    const aiLineIndex = lines.length - 1;
    let currentAnswer = "";

    try {
      const response = await askDocs(text, (payload) => {
        if (payload.token) {
          currentAnswer += payload.token;
          chatLog.setLine(aiLineIndex, `{green-fg}{bold}AI:{/bold}{/green-fg} ${currentAnswer}`);
          screen.render();
        }
      });

      // Update with final answer and stats
      chatLog.setLine(aiLineIndex, `{green-fg}{bold}AI:{/bold}{/green-fg} ${response.answer}`);
      chatLog.log(`{grey-fg}Stats: ${response.tps} tps | ${response.tokenCount} tokens{/grey-fg}\n`);
    } catch (err) {
      chatLog.log(`{red-fg}Error: ${err.message}{/red-fg}\n`);
    }
    screen.render();
  });

  input.focus();
  screen.render();
}