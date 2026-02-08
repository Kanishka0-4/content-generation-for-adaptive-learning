import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req) {
  try {
    const { quiz_id } = await req.json();

    const rows = await pool.query(
      `
      SELECT
        qi.id,
        qi.content_type,
        qa.is_correct,
        qa.time_taken_ms
      FROM quiz_items qi
      LEFT JOIN quiz_answers qa ON qa.quiz_item_id = qi.id
      WHERE qi.quiz_id = $1
      ORDER BY qi.created_at
      `,
      [quiz_id]
    );

    // ================= INITIAL STATS =================
    const stats = {
      text: { correct: 0, total: 0, time: 0 },
      audio: { correct: 0, total: 0, time: 0 },
      visual: { correct: 0, total: 0, time: 0 },
    };

    let currentType = null;

    // ================= COLLECT RAW DATA =================
    for (const r of rows.rows) {
      if (r.content_type !== "mcq") {
        currentType = r.content_type;
        continue;
      }

      if (!currentType || r.time_taken_ms == null) continue;

      stats[currentType].total += 1;
      stats[currentType].time += r.time_taken_ms;

      if (r.is_correct) {
        stats[currentType].correct += 1;
      }
    }

    // ================= SCORE CALCULATION =================
    const scores = {
      text: 0,
      audio: 0,
      visual: 0,
    };

    for (const type of ["text", "audio", "visual"]) {
      const TOTAL_QUESTIONS = 3;

      // Clamp correct answers
      const correct = Math.min(stats[type].correct, TOTAL_QUESTIONS);
      const time = stats[type].time;

      // 🔒 Force stats to match rule (for UI consistency)
      stats[type].total = TOTAL_QUESTIONS;
      stats[type].correct = correct;

      const accuracy = correct / TOTAL_QUESTIONS;

      const avgTime =
        time > 0 ? (time / TOTAL_QUESTIONS) / 1000 : 0;

      const speed = avgTime > 0 ? 1 / avgTime : 0;

      // Weighted score
      scores[type] = 0.7 * accuracy + 0.3 * speed;
    }

    // ================= BEST LEARNING STYLE =================
    const best = Object.entries(scores).sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    return NextResponse.json({
      stats,
      scores,
      best_learning_style: best,
    });
  } catch (err) {
    console.error("Quiz result error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
