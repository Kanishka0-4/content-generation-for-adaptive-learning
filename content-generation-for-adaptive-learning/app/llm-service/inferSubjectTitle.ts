import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Uses a tiny LLM prompt to infer a canonical subject title
 * from roadmap module titles.
 */
export async function inferSubjectTitleFromRoadmap(roadmap: any[]) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const moduleTitles = roadmap
    .slice(0, 3)
    .map((m: any, i: number) => `${i + 1}. ${m.week || m.title}`)
    .join("\n");

  const prompt = `
Given the following study modules:

${moduleTitles}

Return a SHORT canonical subject name (2–4 words max).
Rules:
- No extra text
- No punctuation
- No exam names
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Safety fallback
  return text || "General Subject";
}
