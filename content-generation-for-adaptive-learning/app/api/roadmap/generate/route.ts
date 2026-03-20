import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

/* ---------------- SUBJECT EXTRACTION ---------------- */

function extractSubjectTitle(query: string) {
  const cleaned = query
    .replace(/\bin\s+\d+\s*(weeks?|months?|days?)\b/i, "")
    .replace(/\b(class\s*\d+|cbse|icse|gate|jee|neet|upsc|net|jam)\b/gi, "")
    .replace(/\b(learn|study|prepare|roadmap|course|for)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ");

  return words
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractDuration(query: string) {
  const match = query.match(/\d+\s*(weeks?|months?|days?)/i);
  return match ? match[0] : null;
}

/* ---------------- GENERATE ROADMAP ---------------- */

async function generateRoadmap(prompt: string) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are an academic planner. Output STRICT JSON only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
  });

  let text = completion.choices?.[0]?.message?.content ?? "";

  text = text.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("❌ Invalid JSON from model:", text);
    throw new Error("Model returned invalid JSON");
  }
}

/* ---------------- ROUTE ---------------- */

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    const subjectTitle = extractSubjectTitle(message);
    const duration = extractDuration(message);

    /* ---------- EXAM DETECTION ---------- */

    const examKeywords = ["GATE", "JEE", "UPSC", "NEET", "NET", "JAM"];

    const detectedExam = examKeywords.find((e) =>
      message.toUpperCase().includes(e)
    );

    /* ---------- PROMPT ---------- */

    const prompt = `
Create a structured study roadmap.

--------------------------------------------------

IMPORTANT RULES:

1. EXAM HANDLING

Exam: ${detectedExam || "None"}

If Exam is NOT "None":

• Organize modules according to the major sections of that exam syllabus  
• Ensure ALL major areas are represented  
• Do NOT omit important sections  
• Include:
  - practice
  - revision
  - previous year questions (PYQs)

If Exam is "None":

• Organize modules using standard university-level subject structure  
• Do NOT include PYQs anywhere  

--------------------------------------------------

2. USER PROVIDED SYLLABUS (HIGHEST PRIORITY)

If the user provides their own syllabus, topics, or list:

• STRICTLY base the roadmap on the provided content  
• Do NOT replace it with standard structure  
• Do NOT introduce unrelated topics  
• You may group or reorder for better learning flow  

If both exam and custom syllabus are present:
• Align with exam structure
• BUT prioritize user-provided topics

--------------------------------------------------

3. USER CONSTRAINTS (STRICT)

If the user specifies:

• removing a subject/topic  
• excluding a module  
• skipping a section  

Then:

• STRICTLY exclude those topics  
• Do NOT include them anywhere in the roadmap  
• Adjust remaining modules accordingly  

--------------------------------------------------

4. DURATION ADAPTATION

Adapt the roadmap to the given time duration:

• Short duration → prioritize high-weight / important topics  
• Long duration → cover full syllabus  

Rules:

• Distribute topics evenly across modules  
• Avoid overloading any module  
• Maintain balanced difficulty  
• Ensure realistic weekly workload  

--------------------------------------------------

5. MODULE STRUCTURE

Modules represent major topic areas.

Each module MUST contain:

• focus_topics → main chapters or units  
• subtopics → specific concepts inside those topics  
• expected_outcome → clear learning outcome  

Ensure:
• All major areas are covered  
• Logical progression between modules  

--------------------------------------------------

6. FINAL MODULE RULES

If Exam is "None":

• The LAST module must include ONLY:
  - revision
  - practice  

• Do NOT include previous year questions (PYQs)

If Exam is present:

• The LAST module MUST include:
  - revision
  - practice
  - previous year questions (PYQs)

--------------------------------------------------

STRUCTURE RULES:

• Each module must contain focus_topics and subtopics  
• Modules must be clearly separated  
• Maintain consistency across all modules  

--------------------------------------------------

OUTPUT FORMAT (RETURN ONLY VALID JSON):

[
{
"week": "Module name",
"focus_topics": [],
"subtopics": [],
"expected_outcome": ""
}
]

--------------------------------------------------

SUBJECT:
${subjectTitle}

USER REQUEST:
${message}
`;

    /* ---------- GENERATE ---------- */

    const raw = await generateRoadmap(prompt);

    if (!Array.isArray(raw)) {
      throw new Error("Invalid roadmap format");
    }

    const roadmap = raw.map((m: any, i: number) => ({
      week: m.week ?? `Module ${i + 1}`,
      focus_topics: m.focus_topics ?? [],
      subtopics: m.subtopics ?? [],
      expected_outcome: m.expected_outcome ?? "",
    }));

    return NextResponse.json({
      subjectTitle,
      duration,
      roadmap,
    });

  } catch (error) {
    console.error("❌ Roadmap generation error:", error);

    return NextResponse.json(
      { error: "Failed to generate roadmap" },
      { status: 500 }
    );
  }
}