import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";

export async function POST(req) {
  try {
    const { quiz_id } = await req.json();

    /* ===== AUTH ===== */
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = decodeAuthToken(token);

    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    /* ===== FETCH QUIZ DATA ===== */
    const rows = await pool.query(
      `
  SELECT
    qi.id,
    qi.mcq_type,
    qa.is_correct,
    qa.time_taken_ms
  FROM quiz_items qi
  INNER JOIN (
    SELECT DISTINCT ON (quiz_item_id)
      quiz_item_id,
      is_correct,
      time_taken_ms
    FROM quiz_answers
    WHERE user_id = $2
    ORDER BY quiz_item_id, answered_at DESC
  ) qa ON qa.quiz_item_id = qi.id
  WHERE qi.quiz_id = $1::uuid
    AND qi.content_type = 'mcq'
  ORDER BY qi.created_at
  `,
      [quiz_id, userId],
    );

    /* ===== INITIAL STATS ===== */
    const stats = {
      text: { correct: 0, total: 0, time: 0 },
      audio: { correct: 0, total: 0, time: 0 },
      visual: { correct: 0, total: 0, time: 0 },
    };

    /* ===== COLLECT DATA ===== */
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

    /* ===== SCORE CALCULATION ===== */
    const scores = {
      text: 0,
      audio: 0,
      visual: 0,
    };

    for (const type of ["text", "audio", "visual"]) {
      const total = stats[type].total || 1;
      const correct = stats[type].correct;
      const time = stats[type].time;

      const accuracy = correct / total;

      const avgTime = time > 0 ? time / total / 1000 : 0;

      const speed = avgTime > 0 ? 1 / (1 + avgTime) : 0;

      scores[type] = 0.7 * accuracy + 0.3 * speed;
    }

    /* ===== CALCULATE PERCENTAGES ===== */
    const totalScore = scores.text + scores.audio + scores.visual || 1;

    const percentages = {
      text: Math.round((scores.text / totalScore) * 100),
      audio: Math.round((scores.audio / totalScore) * 100),
      visual: Math.round((scores.visual / totalScore) * 100),
    };

    /* ===== DETERMINE BEST STYLE ===== */
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

    /* ===== SAVE RESULT ===== */
    await pool.query(
      `
      UPDATE users
      SET learning_style = $1,
          learning_profile = $2,
          quiz_completed = TRUE
      WHERE id = $3
      `,
      [best, JSON.stringify(percentages), userId],
    );

    /* ===== RESPONSE ===== */
    return NextResponse.json({
      stats,
      scores,
      percentages,
      best_learning_style: best,
    });
  } catch (err) {
    console.error("Quiz result error:", err);

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
