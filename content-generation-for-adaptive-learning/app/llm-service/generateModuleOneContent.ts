import { Pool } from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";

/* ---------------- DB ---------------- */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ---------------- GEMINI ---------------- */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/* ---------------- PROMPT BUILDER ---------------- */

function buildModulePrompt({
  subjectTitle,
  moduleTitle,
  topics,
  goal,
  profile,
}: {
  subjectTitle: string;
  moduleTitle: string;
  topics: string[];
  goal: string;
  profile: {
    visual: number;
    audio: number;
    text: number;
  };
}) {

  const safeTopics = topics ?? [];

  return `
You are an expert university educator generating adaptive learning material.

SUBJECT
${subjectTitle}

MODULE
${moduleTitle}

MODULE GOAL
${goal ?? ""}

--------------------------------------------------

SUBTOPICS (CHAPTER LIST)

${safeTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Each subtopic MUST become exactly ONE chapter.

--------------------------------------------------

LEARNING PROFILE

Visual emphasis: ${profile.visual}%
Audio emphasis: ${profile.audio}%
Text emphasis: ${profile.text}%

CONTENT ADAPTATION RULES

Adapt explanation style dynamically according to these percentages. The content should feel cohesive and unified, but the style of explanation should shift according to the profile.Also the complete module must feel enough to be completed in 1 week. Considering the user studies 1-2 hours daily.

VISUAL EMPHASIS
If visual percentage is high:
• Use diagrams frequently
• Prefer flow explanations
• Use hierarchical breakdowns
• Use comparisons when explaining differences
• Include structural reasoning

TEXT EMPHASIS
If text percentage is high:
• Provide deeper conceptual explanation
• Include definitions and precise explanations
• Provide structured conceptual clarity

AUDIO EMPHASIS
If audio percentage is high:
• Use conversational explanations
• Write explanations that sound natural when spoken
• Use storytelling style analogies
• Use examples that feel like narration

IMPORTANT

Do NOT mention learning styles anywhere in the content.

--------------------------------------------------

VISUALIZATION RULES

Each chapter MUST contain at least one visual block.
Place each visual immediately after the concept it explains.
Choose the type that best fits the content.

[VISUAL]
type: flow
title: ...
data:
- step: ...
  description: ...
[/VISUAL]

[VISUAL]
type: cycle
title: ...
data:
- step: ...
  description: ...
[/VISUAL]

[VISUAL]
type: hierarchy
title: ...
data:
- concept: ...
  description: ...
[/VISUAL]

[VISUAL]
type: hierarchy
title: ...
data:
- name: ...
  description: ...
  children:
  - name: ...
    description: ...
[/VISUAL]

[VISUAL]
type: comparison
title: ...
data:
- concept: ...
  features:
    - ...
    - ...
  example: ...
[/VISUAL]

- flow / cycle      → step, description
- hierarchy (flat)  → concept, description
- hierarchy (nested)→ name, description, children
- comparison        → concept, features, example

--------------------------------------------------

WRITING STYLE RULES

The material must feel like well-written study notes.
Visual explanations should not repeat in the text but can be extended in the text.

Paragraph rules:

• 2–4 sentences per paragraph
• Avoid long blocks of text
• Use spacing for readability

Each chapter MUST include:

• one analogy
• one real-world application
• one example
• one bullet list at the end summarizing key points.the points should be in the form:
### Key Takeaways


--------------------------------------------------

OUTPUT FORMAT RULES (STRICT)

1. Use Markdown formatting.

2. Each chapter MUST start exactly like:

## Chapter X: Chapter Title

Example:
## Chapter 1: Introduction to Operating Systems

3. Do NOT add any other headings inside chapters.

4. Do NOT add quizzes.

5. Do NOT mention learning styles.

6. Do NOT write explanations outside markdown.

7. Return ONLY the markdown content.

`.trim();
}

/* ---------------- MAIN GENERATOR ---------------- */

export async function generateModuleOneContent({
  subjectId,
  subjectTitle,
  module,
}: {
  subjectId: number;
  subjectTitle: string;
  module: {
    title: string;
    topics?: string[];
    expected_outcome?: string;
    goal?: string;
  };
}) {

  try {

    console.log("🤖 Generating Module 1 content…");

    /* -------- FETCH LEARNING PROFILE -------- */

    const subjectIdInt = Number(subjectId);

    if (isNaN(subjectIdInt)) {
      throw new Error("Invalid subjectId");
    }

    const result = await pool.query(
      `
      SELECT users.learning_profile
      FROM users
      JOIN module_subjects
      ON users.id = module_subjects.user_id
      WHERE module_subjects.id = $1
      `,
      [subjectIdInt]
    );

    if (!result.rows.length) {
      throw new Error("User learning profile not found");
    }

    const profile = result.rows[0].learning_profile;

    if (!profile) {
      throw new Error("Learning profile missing for user");
    }

    /* -------- MODEL -------- */

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const topics = module.topics ?? [];
    const goal = module.expected_outcome ?? module.goal ?? "";

    const prompt = buildModulePrompt({
      subjectTitle,
      moduleTitle: module.title,
      topics,
      goal,
      profile,
    });

    const resultAI = await model.generateContent(prompt);

    const content = resultAI.response.text();

    if (!content || content.length < 200) {
      throw new Error("Generated content too short");
    }

    /* -------- SAVE CONTENT -------- */

    await pool.query(
      `
      INSERT INTO module_content
      (subject_id, module_order, content)
      VALUES ($1,$2,$3)
      `,
      [subjectId, 1, content]
    );

    console.log("✅ Module 1 content stored successfully");

  } catch (err) {

    console.error("❌ Module 1 generation failed:", err);

  }
}