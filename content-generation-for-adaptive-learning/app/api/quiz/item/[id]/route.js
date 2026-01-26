import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req, context) {
  try {
    const { id } = await context.params;

    const res = await pool.query(
      "SELECT id, question_text, options, correct_option, content_type, media_url FROM quiz_items WHERE id=$1",
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ item: res.rows[0] });

  } catch (err) {
    console.error("ITEM FETCH ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
