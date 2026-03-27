import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { Pool } from "pg";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL_NAME = "llama-3.3-70b-versatile";

function buildModuleQuizPrompt({
  moduleTitle,
  topics,
  profile,
}: {
  moduleTitle: string;
  topics: string[];
  profile: { visual: number; audio: number; text: number };
}) {
  return `
MODULE TITLE: "${moduleTitle}"
TOPICS: ${topics.join(", ")}
LEARNING PROFILE: Visual ${profile.visual}%, Audio ${profile.audio}%, Text ${profile.text}%

Generate EXACTLY 10 multiple-choice questions (MCQs) that test deep understanding and retention of the content from all chapters in this module.
Each MCQ must have 4 options and only ONE correct answer.
Focus ONLY on the actual content, concepts, facts, and skills taught in the chapters. DO NOT ask about chapter numbers, order, or meta-questions like "In which chapter was..." or "Which module covers...".
All questions should require knowledge or application of the material, not just recall of headings or structure.
Return your response as a JSON object in the following format:
{
  "mcqs": [
    { "question": "...", "options": ["A", "B", "C", "D"], "answer": "A" }
  ]
}
ONLY return valid JSON.
Do NOT include explanations or markdown.
`;
}

// GET — fetch existing module quiz + score for this user
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const userId = token ? decodeAuthToken(token) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const moduleOrder = searchParams.get("moduleOrder");

    if (!subjectId || moduleOrder == null) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT quiz, score, total FROM module_quiz
       WHERE user_id = $1 AND subject_id = $2 AND module_order = $3
       LIMIT 1`,
      [userId, subjectId, moduleOrder]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ exists: false });
    }

    const row = result.rows[0];
    return NextResponse.json({
      exists: true,
      mcqs: row.quiz,
      score: row.score,   // null if not submitted yet
      total: row.total,   // null if not submitted yet
    });
  } catch (err: any) {
    console.error("Module quiz fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch module quiz", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

// POST — generate and save module quiz (skips generation if already exists)
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const userId = token ? decodeAuthToken(token) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { moduleTitle, topics, profile, subjectId, moduleOrder } = body;

    if (!moduleTitle || !topics || !profile || !subjectId || moduleOrder == null) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Return existing quiz if already generated — no re-generation
    const existing = await pool.query(
      `SELECT quiz FROM module_quiz
       WHERE user_id = $1 AND subject_id = $2 AND module_order = $3
       LIMIT 1`,
      [userId, subjectId, moduleOrder]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ mcqs: existing.rows[0].quiz });
    }

    // Generate new quiz via Groq
    let mcqs = [];
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: buildModuleQuizPrompt({ moduleTitle, topics, profile }),
          },
        ],
        model: MODEL_NAME,
        response_format: { type: "json_object" },
        temperature: 0.1,
      });
      const content = chatCompletion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      mcqs = parsed.mcqs || [];
    } catch (groqErr) {
      return NextResponse.json(
        { error: "Groq API error", details: (groqErr as any)?.message || String(groqErr) },
        { status: 500 }
      );
    }

    // Save to DB
    await pool.query(
      `INSERT INTO module_quiz (subject_id, module_order, user_id, quiz)
       VALUES ($1, $2, $3, $4)`,
      [subjectId, moduleOrder, userId, JSON.stringify(mcqs)]
    );

    return NextResponse.json({ mcqs });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Module quiz generation failed", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}