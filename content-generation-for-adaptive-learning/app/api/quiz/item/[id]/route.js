import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req, context) {
  try {
    const { id } = await context.params;

    const res = await pool.query(
      "SELECT id, question_text, options, correct_option, content_type, media_url FROM quiz_items WHERE id = $1",
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const item = res.rows[0];
    if (typeof item.options === "string") {
      item.options = JSON.parse(item.options);
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error("GET quiz item error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
