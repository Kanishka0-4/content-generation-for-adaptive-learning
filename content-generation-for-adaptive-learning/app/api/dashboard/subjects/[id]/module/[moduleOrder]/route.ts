import { NextResponse } from "next/server";
import { Pool } from "pg";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; moduleOrder: string }> }
) {
  try {
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

    /* ===== GET USER ID FROM TOKEN ===== */
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

    /* ===== FETCH MODULE CONTENT ===== */
    const moduleResult = await pool.query(
      `
      SELECT id, content
      FROM module_content
      WHERE subject_id = $1
      AND module_order = $2
      `,
      [subjectId, moduleOrderNum]
    );

    if (moduleResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Module content not found" },
        { status: 404 }
      );
    }

    /* ===== FETCH USER LEARNING PROFILE ===== */
    const userResult = await pool.query(
      `
      SELECT learning_profile
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    let learningProfile = userResult.rows[0]?.learning_profile ?? null;

    /* 🔥 Handle string JSON case */
    if (typeof learningProfile === "string") {
      try {
        learningProfile = JSON.parse(learningProfile);
      } catch {
        learningProfile = null;
      }
    }

    /* ===== RETURN RESPONSE ===== */
    return NextResponse.json({
      content: moduleResult.rows[0].content,
      module_id: moduleResult.rows[0].id,
      learning_profile: learningProfile, // ✅ THIS WAS MISSING
    });

  } catch (err) {
    console.error("Module fetch error:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}