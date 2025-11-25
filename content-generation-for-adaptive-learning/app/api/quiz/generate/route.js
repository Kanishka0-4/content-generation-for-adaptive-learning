import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/* ===========================================================
   3 SEPARATE GEMINI CALLS — NOW WITH SUBJECT CONTEXT
   =========================================================== */

async function askGeminiText(topic, subjectName) {
  const prompt = `
You are an educational content generator.

CRITICAL RULES (must follow all):
1. Generate content STRICTLY in the context of the SUBJECT.
2. Interpret SUBTOPIC inside the subject domain ONLY.
3. Explanation must be 120–150 words.
4. MCQs MUST come ONLY from the explanation text.
5. Options must be 1–6 words long.
6. Output must match EXACTLY:

{
  "text": "<120-150 words explanation>",
  "mcqs": [
    {"q":"...", "options":["A","B","C"], "answer":"A"},
    {"q":"...", "options":["A","B","C"], "answer":"B"},
    {"q":"...", "options":["A","B","C"], "answer":"C"}
  ]
}

SUBJECT: "${subjectName}"
SUBTOPIC: "${topic}"

Return ONLY JSON. No commentary. No backticks.
`;

  const result = await model.generateContent(prompt);
  let raw = result.response.text().trim();
  raw = raw.replace(/```json/g, "").replace(/```/g, "");

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("TEXT JSON invalid:\n" + raw);

  return JSON.parse(match[0]);
}

async function askGeminiAudio(topic, subjectName) {
  const prompt = `
You are an educational content generator.
CRITICAL RULES (must follow all):
1. Generate content STRICTLY in the context of the SUBJECT.
2. Interpret SUBTOPIC inside the subject domain ONLY.
3. Explanation script must be 120–150 words.
4. MCQs MUST come ONLY from the explanation script.
5. Options must be 1–6 words long.
Generate JSON ONLY:
{
  "script": "<120-150 words spoken script for this SUBTOPIC in the context of the SUBJECT>",
  "mcqs": [
    {"q":"...", "options":["A","B","C"], "answer":"A"},
    {"q":"...", "options":["A","B","C"], "answer":"B"},
    {"q":"...", "options":["A","B","C"], "answer":"C"}
  ]
}
SUBJECT: "${subjectName}"
SUBTOPIC: "${topic}"
`;

  const result = await model.generateContent(prompt);
  let raw = result.response.text().trim();
  raw = raw.replace(/```json/g, "").replace(/```/g, "");

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AUDIO JSON invalid:\n" + raw);

  return JSON.parse(match[0]);
}

async function askGeminiVisual(topic, subjectName) {
  const prompt = `
You are an educational content generator.
CRITICAL RULES (must follow all):
1. Generate content STRICTLY in the context of the SUBJECT.
2. Interpret SUBTOPIC inside the subject domain ONLY.
3. Explanation must be 120–150 words.
4. MCQs MUST come ONLY from the explanation text.
5. Options must be 1–6 words long.
Return ONLY JSON:
{
  "visual": "<120-150 words flowchart-style description explaining the SUBTOPIC inside SUBJECT context>",
  "mcqs": [
    {"q":"...", "options":["A","B","C"], "answer":"A"},
    {"q":"...", "options":["A","B","C"], "answer":"B"},
    {"q":"...", "options":["A","B","C"], "answer":"C"}
  ]
}
SUBJECT: "${subjectName}"
SUBTOPIC: "${topic}"
`;

  const result = await model.generateContent(prompt);
  let raw = result.response.text().trim();
  raw = raw.replace(/```json/g, "").replace(/```/g, "");

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("VISUAL JSON invalid:\n" + raw);

  return JSON.parse(match[0]);
}

/* ===========================================================
   MAIN ROUTE
   =========================================================== */

export async function POST(req) {
  try {
    const body = await req.json();
    const subject_id = body.subject_id;

    if (!subject_id) {
      return NextResponse.json({ error: "subject_id required" }, { status: 400 });
    }

    // Auth
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value ?? null;
    const userId = decodeAuthToken(token);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch subject name
    const subjectRow = await pool.query("SELECT name FROM subjects WHERE id=$1", [subject_id]);
    const subjectName = subjectRow.rows[0]?.name ?? "";

    // Fetch subtopics
    const st = await pool.query("SELECT id, name FROM subtopics WHERE subject_id=$1", [subject_id]);

    if (st.rows.length < 3)
      return NextResponse.json({ error: "Need at least 3 subtopics" }, { status: 400 });

    // Pick 3 subtopics
    const shuffled = st.rows.sort(() => Math.random() - 0.5);
    const topicText = shuffled[0].name;
    const topicAudio = shuffled[1].name;
    const topicVisual = shuffled[2].name;

    // Create quiz
    const quizRes = await pool.query(
      "INSERT INTO quizzes (user_id, subject_id) VALUES ($1,$2) RETURNING id",
      [userId, subject_id]
    );
    const quizId = quizRes.rows[0].id;

    const items = [];

    // Helper inserts
    async function insertContent(type, text) {
      const r = await pool.query(
        `INSERT INTO quiz_items (quiz_id, content_type, question_text, options, correct_option)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [quizId, type, text, JSON.stringify([]), ""]
      );
      return r.rows[0].id;
    }

    async function insertMCQ(q) {
      const r = await pool.query(
        `INSERT INTO quiz_items (quiz_id, content_type, question_text, options, correct_option)
         VALUES ($1,'mcq',$2,$3,$4) RETURNING id`,
        [quizId, q.q, JSON.stringify(q.options), q.answer]
      );
      return r.rows[0].id;
    }

    /* ---------- TEXT BLOCK ---------- */
    const textBlock = await askGeminiText(topicText, subjectName);
    const textId = await insertContent("text", textBlock.text);
    items.push({ id: textId, type: "text" });
    for (const q of textBlock.mcqs) {
      items.push({ id: await insertMCQ(q), type: "mcq" });
    }

    /* ---------- AUDIO BLOCK ---------- */
    const audioBlock = await askGeminiAudio(topicAudio, subjectName);
    const audioId = await insertContent("audio", audioBlock.script);
    items.push({ id: audioId, type: "audio" });
    for (const q of audioBlock.mcqs) {
      items.push({ id: await insertMCQ(q), type: "mcq" });
    }

    /* ---------- VISUAL BLOCK ---------- */
    const visualBlock = await askGeminiVisual(topicVisual, subjectName);
    const visualId = await insertContent("visual", visualBlock.visual);
    items.push({ id: visualId, type: "visual" });
    for (const q of visualBlock.mcqs) {
      items.push({ id: await insertMCQ(q), type: "mcq" });
    }

    return NextResponse.json({ success: true, quiz_id: quizId, items });

  } catch (err) {
    console.error("GENERATE QUIZ ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
