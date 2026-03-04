import { NextResponse } from "next/server";
import { Pool } from "pg";

// 🔹 LLM services
import { generateModuleOneContent } from "../../../llm-service/generateModuleOneContent";
import { inferSubjectTitleFromRoadmap } from "../../../llm-service/inferSubjectTitle";

/* ---------------- DATABASE ---------------- */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ---------------- ROUTE ---------------- */

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const {
      roadmap,
      userId,
      userQuery, // original user prompt (chat seed)
      exam,
    } = await request.json();

    /* -------- Validation -------- */

    if (!Array.isArray(roadmap) || roadmap.length === 0) {
      return NextResponse.json(
        { error: "Roadmap must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    /* -------- Derive Duration (SOURCE OF TRUTH) -------- */

    const totalDuration = `${roadmap.length} weeks`;

    /* -------- Infer Subject Title (safe) -------- */

    let subjectTitle = "Untitled Subject";

    try {
      subjectTitle = await inferSubjectTitleFromRoadmap(roadmap);
    } catch (err) {
      console.warn("⚠️ Subject title inference failed, using fallback");
    }

    /* -------- Transaction Start -------- */

    await client.query("BEGIN");

    /* -------- 1️⃣ Create Subject -------- */

    const subjectRes = await client.query(
      `
      INSERT INTO module_subjects (user_id, title, exam, total_duration)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [userId, subjectTitle, exam ?? null, totalDuration]
    );

    const subjectId: number = subjectRes.rows[0].id;

    console.log("📘 SUBJECT CREATED:", subjectId, subjectTitle);

    /* -------- 2️⃣ Save Initial User Query (Chat Seed) -------- */

    if (userQuery && typeof userQuery === "string") {
      await client.query(
        `
        INSERT INTO subject_chat (subject_id, role, message)
        VALUES ($1, 'user', $2)
        `,
        [subjectId, userQuery]
      );
    }

    /* -------- 3️⃣ Insert Modules -------- */

    for (let i = 0; i < roadmap.length; i++) {
      const mod = roadmap[i];

      console.log("🧩 INSERTING MODULE:", mod.week);

      await client.query(
        `
        INSERT INTO modules (
          course_id,
          module_order,
          title,
          goal,
          topics
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          subjectId,                // FK → module_subjects.id
          i + 1,
          mod.week ?? `Module ${i + 1}`,
          mod.expected_outcome ?? "",
          mod.subtopics ?? [],
        ]
      );
    }

    /* -------- Commit DB -------- */

    await client.query("COMMIT");
    console.log("✅ ROADMAP SAVED SUCCESSFULLY");

    /* -------- 4️⃣ Trigger Module 1 Content (Fire & Forget) -------- */

    // IMPORTANT: do NOT await this
    try {
      generateModuleOneContent({
        subjectId,
        subjectTitle,
        module: {
          title: roadmap[0].week,
          topics: roadmap[0].subtopics ?? [],
          expected_outcome: roadmap[0].expected_outcome ?? "",
        },
      });
    } catch (err) {
      console.warn("⚠️ Module 1 generation failed (non-blocking)");
    }

    /* -------- Response -------- */

    return NextResponse.json({
      success: true,
      subjectId,
      subjectTitle,
      total_duration: totalDuration,
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ SAVE ROADMAP FAILED:", error);

    return NextResponse.json(
      { error: "Failed to save roadmap" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
