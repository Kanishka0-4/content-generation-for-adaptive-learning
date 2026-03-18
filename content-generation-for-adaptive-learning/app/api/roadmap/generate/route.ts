import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body?.message;

    // -------- 1. Validate input --------
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    // -------- 2. Get model --------
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // -------- 3. Prompt --------
    const prompt = `
You are an academic study-planner assistant.

TASK:
Create a PRACTICAL, WEEK-BY-WEEK study roadmap.

RULES:
- If a known exam (GATE, JAM, NET, JEE, etc.) is mentioned, STRICTLY follow the official syllabus.
- If the subject is broad, assume standard undergraduate coverage.
- Each week must be realistic and not overloaded.
- Include revision and problem-solving where relevant.
- Output MUST be ONLY valid JSON.

FORMAT (STRICT):
Return a JSON ARRAY. Each element must be:

{
  "week": "Module 1",
  "focus_topics": ["Topic A", "Topic B"],
  "subtopics": ["Subtopic 1", "Subtopic 2"],
  "expected_outcome": "Clear measurable outcome"
}

IMPORTANT:
- focus_topics must ALWAYS be an array
- subtopics must ALWAYS be an array
- No extra text outside JSON

USER REQUEST:
${message}
`;

    // -------- 4. Generate --------
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    // -------- 5. Parse --------
    const raw = JSON.parse(result.response.text());

    if (!Array.isArray(raw)) {
      return NextResponse.json(
        { error: "Invalid roadmap format from model" },
        { status: 500 }
      );
    }

    // -------- 6. Normalize (CRITICAL) --------
    const normalized = raw.map((w: any, i: number) => ({
      week: typeof w.week === "string" ? w.week : `Week ${i + 1}`,

      focus_topics: Array.isArray(w.focus_topics)
        ? w.focus_topics
        : typeof w.focus_topics === "string"
        ? [w.focus_topics]
        : [],

      subtopics: Array.isArray(w.subtopics)
        ? w.subtopics
        : typeof w.subtopics === "string"
        ? [w.subtopics]
        : [],

      expected_outcome:
        typeof w.expected_outcome === "string"
          ? w.expected_outcome
          : "",
    }));

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "Empty roadmap generated" },
        { status: 500 }
      );
    }

    // -------- 7. Success --------
    return NextResponse.json(normalized, { status: 200 });

  } catch (error: any) {
    // -------- 8. Rate limit --------
    if (error?.status === 429) {
      return NextResponse.json(
        { error: "Too many requests. Please wait 30 seconds and try again." },
        { status: 429 }
      );
    }

    console.error("Roadmap generation error:", error);

    // -------- 9. Generic failure --------
    return NextResponse.json(
      { error: "Failed to generate roadmap" },
      { status: 500 }
    );
  }
}
