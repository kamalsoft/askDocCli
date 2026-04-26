export function renderSections(listEl, sections, onSelect) {
  listEl.innerHTML = "";

  sections.forEach((s, idx) => {
    const li = document.createElement("li");
    li.className = "section-item";
    li.innerHTML = `
      <div class="section-heading">${s.heading}</div>
      <div class="section-meta">${s.file}</div>
      <div class="section-score">Score: ${s.score.toFixed(3)}</div>
      <div class="section-preview">${s.preview}</div>
    `;
    li.onclick = () => onSelect(idx);
    listEl.appendChild(li);
  });
}
