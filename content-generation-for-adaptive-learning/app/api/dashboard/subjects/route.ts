import { NextResponse } from "next/server";
import { Pool } from "pg";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  try {

    /* ===== AUTH ===== */

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
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    /* ===== FETCH USER DASHBOARD DATA ===== */

    const result = await pool.query(
      `
      SELECT
        ms.id,
        ms.title,
        ms.exam,
        ms.total_duration,
        COALESCE(ROUND(AVG(m.progress)),0) AS progress
      FROM module_subjects ms
      LEFT JOIN modules m ON m.course_id = ms.id
      WHERE ms.user_id = $1
      GROUP BY ms.id
      ORDER BY ms.created_at DESC
      `,
      [userId]
    );

    return NextResponse.json(result.rows);

  } catch (error: unknown) {

    console.error("Dashboard API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}