import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";

export async function POST(req) {
  try {
    const { quiz_id } = await req.json();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value ?? null;
    const userId = decodeAuthToken(token);

    const rows = await pool.query(
      `
      SELECT
        qi.id,
        qi.mcq_type,
        qa.is_correct,
        qa.time_taken_ms
      FROM quiz_items qi
      LEFT JOIN quiz_answers qa ON qa.quiz_item_id = qi.id
       AND qa.user_id = $2
  WHERE qi.quiz_id = $1::uuid
   AND qi.content_type = 'mcq'
  ORDER BY qi.created_at
      `,
      [quiz_id, userId],
    );

    // ================= INITIAL STATS =================
    const stats = {
      text: { correct: 0, total: 0, time: 0 },
      audio: { correct: 0, total: 0, time: 0 },
      visual: { correct: 0, total: 0, time: 0 },
    };

    //raw data
    for (const r of rows.rows) {
      const type = r.mcq_type;

      if (!type || !stats[type]) continue;

      stats[type].total += 1;

      if (r.time_taken_ms != null) {
        stats[type].time += r.time_taken_ms;
      }

      if (r.is_correct) {
        stats[type].correct += 1;
      }
    }

    // ================= SCORE CALCULATION =================
    const scores = {
      text: 0,
      audio: 0,
      visual: 0,
    };

    //score calculation
    for (const type of ["text", "audio", "visual"]) {
      const total = stats[type].total || 1;
      const correct = stats[type].correct;
      const time = stats[type].time;

      const accuracy = correct / total;

      const avgTime = time > 0 ? time / total / 1000 : 0;

      const speed = avgTime > 0 ? 1 / (1 + avgTime) : 0;

      scores[type] = 0.7 * accuracy + 0.3 * speed;
    }

    // ================= BEST LEARNING STYLE =================
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

    return NextResponse.json({
      stats,
      scores,
      best_learning_style: best,
    });
  } catch (err) {
    console.error("Quiz result error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
