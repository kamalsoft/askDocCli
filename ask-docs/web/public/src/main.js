import { ask } from "./api.js";
import { initLayout } from "./ui/layout.js";
import { renderSections } from "./ui/sections.js";
import { renderCitations } from "./ui/citations.js";
import { renderAnswer } from "./ui/answer.js";
import { bindInput } from "./ui/input.js";

const state = {
  theme: "dark",
  history: [],
  lastQuery: "",
  lastResult: null,
  activeDoc: null
};

const ui = initLayout();

function saveHistory(q) {
  const history = JSON.parse(localStorage.getItem("history") || "[]");
  history.unshift(q);
  const trimmed = history.slice(0, 20);
  localStorage.setItem("history", JSON.stringify(trimmed));
  state.history = trimmed;
}

function loadHistory() {
  state.history = JSON.parse(localStorage.getItem("history") || "[]");
}

function renderHistory() {
  ui.historyBox.innerHTML = state.history
    .map(h => `<div class="history-item">${h}</div>`)
    .join("");
}

ui.historyBox.onclick = (e) => {
  if (e.target.classList.contains("history-item")) {
    ui.inputBox.value = e.target.textContent;
    runQuery();
  }
};

function renderDocList(files) {
  ui.docList.innerHTML = files
    .map(f => `<div class="doc-item">${f}</div>`)
    .join("");
}

ui.docList.onclick = (e) => {
  if (e.target.classList.contains("doc-item")) {
    state.activeDoc = e.target.textContent;
    runQuery();
  }
};

async function runQuery() {
  const question = ui.inputBox.value.trim();
  if (!question) return;

  state.lastQuery = question;
  saveHistory(question);
  renderHistory();

  ui.answerBox.textContent = "Loading...";
  ui.citationsBox.textContent = "";
  ui.sectionsList.innerHTML = "";

  try {
    const result = await ask(question);
    state.lastResult = result;

    renderAnswer(ui.answerBox, result.answer, question);
    renderCitations(ui.citationsBox, result.citations);
    renderSections(ui.sectionsList, result.sections, onSectionSelect);

    const files = [...new Set(result.sections.map(s => s.file))];
    renderDocList(files);
  } catch (e) {
    ui.answerBox.textContent = `Error: ${e.message}`;
  }
}

function onSectionSelect(idx) {
  if (!state.lastResult) return;
  const section = state.lastResult.sections[idx];
  ui.answerBox.innerHTML = `
    <h3>${section.heading}</h3>
    <pre>${section.preview}</pre>
  `;
}

bindInput(ui.inputBox, ui.askBtn, runQuery);

function syncScroll() {
  if (!state.lastResult) return;

  const scrollPos = ui.answerBox.scrollTop;
  const total = ui.answerBox.scrollHeight - ui.answerBox.clientHeight;
  if (total <= 0) return;

  const ratio = scrollPos / total;
  const idx = Math.floor(ratio * state.lastResult.sections.length);

  document.querySelectorAll(".section-item").forEach((el, i) => {
    el.classList.toggle("active", i === idx);
  });
}

ui.answerBox.addEventListener("scroll", syncScroll);

ui.chunkSearch.oninput = () => {
  if (!state.lastResult) return;
  const q = ui.chunkSearch.value.toLowerCase();
  const filtered = state.lastResult.sections.filter(s =>
    s.preview.toLowerCase().includes(q) ||
    s.heading.toLowerCase().includes(q)
  );
  renderSections(ui.sectionsList, filtered, onSectionSelect);
};

ui.themeToggle.onclick = () => {
  document.body.classList.toggle("light");
  const mode = document.body.classList.contains("light") ? "light" : "dark";
  state.theme = mode;
  localStorage.setItem("theme", mode);
};

if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light");
  state.theme = "light";
}

let isDragging = false;
ui.divider.onmousedown = () => { isDragging = true; };
document.onmouseup = () => { isDragging = false; };
document.onmousemove = (e) => {
  if (!isDragging) return;
  const newWidth = Math.max(180, Math.min(e.clientX, 500));
  ui.sidebar.style.width = newWidth + "px";
};

document.addEventListener("keydown", (e) => {
  if (e.metaKey && e.key === "k") {
    e.preventDefault();
    ui.inputBox.focus();
  }
  if (e.ctrlKey && e.key === "Enter") {
    runQuery();
  }
  if (e.key === "Escape") {
    ui.inputBox.value = "";
  }
});

loadHistory();
renderHistory();
