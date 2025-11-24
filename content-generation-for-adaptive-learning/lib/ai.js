import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Gemini 2.0 Flash – free & available for all new keys
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function generateSubtopics(subject, count = 8) {
  const prompt = `
Generate ${count} subtopics for the subject "${subject}".
Return ONLY a JSON array of short strings. Example:
["topic1", "topic2", "topic3"]
`;

  const result = await model.generateContent(prompt);

  const text = result.response.text().trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }
}
