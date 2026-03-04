import { NextResponse } from "next/server";
import { Pool } from "pg";

/* ---------------- DATABASE ---------------- */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ---------------- GET CHAT (LAZY CREATE) ---------------- */

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> } // 👈 params is a Promise
) {
  const { id } = await context.params; // 👈 MUST await
  const subjectId = Number(id);

  if (isNaN(subjectId)) {
    return NextResponse.json(
      { error: "Invalid subject id" },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    /* -------- 1️⃣ Fetch existing chat -------- */

    const chatRes = await client.query(
      `
      SELECT id, role, message, created_at
      FROM subject_chat
      WHERE subject_id = $1
      ORDER BY created_at ASC
      `,
      [subjectId]
    );

    /* -------- 2️⃣ Lazy seed if empty -------- */

    if (chatRes.rows.length === 0) {
      await client.query(
        `
        INSERT INTO subject_chat (subject_id, role, message)
        VALUES ($1, 'assistant', $2)
        `,
        [
          subjectId,
          "This is the start of your learning journey. Ask anything related to this subject.",
        ]
      );

      const seeded = await client.query(
        `
        SELECT id, role, message, created_at
        FROM subject_chat
        WHERE subject_id = $1
        ORDER BY created_at ASC
        `,
        [subjectId]
      );

      return NextResponse.json({ chat: seeded.rows });
    }

    /* -------- 3️⃣ Return existing chat -------- */

    return NextResponse.json({ chat: chatRes.rows });

  } catch (error) {
    console.error("❌ FETCH CHAT FAILED:", error);

    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
