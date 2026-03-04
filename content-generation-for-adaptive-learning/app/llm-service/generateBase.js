const topic = "Newton's First Law";

const prompt = `
Generate structured, clear NOTES for the following topic:

Topic: "${topic}"

Include:
- Definition
- Concept explanation (2–3 short paragraphs)
- Key points (bullet list)
- Important formulas (if any)
- Real-life examples
- Summary (3–4 lines)

Rules:
- DO NOT add diagrams or ASCII art.
- DO NOT generate VARK-style content.
- Keep it factual and simple.
`;

async function main() {
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral",
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) throw new Error("Ollama error");

    const data = await response.json();
    console.log("\n=== BASE NOTES ===\n");
    console.log(data.response);

  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

main();
