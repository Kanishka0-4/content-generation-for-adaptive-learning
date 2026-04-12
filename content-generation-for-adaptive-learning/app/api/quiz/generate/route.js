import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL_NAME = "llama-3.3-70b-versatile";

/* ================= GROQ CALL ================= */
async function askGroq(prompt) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL_NAME,
    response_format: { type: "json_object" },
    temperature: 0.1,
  });
  return JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
}

/* ================= CONTENT GENERATORS ================= */
async function generateTextContent(topic, subjectName) {
  const prompt = `
SUBJECT: "${subjectName}"
SUBTOPIC: "${topic}"

Write a clear explanation (120–150 words).
ONLY include concepts you will test.

Then generate EXACTLY 3 MCQs.
MCQs must be answerable ONLY from the explanation.
DO NOT introduce new algorithms or ideas.

JSON:
{
  "text": "...",
  "mcqs": [
    { "q": "...", "options": ["A","B","C"], "answer": "A" }
  ]
}
`;
  return await askGroq(prompt);
}

async function generateAudioContent(topic, subjectName) {
  const prompt = `
SUBJECT: "${subjectName}"
SUBTOPIC: "${topic}"

Write a spoken explanation (120–150 words).
ONLY include concepts you will test.

Then generate EXACTLY 3 MCQs.
MCQs must NOT introduce new concepts.

JSON:
{
  "script": "...",
  "mcqs": [
    { "q": "...", "options": ["A","B","C"], "answer": "A" }
  ]
}
`;
  return await askGroq(prompt);
}

async function generateVisualContent(topic, subjectName) {
  const prompt = `
SUBJECT: "${subjectName}"
SUBTOPIC: "${topic}"

Explain visually using simple steps.
ONLY include steps you will test.

Generate EXACTLY 3 MCQs based ONLY on the steps.

JSON:
{
  "steps": ["Step 1", "Step 2", "Step 3"],
  "mcqs": [
    { "q": "...", "options": ["A","B","C"], "answer": "A" }
  ]
}
`;
  return await askGroq(prompt);
}

/* ================= MCQ SCOPE CHECK ================= */
function isMcqInScope(contentText, mcq) {
  const content = contentText.toLowerCase();
  const mcqText = (mcq.q + " " + mcq.options.join(" ")).toLowerCase();

  const words = mcqText.match(/\b[a-z]{5,}\b/g) || [];

  for (const w of words) {
    if (!content.includes(w)) {
      return false;
    }
  }
  return true;
}

/* ================= MCQ REGENERATION ================= */
async function regenerateMcqsFromContent(contentText) {
  const prompt = `
Based ONLY on the following content, generate EXACTLY 3 MCQs.

CONTENT:
"""
${contentText}
"""

RULES:
- Questions must be answerable ONLY from the content
- Do NOT introduce new concepts
- Do NOT assume prior knowledge

JSON:
{
  "mcqs": [
    { "q": "...", "options": ["A","B","C"], "answer": "A" }
  ]
}
`;
  const res = await askGroq(prompt);
  return res.mcqs || [];
}

/* ================= API HANDLER ================= */
export async function POST(req) {
  try {
    const { subject_id } = await req.json();

    const cookieStore = await cookies();
    const userId = decodeAuthToken(cookieStore.get("auth_token")?.value);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ===== SUBJECT ===== */
    const subjectRow = await pool.query(
      "SELECT name FROM subjects WHERE id=$1",
      [subject_id],
    );
    const subjectName = subjectRow.rows[0]?.name ?? "";

    /* ===== SUBTOPICS ===== */
    const st = await pool.query(
      "SELECT name FROM subtopics WHERE subject_id=$1",
      [subject_id],
    );
    const shuffled = st.rows.sort(() => Math.random() - 0.5);

    const [topicText, topicAudio, topicVisual] = [
      shuffled[0].name,
      shuffled[1].name,
      shuffled[2].name,
    ];

    /* ===== QUIZ ===== */
    const quizRes = await pool.query(
      "INSERT INTO quizzes (user_id, subject_id) VALUES ($1,$2) RETURNING id",
      [userId, subject_id],
    );
    const quizId = quizRes.rows[0].id;

    const items = [];

    async function saveItem(
      type,
      text,
      options = [],
      correct = null,
      mcq_type = null,
    ) {
      const answerMap = { A: 0, B: 1, C: 2 };
      const correctIdx = correct !== null ? (answerMap[correct] ?? 0) : null;

      const r = await pool.query(
        `INSERT INTO quiz_items
         (quiz_id, content_type, question_text, options, correct_option, mcq_type)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id`,
        [quizId, type, text, JSON.stringify(options), correctIdx, mcq_type],
      );

      return { id: r.rows[0].id, type, question_text: text, options, mcq_type };
    }

    /* ================= TEXT ================= */
    const textData = await generateTextContent(topicText, subjectName);
    items.push(await saveItem("text", textData.text));

    let textMcqs = textData.mcqs.filter((q) => isMcqInScope(textData.text, q));
    if (textMcqs.length < 3) {
      textMcqs = await regenerateMcqsFromContent(textData.text);
    }
    for (const q of textMcqs.slice(0, 3)) {
      items.push(await saveItem("mcq", q.q, q.options, q.answer, "text"));
    }

    /* ================= AUDIO ================= */
    const audioData = await generateAudioContent(topicAudio, subjectName);
    items.push(await saveItem("audio", audioData.script));

    let audioMcqs = audioData.mcqs.filter((q) =>
      isMcqInScope(audioData.script, q),
    );
    if (audioMcqs.length < 3) {
      audioMcqs = await regenerateMcqsFromContent(audioData.script);
    }
    for (const q of audioMcqs.slice(0, 3)) {
      items.push(await saveItem("mcq", q.q, q.options, q.answer, "audio"));
    }

    /* ================= VISUAL ================= */
    const visualData = await generateVisualContent(topicVisual, subjectName);
    items.push(
      await saveItem("visual", JSON.stringify({ steps: visualData.steps,  topic: topicVisual,  subject: subjectName, })),
    );

    const visualText = visualData.steps.join(" ");
    let visualMcqs = visualData.mcqs.filter((q) => isMcqInScope(visualText, q));
    if (visualMcqs.length < 3) {
      visualMcqs = await regenerateMcqsFromContent(visualText);
    }
    for (const q of visualMcqs.slice(0, 3)) {
      items.push(await saveItem("mcq", q.q, q.options, q.answer, "visual"));
    }

    return NextResponse.json({ success: true, quiz_id: quizId, items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
