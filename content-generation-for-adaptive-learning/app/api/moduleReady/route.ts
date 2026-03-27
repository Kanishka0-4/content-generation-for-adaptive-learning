import { NextResponse } from "next/server";
import { Pool } from "pg";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET /api/moduleReady?subjectId=X&moduleOrder=Y
// Returns { ready: true } if module content exists, { ready: false } if still generating
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
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT id FROM module_content WHERE subject_id = $1 AND module_order = $2`,
      [subjectId, moduleOrder]
    );

    // Also check if the module exists in the roadmap at all
    const moduleExists = await pool.query(
      `SELECT id FROM modules WHERE course_id = $1 AND module_order = $2`,
      [subjectId, moduleOrder]
    );

    if (moduleExists.rows.length === 0) {
      // No next module in the roadmap — this was the last one
      return NextResponse.json({ ready: false, isLast: true });
    }

    return NextResponse.json({ ready: result.rows.length > 0, isLast: false });
  } catch (err: any) {
    console.error("Module ready check failed:", err);
    return NextResponse.json(
      { error: "Check failed", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}