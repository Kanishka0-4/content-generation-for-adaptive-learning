import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; moduleOrder: string }> }
) {
  // unwrap params
  const { id, moduleOrder } = await context.params;

  const subjectId = Number(id);
  const moduleOrderNum = Number(moduleOrder);

  if (isNaN(subjectId) || isNaN(moduleOrderNum)) {
    return NextResponse.json(
      { error: "Invalid parameters" },
      { status: 400 }
    );
  }

  const result = await pool.query(
    `
    SELECT content
    FROM module_content
    WHERE subject_id = $1
    AND module_order = $2
    `,
    [subjectId, moduleOrderNum]
  );

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: "Module content not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    content: result.rows[0].content,
  });
}