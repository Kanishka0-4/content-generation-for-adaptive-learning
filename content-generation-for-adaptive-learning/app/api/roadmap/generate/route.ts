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

/* ---------------- DURATION PARSING ---------------- */

function parseDuration(query: string) {
  const match = query.match(/(\d+)\s*(weeks?|months?|days?)/i);

  if (!match) {
    return {
      raw: null,
      unit: null,
      value: null,
      moduleCount: 8, // default fallback
    };
  }

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  let moduleCount = 8;

  if (unit.includes("week")) {
    moduleCount = value;
  } else if (unit.includes("month")) {
    moduleCount = value * 4;
  } else if (unit.includes("day")) {
    moduleCount = Math.max(1, Math.floor(value / 3));
  }

  return {
    raw: match[0],
    unit,
    value,
    moduleCount,
  };
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
    const durationInfo = parseDuration(message);

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
• The content should be elaboarate and comprehensive, covering all key topics and subtopics relevant to the subject
• Do NOT include PYQs anywhere  

--------------------------------------------------

2. USER PROVIDED SYLLABUS (HIGHEST PRIORITY)

If the user provides their own syllabus, topics, or list:

• STRICTLY base the roadmap on the provided content  
• Do NOT replace it with standard structure  
• Do NOT introduce unrelated topics  
• You may group or reorder for better learning flow  

--------------------------------------------------

3. USER CONSTRAINTS (STRICT)

If the user specifies removing topics:

• STRICTLY exclude them  
• Do NOT include anywhere  

--------------------------------------------------

4. DURATION ADAPTATION

Total modules required: ${durationInfo.moduleCount}

CONTENT GRANULARITY RULE:

If duration is SHORT (≤ 4 weeks):
• Combine topics
• Focus only on important concepts
• Don't leave content too sparse
• Avoid overly broad modules but the over all module should cover all the important topics

If duration is MEDIUM (1–3 months):
• Balanced coverage
• Moderate depth
• Structured subtopics
• Sub topics should not be too less but enough to cover the important topics and according to the time available

If duration is LONG (≥ 3 months):
• Deep coverage
• Break into fine-grained subtopics
• Detailed conceptual flow
• Include advanced topics if relevant
• Sub topics should be detailed and cover all the important topics according to the time available

SUBTOPIC DENSITY RULE:

• Short duration → fewer subtopics but still cover all important areas
• Long duration → more detailed subtopics 

--------------------------------------------------

5. MODULE STRUCTURE

Each module MUST contain:

• focus_topics  
• subtopics  
• expected_outcome  

--------------------------------------------------

6. FINAL MODULE RULES

If Exam exists:

• Last module = revision + practice + PYQs  

--------------------------------------------------

OUTPUT FORMAT (STRICT JSON):

[
{
"week": "Module name",
"focus_topics": [],
"subtopics": [],
"expected_outcome": ""
}
]

--------------------------------------------------

STRICT:

• Generate EXACTLY ${durationInfo.moduleCount} modules  
• Do NOT generate more or fewer  

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
      duration: durationInfo.raw,
      moduleCount: durationInfo.moduleCount,
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