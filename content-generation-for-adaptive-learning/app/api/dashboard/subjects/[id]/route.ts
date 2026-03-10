import { NextResponse } from "next/server";
import { Pool } from "pg";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";

/* ---------------- DATABASE ---------------- */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ---------------- GET SUBJECT + MODULES ---------------- */

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {

  const { id } = await context.params;
  const subjectId = Number(id);

  if (isNaN(subjectId)) {
    return NextResponse.json(
      { error: "Invalid subject id" },
      { status: 400 }
    );
  }

  /* -------- AUTH -------- */

  const cookieStore = await cookies();
const token = cookieStore.get("auth_token")?.value;

if (!token) {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}

const userId = decodeAuthToken(token);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const client = await pool.connect();

  try {

    /* -------- 1️⃣ Get subject (ONLY IF OWNED BY USER) -------- */

    const subjectRes = await client.query(
      `
      SELECT id, title, exam, total_duration
      FROM module_subjects
      WHERE id = $1
      AND user_id = $2
      `,
      [subjectId, userId]
    );

    if (subjectRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    /* -------- 2️⃣ Get modules -------- */

    const modulesRes = await client.query(
      `
      SELECT
        module_order,
        title,
        goal,
        topics
      FROM modules
      WHERE course_id = $1
      ORDER BY module_order ASC
      `,
      [subjectId]
    );

    return NextResponse.json({
      subject: subjectRes.rows[0],
      modules: modulesRes.rows,
    });

  } catch (error) {

    console.error("❌ FETCH SUBJECT FAILED:", error);

    return NextResponse.json(
      { error: "Failed to load subject" },
      { status: 500 }
    );

  } finally {

    client.release();

  }
}