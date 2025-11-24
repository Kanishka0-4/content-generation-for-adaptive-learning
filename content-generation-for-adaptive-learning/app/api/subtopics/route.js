// app/api/subtopics/route.js
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generateSubtopics } from "@/lib/ai";

export async function POST(req) {
  try {
    const body = await req.json();
    const subject_id = body.subject_id;
    const subject_name = body.subject_name;

    if (!subject_id || !subject_name) {
      return NextResponse.json(
        { error: "subject_id and subject_name required" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Check existing
      const existing = await client.query(
        "SELECT id, name FROM subtopics WHERE subject_id = $1 ORDER BY created_at",
        [subject_id]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json({
          alreadyExists: true,
          subtopics: existing.rows,
        });
      }

      // Generate via gemini
      const generated = await generateSubtopics(subject_name, 10);
      // 8-12 recommended
      // Basic validation & dedupe
      const unique = Array.from(new Set(generated)).slice(0, 12);

      // Insert transactionally
      await client.query("BEGIN");
      const inserted = [];
      const insertSQL =
        "INSERT INTO subtopics (subject_id, name) VALUES ($1, $2) RETURNING id, name, created_at";
      for (const name of unique) {
        const r = await client.query(insertSQL, [subject_id, name]);
        inserted.push(r.rows[0]);
      }
      await client.query("COMMIT");

      return NextResponse.json({ alreadyExists: false, subtopics: inserted });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /api/subtopics error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
