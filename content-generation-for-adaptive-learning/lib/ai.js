import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// "Instant" is faster/cheaper for simple lists
const MODEL = "llama-3.1-8b-instant"; 

export async function generateSubtopics(subject, count = 8) {
  const prompt = `
Return ONLY a JSON array of ${count} short subtopics for:
"${subject}"

Example:
["Topic 1", "Topic 2", "Topic 3"]
`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const text = completion.choices[0].message.content;
  
  // Basic parsing in case Groq adds extra text
  const match = text.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}