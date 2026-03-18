
async function buildPrompt(baseContent){
const topic = "Newton's First Law";

const prompt = `
Generate KINESTHETIC-STYLE learning content for the following topic.

Topic: "${topic}"

Requirements:
- Start with ONE real-world scenario where the learner imagines themselves doing something.
- Provide 2–3 hands-on tasks (DO-based activities like categorize, drag, match, arrange, simulate).
- Include one step-by-step activity the learner must perform physically or mentally.
- Include ONE realistic simulation-based MCQ question.
- Provide expected answers for all tasks.
- NO diagrams. NO visuals. NO tables. Only action-based tasks.

Produce sections in this order:
1. Scenario
2. Hands-On Tasks
3. Step-by-Step Activity
4. Simulation MCQ
5. Expected Answers
`;
}

export async function generateKinesthetic(topic) {
  try {
    const prompt = buildPrompt(topic);
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

    console.log("\n=== KINESTHETIC VERSION ===\n");
    return data.response;

  } catch (err) {
    console.error("ERROR:", err.message);
    return "";
  }
}


