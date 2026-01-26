import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL_NAME = "llama-3.3-70b-versatile";

async function askGroq(prompt) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL_NAME,
    response_format: { type: "json_object" },
    temperature: 0.1,
  });
  return JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
}

async function generateTextContent(topic, subjectName) {
  const prompt = `You are an educational generator. SUBJECT: "${subjectName}", SUBTOPIC: "${topic}". Explain in 120-150 words. Provide 3 MCQs. JSON: { "text": "...", "mcqs": [{"q":"...", "options":["A","B","C"], "answer":"A"}] }`;
  return await askGroq(prompt);
}

async function generateAudioContent(topic, subjectName) {
  const prompt = `You are an educational generator. SUBJECT: "${subjectName}", SUBTOPIC: "${topic}". Write a spoken explanation (120-150 words). Provide 3 MCQs. JSON: { "script": "...", "mcqs": [{"q":"...", "options":["A","B","C"], "answer":"A"}] }`;
  return await askGroq(prompt);
}

/* ✅ FIXED: Visual now explicitly requires 3 MCQs */
async function generateVisualContent(topic, subjectName) {
  const prompt = `
You are an educational generator.

SUBJECT: "${subjectName}"
SUBTOPIC: "${topic}"

Explain the concept visually using STEPS.
Each step should be short and simple.

IMPORTANT:
- You MUST generate EXACTLY 3 MCQs.

JSON:
{
  "steps": ["Step 1", "Step 2", "Step 3"],
  "mcqs": [
    {"q":"...", "options":["A","B","C"], "answer":"A"},
    {"q":"...", "options":["A","B","C"], "answer":"A"},
    {"q":"...", "options":["A","B","C"], "answer":"A"}
  ]
}`;
  return await askGroq(prompt);
}

export async function POST(req) {
  try {
    const { subject_id } = await req.json();
    const cookieStore = await cookies();
    const userId = decodeAuthToken(cookieStore.get("auth_token")?.value);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subjectRow = await pool.query(
      "SELECT name FROM subjects WHERE id=$1",
      [subject_id]
    );
    const subjectName = subjectRow.rows[0]?.name ?? "";

    const st = await pool.query(
      "SELECT name FROM subtopics WHERE subject_id=$1",
      [subject_id]
    );
    const shuffled = st.rows.sort(() => Math.random() - 0.5);
    const [topicText, topicAudio, topicVisual] = [
      shuffled[0].name,
      shuffled[1].name,
      shuffled[2].name,
    ];

    const quizRes = await pool.query(
      "INSERT INTO quizzes (user_id, subject_id) VALUES ($1,$2) RETURNING id",
      [userId, subject_id]
    );
    const quizId = quizRes.rows[0].id;

    const items = [];

    async function saveItem(type, text, options = [], correct = null) {
      const answerMap = { A: 0, B: 1, C: 2 };
      const correctIdx = correct !== null ? answerMap[correct] ?? 0 : null;

      const r = await pool.query(
        `INSERT INTO quiz_items
         (quiz_id, content_type, question_text, options, correct_option)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id`,
        [quizId, type, text, JSON.stringify(options), correctIdx]
      );

      return { id: r.rows[0].id, type, question_text: text, options };
    }

    const textData = await generateTextContent(topicText, subjectName);
    items.push(await saveItem("text", textData.text));
    for (const q of textData.mcqs)
      items.push(await saveItem("mcq", q.q, q.options, q.answer));

    const audioData = await generateAudioContent(topicAudio, subjectName);
    items.push(await saveItem("audio", audioData.script));
    for (const q of audioData.mcqs)
      items.push(await saveItem("mcq", q.q, q.options, q.answer));

    const visualData = await generateVisualContent(topicVisual, subjectName);
    items.push(
      await saveItem(
        "visual",
        JSON.stringify({ steps: visualData.steps })
      )
    );
    for (const q of visualData.mcqs)
      items.push(await saveItem("mcq", q.q, q.options, q.answer));

    return NextResponse.json({ success: true, quiz_id: quizId, items });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
