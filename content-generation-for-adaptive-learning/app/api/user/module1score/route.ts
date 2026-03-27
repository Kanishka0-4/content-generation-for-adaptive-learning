import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(req: Request) {
  try {
    // Get user id from query or JWT cookie
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    // Find module 1 quiz score for this user
    const result = await pool.query("SELECT score, total FROM module_quiz_scores WHERE subject_id = $1 AND module_order = 1 ORDER BY id DESC LIMIT 1", [id]);
    if (!result.rows.length) return NextResponse.json({ error: "No module 1 score found" }, { status: 404 });
    return NextResponse.json({ score: result.rows[0].score, total: result.rows[0].total });
  } catch (err) {
    let message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to fetch module 1 score", details: message }, { status: 500 });
  }
}