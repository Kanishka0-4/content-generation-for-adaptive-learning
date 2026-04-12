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


IMPORTANT: The "answer" field must EXACTLY match one of the strings in "options".

JSON:
{
  "text": "...",
  "mcqs": [
    { "q": "...", "options": ["option text A", "option text B", "option text C"], "answer": "option text A" }
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

IMPORTANT: The "answer" field must EXACTLY match one of the strings in "options".

JSON:
{
  "script": "...",
  "mcqs": [
    { "q": "...", "options": ["option text A", "option text B", "option text C"], "answer": "option text A" }
  ]
}
`;
  return await askGroq(prompt);
}


async function generateVisualContent(topic, subjectName) {
  const prompt = `
SUBJECT: "${subjectName}"
SUBTOPIC: "${topic}"

Choose the BEST visual type for this topic:
- "flow" → for processes, sequences, cause-effect chains
- "cycle" → for repeating/circular processes (water cycle, carbon cycle)
- "hierarchy" → for classifications, taxonomies, parent-child relationships
- "comparison" → for comparing 2-4 concepts, types, or categories

Return ONLY valid JSON. No extra text.

For "flow":
{
  "type": "flow",
  "title": "...",
  "data": [
    { "step": "short label", "description": "one sentence" }
  ],
  "mcqs": [
    { "q": "...", "options": ["option text A", "option text B", "option text C"], "answer": "option text A" }
  ]
}

For "cycle":
{
  "type": "cycle",
  "title": "...",
  "data": [
    { "step": "short label", "description": "one sentence" }
  ],
  "mcqs": [
    { "q": "...", "options": ["option text A", "option text B", "option text C"], "answer": "option text A" }
  ]
}

For "hierarchy":
{
  "type": "hierarchy",
  "title": "...",
  "data": [
    {
      "name": "parent concept",
      "description": "one sentence",
      "children": [
        { "name": "child", "description": "one sentence" }
      ]
    }
  ],
  "mcqs": [
    { "q": "...", "options": ["option text A", "option text B", "option text C"], "answer": "option text A" }
  ]
}

For "comparison":
{
  "type": "comparison",
  "title": "...",
  "data": [
    {
      "concept": "name",
      "features": ["feature 1", "feature 2", "feature 3"],
      "example": "one example"
    }
  ],
  "mcqs": [
    { "q": "...", "options": ["option text A", "option text B", "option text C"], "answer": "option text A" }
  ]
}

RULES:
- Pick the type that best matches the topic — do NOT always pick flow
- ONLY include concepts you will test in MCQs
- The "answer" field must EXACTLY match one of the strings in "options"
- Keep labels short (3-5 words max)
- Return ONLY the JSON object, nothing else
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
      let correctIdx = null;

      if (correct !== null && options.length > 0) {
        // Match answer text directly against options
        const textMatch = options.findIndex(
          (o) =>
            o.trim().toLowerCase() === String(correct).trim().toLowerCase(),
        );

        if (textMatch !== -1) {
          // Answer text matched an option directly
          correctIdx = textMatch;
        } else {
          // Fallback: treat correct as a letter (A/B/C)
          const answerMap = { A: 0, B: 1, C: 2 };
          correctIdx = answerMap[correct] ?? 0;
        }
      }

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

   
  //============= VISUAL==============
    const visualData = await generateVisualContent(topicVisual, subjectName);
items.push(
  await saveItem("visual", JSON.stringify({
    type: visualData.type,
    title: visualData.title,
    data: visualData.data,
    topic: topicVisual,
    subject: subjectName,
  })),
);

const visualText = (() => {
  if (!visualData.data) return "";
  if (visualData.type === "comparison") {
    return visualData.data.map(d =>
      `${d.concept} ${(d.features || []).join(" ")} ${d.example || ""}`
    ).join(" ");
  }
  if (visualData.type === "hierarchy") {
    return visualData.data.map(d =>
      `${d.name} ${d.description || ""} ${(d.children || []).map(c => `${c.name} ${c.description || ""}`).join(" ")}`
    ).join(" ");
  }
  // flow and cycle
  return visualData.data.map(d => `${d.step} ${d.description || ""}`).join(" ");
})();

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
