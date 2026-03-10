import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

/* SUBJECT EXTRACTION */

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

async function generateRoadmap(prompt: string) {

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are an academic planner. Output STRICT JSON only." },
      { role: "user", content: prompt }
    ],
    temperature: 0.4
  });

  let text = completion.choices?.[0]?.message?.content ?? "";

  text = text.replace(/```json/g, "").replace(/```/g, "").trim();

  return JSON.parse(text);
}

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

    const prompt = `
Create a structured study roadmap.

IMPORTANT RULES:

1. If a known exam is mentioned (for example GATE, JEE, UPSC, NET, etc.), organize the roadmap according to the major sections of that exam syllabus.

   Example:
   - GATE Chemistry → Physical Chemistry, Organic Chemistry, Inorganic Chemistry, Spectroscopy, Mathematics, Practice/Revision.
   - GATE Computer Science → Algorithms, Data Structures, Operating Systems, DBMS, Computer Networks, Practice.

2. If no exam is mentioned, organize modules according to standard undergraduate subject structure used in universities.
When preparing for an exam, ensure that all major syllabus areas of that exam are represented across the modules.
Do not omit major sections of the syllabus.

3. Adapt the roadmap to the given time duration:
   - If the duration is short → prioritize the most important or high-weight topics.
   - If the duration is long → cover the full syllabus.
   - If preparing for an exam → include practice, revision, and previous year questions.

4. Modules represent major topic areas.

Ensure that all major syllabus areas of the exam are included. 
For example, GATE Computer Science must include:
Discrete Mathematics, Data Structures, Algorithms, Computer Organization, Operating Systems, Databases, Computer Networks, Theory of Computation, and Compiler Design.

5. Each module must contain:
   - focus_topics → main chapters or units
   - subtopics → specific concepts inside those topics
   - expected_outcome → what the learner should understand after completing the module.

STRUCTURE RULES:
- Each module must contain focus_topics and subtopics

OUTPUT FORMAT (RETURN ONLY VALID JSON):

[
{
"week": "Module name",
"focus_topics": [],
"subtopics": [],
"expected_outcome": ""
}
]

SUBJECT:
${subjectTitle}

USER REQUEST:
${message}
`;

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
      roadmap
    });

  } catch (error) {

    console.error("Roadmap generation error:", error);

    return NextResponse.json(
      { error: "Failed to generate roadmap" },
      { status: 500 }
    );
  }
}