// app/api/quiz/answer/route.js
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";

export async function POST(req) {
  try {
    const { quiz_item_id, selected_option, time_taken_ms } = await req.json();

    console.log("ANSWER API RECEIVED:", {
      quiz_item_id,
      selected_option,
      time_taken_ms,
    });

    // ---- VALIDATION ----
    if (
      typeof quiz_item_id !== "string" ||
      typeof selected_option !== "number" ||
      typeof time_taken_ms !== "number"
    ) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          received: { quiz_item_id, selected_option, time_taken_ms },
        },
        { status: 400 },
      );
    }

    // ---- AUTH ----
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value ?? null;
    const userId = decodeAuthToken(token);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---- FETCH CORRECT OPTION ----
    const itemRes = await pool.query(
      "SELECT correct_option FROM quiz_items WHERE id = $1",
      [quiz_item_id],
    );

    if (itemRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Quiz item not found" },
        { status: 404 },
      );
    }

    const correct_option = itemRes.rows[0].correct_option;

    const is_correct = selected_option === correct_option;

    console.log("INSERTING ANSWER:", {
      quiz_item_id,
      userId,
      selected_option,
      is_correct,
      correct_option,
      time_taken_ms,
    });

    // ---- INSERT ----
    await pool.query(
      `INSERT INTO quiz_answers
       (quiz_item_id, user_id, selected_option, is_correct, time_taken_ms, answered_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [quiz_item_id, userId, selected_option, is_correct, time_taken_ms],
    );

    return NextResponse.json({ success: true, is_correct });
  } catch (err) {
    console.error("ANSWER INSERT FAILED:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
