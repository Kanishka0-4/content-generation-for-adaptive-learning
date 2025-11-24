import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/* ===========================================================
   3 SEPARATE GEMINI CALLS — ONE FOR EACH CONTENT TYPE
   =========================================================== */

async function askGeminiText(topic) {
  const prompt = `
Generate concise educational content for the topic "${topic}".
Return ONLY JSON in this format:

{
  "text": "40–70 word explanation of the topic",
  "mcqs": [
    {"q":"...", "options":["A","B","C"], "answer":"A"},
    {"q":"...", "options":["A","B","C"], "answer":"B"},
    {"q":"...", "options":["A","B","C"], "answer":"C"}
  ]
}
`;

  const result = await model.generateContent(prompt);
  let raw = result.response.text().trim();
  raw = raw.replace(/```json/g, "").replace(/```/g, "");

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("TEXT JSON invalid:\n" + raw);

  return JSON.parse(match[0]);
}

async function askGeminiAudio(topic) {
  const prompt = `
Generate an audio script for topic "${topic}" in 40–70 words.
Then create 3 MCQs based ONLY on the script.

Return ONLY JSON:

{
  "script": "...",
  "mcqs": [
    {"q":"...", "options":["A","B","C"], "answer":"A"},
    {"q":"...", "options":["A","B","C"], "answer":"B"},
    {"q":"...", "options":["A","B","C"], "answer":"C"}
  ]
}
`;

  const result = await model.generateContent(prompt);
  let raw = result.response.text().trim();
  raw = raw.replace(/```json/g, "").replace(/```/g, "");

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AUDIO JSON invalid:\n" + raw);

  return JSON.parse(match[0]);
}

async function askGeminiVisual(topic) {
  const prompt = `
Create a 40–70 word visual explanation (flowchart-style description)
for topic "${topic}". Then 3 MCQs based on ONLY this visual.

Return ONLY JSON:

{
  "visual": "...",
  "mcqs": [
    {"q":"...", "options":["A","B","C"], "answer":"A"},
    {"q":"...", "options":["A","B","C"], "answer":"B"},
    {"q":"...", "options":["A","B","C"], "answer":"C"}
  ]
}
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

    // ----- Get subtopics -----
    const st = await pool.query(
      "SELECT id, name FROM subtopics WHERE subject_id=$1",
      [subject_id]
    );

    if (st.rows.length < 3)
      return NextResponse.json({ error: "Need at least 3 subtopics" }, { status: 400 });

    // Pick 3 unique random subtopics
    const shuffled = st.rows.sort(() => Math.random() - 0.5);
    const topicText = shuffled[0].name;
    const topicAudio = shuffled[1].name;
    const topicVisual = shuffled[2].name;

    // ----- Create quiz entry -----
    const quizRes = await pool.query(
      "INSERT INTO quizzes (user_id, subject_id) VALUES ($1,$2) RETURNING id",
      [userId, subject_id]
    );
    const quizId = quizRes.rows[0].id;

    const items = [];

    // Save content helper
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

    /* ===================================================
       GENERATE TEXT CONTENT
       =================================================== */
    const textBlock = await askGeminiText(topicText);
    const textId = await insertContent("text", textBlock.text);
    items.push({ id: textId, type: "text" });

    for (const q of textBlock.mcqs) {
      items.push({ id: await insertMCQ(q), type: "mcq" });
    }

    /* ===================================================
       GENERATE AUDIO CONTENT
       =================================================== */
    const audioBlock = await askGeminiAudio(topicAudio);
    const audioId = await insertContent("audio", audioBlock.script);
    items.push({ id: audioId, type: "audio" });

    for (const q of audioBlock.mcqs) {
      items.push({ id: await insertMCQ(q), type: "mcq" });
    }

    /* ===================================================
       GENERATE VISUAL CONTENT
       =================================================== */
    const visualBlock = await askGeminiVisual(topicVisual);
    const visualId = await insertContent("visual", visualBlock.visual);
    items.push({ id: visualId, type: "visual" });

    for (const q of visualBlock.mcqs) {
      items.push({ id: await insertMCQ(q), type: "mcq" });
    }

    return NextResponse.json({ success: true, quiz_id: quizId, items });

  } catch (err) {
    console.error("GENERATE QUIZ ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
