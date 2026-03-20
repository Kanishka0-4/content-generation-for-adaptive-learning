import { NextResponse } from "next/server";
import { Pool } from "pg";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";
import { generateModuleContent } from "../../ai/generateModuleContent";

/* ---------------- DATABASE ---------------- */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ---------------- ROUTE ---------------- */

export async function POST(req: Request) {
  const client = await pool.connect();

  try {
    const { roadmap, subjectTitle, duration, exam } = await req.json();

    if (!Array.isArray(roadmap) || roadmap.length === 0) {
      return NextResponse.json(
        { error: "Invalid roadmap" },
        { status: 400 }
      );
    }

    /* ---------- AUTH ---------- */

    const cookieStore =  await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: token missing" },
        { status: 401 }
      );
    }

    const userId = decodeAuthToken(token);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: invalid token" },
        { status: 401 }
      );
    }

    const totalDuration =
      duration ?? `${roadmap.length} weeks`;

    /* ---------- TRANSACTION ---------- */

    await client.query("BEGIN");

    /* ---------- CREATE SUBJECT ---------- */

    const subjectRes = await client.query(
      `
      INSERT INTO module_subjects
      (user_id, title, exam, total_duration)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [userId, subjectTitle, exam ?? null, totalDuration]
    );

    const subjectId = subjectRes.rows[0].id;

    /* ---------- INSERT MODULES ---------- */

    for (let i = 0; i < roadmap.length; i++) {
      const mod = roadmap[i];

      await client.query(
        `
        INSERT INTO modules
        (course_id, module_order, title, goal, topics)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          subjectId,
          i + 1,
          mod.week,
          mod.expected_outcome,
          mod.focus_topics
        ]
      );

      /* ---------- INSERT SUBTOPICS ---------- */

      for (let j = 0; j < mod.subtopics.length; j++) {
        await client.query(
          `
          INSERT INTO module_subtopics
          (subject_id, module_order, subtopic_order, title)
          VALUES ($1, $2, $3, $4)
          `,
          [
            subjectId,
            i + 1,
            j + 1,
            mod.subtopics[j]
          ]
        );
      }
    }

    /* ---------- COMMIT ---------- */

    await client.query("COMMIT");

    console.log("✅ ROADMAP SAVED");

    /* ---------- GENERATE MODULE 1 CONTENT ---------- */

    try {
      await generateModuleContent({
        subjectId,
        subjectTitle,
        module: {
          title: roadmap[0].week,
          topics: roadmap[0].focus_topics,
          expected_outcome: roadmap[0].expected_outcome,
        },
        moduleOrder: 1, // ✅ VERY IMPORTANT
      });

      console.log("🤖 Module 1 generated");

    } catch (err) {
      console.warn("⚠️ Module 1 generation failed", err);
    }

    /* ---------- RESPONSE ---------- */

    return NextResponse.json({
      success: true,
      subjectId,
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