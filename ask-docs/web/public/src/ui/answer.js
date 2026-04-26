export function renderAnswer(el, text, query = "") {
  if (!query) {
    el.textContent = text;
    return;
  }

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  let html = text;

  for (const w of words) {
    const regex = new RegExp(`(${escapeRegex(w)})`, "gi");
    html = html.replace(regex, `<mark>$1</mark>`);
  }

  el.innerHTML = html;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
