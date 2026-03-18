import { Pool } from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";

/* ---------------- DB ---------------- */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ---------------- GEMINI ---------------- */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/* ---------------- STATIC LEARNING STYLE (for now) ---------------- */

const LEARNING_STYLE = {
  visual: 40,
  auditory: 20,
  readwrite: 20,
  kinesthetic: 20,
};

/* ---------------- PROMPT BUILDER ---------------- */

function buildModulePrompt({
  subjectTitle,
  moduleTitle,
  topics,
  goal,
}: {
  subjectTitle: string;
  moduleTitle: string;
  topics: string[];
  goal: string;
}) {
  return `
You are an expert educator building high-quality learning material.

Subject: ${subjectTitle}
Module: ${moduleTitle}

Topics to cover:
${topics.map((t) => `- ${t}`).join("\n")}

Learning goal:
${goal}

Learning style preferences (apply as PRESENTATION BIAS, not sections):
- Visual: ${LEARNING_STYLE.visual}%
- Auditory: ${LEARNING_STYLE.auditory}%
- Read/Write: ${LEARNING_STYLE.readwrite}%
- Kinesthetic: ${LEARNING_STYLE.kinesthetic}%

INSTRUCTIONS:
- Divide the module into clear CHAPTERS (2–5 depending on topics).
- Each chapter should be coherent and build on the previous one.
- Use smooth transitions between chapters.
- Do NOT include quizzes or questions.
- Do NOT label content as VARK.
- Keep explanations clear, structured, and educational.
- Use occasional ASCII flows or arrows where helpful.
- Include mental or practical imagination cues naturally.
- End each chapter at a natural pause point (suitable for testing later).

Output ONLY the learning content.
Do not add meta commentary.
`.trim();
}

/* ---------------- MAIN GENERATOR ---------------- */

export async function generateModuleOneContent({
  subjectId,
  subjectTitle,
  module,
}: {
  subjectId: number;
  subjectTitle: string;
  module: {
    title: string;
    topics: string[];
    expected_outcome: string;
  };
}) {
  try {
    console.log("🤖 Generating Module 1 content…");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = buildModulePrompt({
      subjectTitle,
      moduleTitle: module.title,
      topics: module.topics,
      goal: module.expected_outcome,
    });

    const result = await model.generateContent(prompt);
    const content = result.response.text();

    if (!content || content.length < 200) {
      throw new Error("Generated content too short or empty");
    }

    await pool.query(
      `
      INSERT INTO module_content (subject_id, module_order, content)
      VALUES ($1, $2, $3)
      `,
      [subjectId, 1, content]
    );

    console.log("✅ Module 1 content stored successfully");
  } catch (err) {
    console.error("❌ Module 1 generation failed:", err);
  }
}
