import { NextResponse } from "next/server";
import { Pool } from "pg";
import { cookies } from "next/headers";
import { decodeAuthToken } from "@/lib/auth";
import { generateModuleContent } from "../../ai/generateModuleContent";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function adjustVARKWeights(
  profile: { visual: number; audio: number; text: number; kinesthetic: number },
  scorePercent: number
) {
  let { visual, audio, text, kinesthetic } = profile;
  if (scorePercent >= 70) {
    return { visual, audio, text, kinesthetic };
  } else if (scorePercent >= 40) {
    const arr = [visual, audio, text, kinesthetic];
    const sorted = [...arr].sort((a, b) => b - a);
    const secondIdx = arr.indexOf(sorted[1]);
    arr[secondIdx] += 10;
    arr[arr.indexOf(sorted[0])] -= 10;
    return { visual: arr[0], audio: arr[1], text: arr[2], kinesthetic: arr[3] };
  } else {
    return { visual: 20, audio: 20, text: 40, kinesthetic: 20 };
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const userId = token ? decodeAuthToken(token) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subjectId, moduleOrder, score, total, profile, quiz } = body;

    if (!subjectId || !moduleOrder || score == null || !total || !profile || !quiz) {
      return NextResponse.json(
        { error: "Missing fields (require subjectId, moduleOrder, score, total, profile, quiz)" },
        { status: 400 }
      );
    }

    const scoreInt = parseInt(score, 10);
    const totalInt = parseInt(total, 10);
    if (isNaN(scoreInt) || isNaN(totalInt)) {
      return NextResponse.json({ error: "Score and total must be integers" }, { status: 400 });
    }

    const percent = Math.round((scoreInt / totalInt) * 100);
    const newProfile = adjustVARKWeights(profile, percent);

    // Update score in module_quiz
    try {
      const result = await pool.query(
        `UPDATE module_quiz
         SET score = $1, total = $2
         WHERE subject_id = $3 AND module_order = $4 AND user_id = $5`,
        [scoreInt, totalInt, subjectId, moduleOrder, userId]
      );

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: "No module_quiz row found. Was the quiz generated first?" },
          { status: 404 }
        );
      }
    } catch (err) {
      const e = err as any;
      console.error("Failed to update module_quiz", e);
      return NextResponse.json(
        { error: "Failed to save quiz score", details: e?.message || String(e) },
        { status: 500 }
      );
    }

    // Update user learning profile
    try {
      const result = await pool.query(
        `UPDATE users SET learning_profile = $1 WHERE id = $2`,
        [JSON.stringify(newProfile), userId]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: "User not found for profile update" }, { status: 404 });
      }
    } catch (err) {
      const e = err as any;
      console.error("Failed to update user learning_profile", e);
      return NextResponse.json(
        { error: "Failed to update user profile", details: e?.message || String(e) },
        { status: 500 }
      );
    }

    // ── Trigger next module generation in the background ──
    const nextModuleOrder = parseInt(moduleOrder, 10) + 1;

    // Fire and forget — don't await, so response returns immediately
    (async () => {
      try {
        // Check if next module content already exists
        const existingContent = await pool.query(
          `SELECT id FROM module_content WHERE subject_id = $1 AND module_order = $2`,
          [subjectId, nextModuleOrder]
        );

        if (existingContent.rows.length > 0) {
          console.log(`📦 Module ${nextModuleOrder} already exists, skipping generation`);
          return;
        }

        // Fetch next module metadata from modules table
        const nextModule = await pool.query(
          `SELECT title, goal, topics FROM modules
           WHERE course_id = $1 AND module_order = $2`,
          [subjectId, nextModuleOrder]
        );

        if (nextModule.rows.length === 0) {
          console.log(`ℹ️ No module ${nextModuleOrder} found — this was the last module`);
          return;
        }

        // Fetch subject title
        const subjectRes = await pool.query(
          `SELECT title FROM module_subjects WHERE id = $1`,
          [subjectId]
        );

        if (subjectRes.rows.length === 0) {
          console.warn(`⚠️ Subject ${subjectId} not found`);
          return;
        }

        const subjectTitle = subjectRes.rows[0].title;
        const mod = nextModule.rows[0];

        console.log(`🤖 Generating Module ${nextModuleOrder} for subject ${subjectId}...`);

        await generateModuleContent({
          subjectId: parseInt(subjectId, 10),
          subjectTitle,
          module: {
            title: mod.title,
            topics: mod.topics,
            expected_outcome: mod.goal,
          },
          moduleOrder: nextModuleOrder,
        });

        console.log(`✅ Module ${nextModuleOrder} generated`);
      } catch (err) {
        console.error(`❌ Background generation of module ${nextModuleOrder} failed:`, err);
      }
    })();

    return NextResponse.json({ newProfile, percent });
  } catch (err: any) {
    console.error("Score save failed", err);
    return NextResponse.json(
      { error: "Score save failed", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}