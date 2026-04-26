export function bindInput(inputEl, buttonEl, handler) {
  buttonEl.onclick = handler;
  inputEl.onkeydown = (e) => {
    if (e.key === "Enter") handler();
  };
}
