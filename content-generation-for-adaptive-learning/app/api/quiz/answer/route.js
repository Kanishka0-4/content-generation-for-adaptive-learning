// app/api/quiz/answer/route.js
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const { quiz_item_id, selected_option, time_taken_ms } = body;

    if (!quiz_item_id || selected_option == null || time_taken_ms == null) {
      return NextResponse.json(
        { error: "quiz_item_id, selected_option, time_taken_ms required" },
        { status: 400 }
      );
    }

    // --------------------------
    // Authenticate the user
    // --------------------------
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value ?? null;
    const userId = decodeAuthToken(token);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --------------------------
    // Fetch correct answer from DB
    // --------------------------
    const itemRes = await pool.query(
      `SELECT correct_option FROM quiz_items WHERE id = $1`,
      [quiz_item_id]
    );

    if (itemRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Quiz item not found" },
        { status: 404 }
      );
    }

    const correct_option = itemRes.rows[0].correct_option;

    // Compare answers
    const is_correct = selected_option === correct_option;

    // --------------------------
    // Save answer
    // --------------------------
    await pool.query(
      `INSERT INTO quiz_answers 
       (quiz_item_id, user_id, selected_option, is_correct, time_taken_ms)
       VALUES ($1, $2, $3, $4, $5)`,
      [quiz_item_id, userId, selected_option, is_correct, time_taken_ms]
    );

    return NextResponse.json({ success: true, is_correct });
  } catch (err) {
    console.error("SAVE ANSWER ERROR:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
