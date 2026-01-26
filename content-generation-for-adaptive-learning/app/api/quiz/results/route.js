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

    const stats = {
      text: { correct: 0, total: 0, time: 0 },
      audio: { correct: 0, total: 0, time: 0 },
      visual: { correct: 0, total: 0, time: 0 },
    };

    let currentType = null;

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

    const scores = {};
    for (const type of ["text", "audio", "visual"]) {
      const { correct, total, time } = stats[type];

      if (total === 0) {
        scores[type] = 0;
        continue;
      }

      const accuracy = correct / total;
      const avgTime = (time / total)/ 1000;
      const speed = 1 / avgTime;

      scores[type] = 0.7 * accuracy + 0.3 * speed;
    }

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

    return NextResponse.json({
      stats,
      scores,
      best_learning_style: best,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
