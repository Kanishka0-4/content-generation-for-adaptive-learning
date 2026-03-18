import { NextResponse } from "next/server";
import { Pool } from "pg";

/* ---------- DB CONNECTION (DEV SAFE) ---------- */

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

const pool =
  global.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}

/* ---------- GET ROADMAP ---------- */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("id");

    // ✅ HARD GUARD
    if (!courseId || courseId === "null" || courseId === "undefined") {
      return NextResponse.json(
        { error: "Invalid course id" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        module_order,
        title,
        goal,
        topics,
        start_week,
        end_week
      FROM modules
      WHERE course_id = $1
      ORDER BY module_order ASC
      `,
      [courseId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // ✅ NORMALIZE FOR ROADMAP UI
    const roadmap = result.rows.map((row: any) => ({
      week:
        row.start_week && row.end_week
          ? `${row.start_week} – ${row.end_week}`
          : `Module ${row.module_order}: ${row.title}`,

      focus_topics: Array.isArray(row.topics) ? row.topics : [],
      subtopics: [],
      expected_outcome: row.goal || "",
    }));

    return NextResponse.json(roadmap, { status: 200 });

  } catch (err) {
    console.error("❌ GET ROADMAP ERROR:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
