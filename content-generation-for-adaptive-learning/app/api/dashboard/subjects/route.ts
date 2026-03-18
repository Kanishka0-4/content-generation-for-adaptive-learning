import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId" },
      { status: 400 }
    );
  }

  const result = await pool.query(
    `
    SELECT
      ms.id,
      ms.title,
      ms.exam,
      ms.total_duration,
      COALESCE(ROUND(AVG(m.progress)), 0) AS progress
    FROM module_subjects ms
    LEFT JOIN modules m ON m.course_id = ms.id
    WHERE ms.user_id = $1
    GROUP BY ms.id
    ORDER BY ms.created_at DESC
    `,
    [userId]
  );

  return NextResponse.json(result.rows);
}
