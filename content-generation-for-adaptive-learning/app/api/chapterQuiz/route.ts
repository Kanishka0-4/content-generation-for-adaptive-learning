import { NextResponse } from "next/server";
import { Pool } from "pg";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const userId = token ? decodeAuthToken(token) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subjectId, moduleOrder, chapterIndex, score, total } = body;

    if (!subjectId || moduleOrder == null || chapterIndex == null || score == null || !total) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Upsert — if already saved, update score
    await pool.query(
      `INSERT INTO chapter_quiz_scores (user_id, subject_id, module_order, chapter_index, score, total)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, subject_id, module_order, chapter_index)
       DO UPDATE SET score = EXCLUDED.score, total = EXCLUDED.total`,
      [userId, subjectId, moduleOrder, chapterIndex, score, total]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Chapter quiz save error:", err);
    return NextResponse.json(
      { error: "Failed to save chapter quiz", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

// Fetch completed chapter indexes for a module
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const userId = token ? decodeAuthToken(token) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const moduleOrder = searchParams.get("moduleOrder");

    if (!subjectId || moduleOrder == null) {
      return NextResponse.json({ error: "Missing subjectId or moduleOrder" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT chapter_index, score, total FROM chapter_quiz_scores
       WHERE user_id = $1 AND subject_id = $2 AND module_order = $3`,
      [userId, subjectId, moduleOrder]
    );

    return NextResponse.json({ completed: result.rows });
  } catch (err: any) {
    console.error("Chapter quiz fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch chapter progress", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}