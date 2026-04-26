export async function ask(question) {
  const res = await fetch("http://localhost:5174/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json(); // { answer, citations, sections }
}


 