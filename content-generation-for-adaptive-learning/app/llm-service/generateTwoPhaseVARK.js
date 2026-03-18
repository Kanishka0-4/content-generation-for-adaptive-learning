// generateTwoPhaseVARK.js
// Node v18+ (has global fetch). Uses 'say' for TTS (already used in your project).
// Place this file in your llm-service directory and run with:
//   node generateTwoPhaseVARK.js
//
// Requires: ollama running locally (http://localhost:11434/api/generate)
//           "say" npm package installed

import fs from "fs";
import path from "path";
import say from "say";

/* -------------------------
   Phase 1: Base lesson generator
   ------------------------- */
function buildBasePrompt(topic) {
  return `
Write a clear, coherent study explanation for the topic below.
Include: a short intro, 2-3 explanation paragraphs, one real-life example, and a short summary.
Do NOT add diagrams, VARK elements, lists, or tasks. Just a simple, clean lesson.

Topic: "{{topic}}"
`.trim();
}

export async function generateBaseLesson(topic, model = "mistral") {
  try {
    const prompt = buildBasePrompt(topic);

    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false })
    });

    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);

    const data = await res.json();
    return data.response || "";
  } catch (err) {
    console.error("ERROR in generateBaseLesson:", err);
    return "";
  }
}

/* -------------------------
   Phase 2: VARK transformation
   - Transform the base lesson into a single flowing lesson
   - Insert VARK elements proportionally (all styles present but amounts vary)
   - Append a short AUDITORY SCRIPT (labeled) for reliable TTS extraction
   ------------------------- */
function buildVarkTransformPrompt(topic, percentages, baseLesson) {
  // percentages = { visual, auditory, readwrite, kinesthetic } (numbers, sum needn't be 100)
  return `
Rewrite the lesson below by adding ALL FOUR VARK styles naturally, while keeping the original flow.

Blend styles based on these weights:
Visual {{visual}}%, Auditory {{auditory}}%, Read/Write {{readwrite}}%, Kinesthetic {{kinesthetic}}%.

Rules:
- Visual: add small diagrams or arrows when useful.
- Auditory: add a few conversational lines.
- Read/Write: add brief notes or short lists.
- Kinesthetic: add 1–2 small hands-on tasks after the explanation.

Keep the text flowing like a single lesson. Do NOT create separate VARK sections.

At the end, add:
=== AUDITORY SCRIPT ===
(A short spoken-style summary, max 50 words)

Rewrite this lesson:
"""{{baseLesson}}"""
`.trim();
}

export async function applyVARKTransformation(baseLesson, percentages, topic, model = "mistral") {
  try {
    const prompt = buildVarkTransformPrompt(topic, percentages, baseLesson);

    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false })
    });

    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);

    const data = await res.json();
    return data.response || "";
  } catch (err) {
    console.error("ERROR in applyVARKTransformation:", err);
    return "";
  }
}

/* -------------------------
   Extract auditory script block generated at the end
   The transformer was instructed to append:
   === AUDITORY SCRIPT ===
   <script here>
   ------------------------- */
function extractAuditoryScriptAndClean(varkText) {
  const marker = "=== AUDITORY SCRIPT ===";
  const idx = varkText.indexOf(marker);
  if (idx === -1) {
    // Nothing found, return empty script and full text as-is
    return { varkLesson: varkText.trim(), auditoryScript: "" };
  }

  const before = varkText.substring(0, idx).trim();
  const after = varkText.substring(idx + marker.length).trim();

  // The script is the first paragraph in 'after'
  // Stop at double newline or end
  let script = after;
  const doubleNewline = after.indexOf("\n\n");
  if (doubleNewline !== -1) script = after.substring(0, doubleNewline).trim();

  return {
    varkLesson: before,
    auditoryScript: script
  };
}

/* -------------------------
   TTS generation (say.export)
   ------------------------- */
async function generateAudioFromText(text, outName = "vark_auditory.wav") {
  return new Promise((resolve, reject) => {
    const audioDir = path.join(process.cwd(), "audio");
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const outPath = path.join(audioDir, outName);

    // say.export(text, voice, speed, outPath, callback)
    say.export(text, null, 1.0, outPath, (err) => {
      if (err) return reject(err);
      resolve(outPath);
    });
  });
}

/* -------------------------
   Orchestrator: run both phases and produce final JSON
   ------------------------- */
export async function generateTwoPhaseVARK(topic, percentages, model = "mistral") {
  try {
    // Phase 1: base lesson
    const baseLesson = await generateBaseLesson(topic, model);
    if (!baseLesson) throw new Error("Base lesson generation failed");

    // Phase 2: transform using the base lesson
    const transformed = await applyVARKTransformation(baseLesson, percentages, topic, model);
    if (!transformed) throw new Error("VARK transformation failed");

    // Extract auditory script and cleaned vark lesson
    const { varkLesson, auditoryScript } = extractAuditoryScriptAndClean(transformed);

    // If auditory script present, generate audio
    let auditoryAudioPath = null;
    if (auditoryScript && auditoryScript.length > 10) {
      auditoryAudioPath = await generateAudioFromText(auditoryScript);
    }

    return {
      topic,
      baseLesson,
      varkLesson,
      auditoryScript,     // short script (for debugging or storing)
      auditoryAudioPath
    };
  } catch (err) {
    console.error("ERROR in generateTwoPhaseVARK:", err);
    return {
      topic,
      baseLesson: "",
      varkLesson: "",
      auditoryScript: "",
      auditoryAudioPath: null,
      error: err.message
    };
  }
}

/* -------------------------
   Optional test runner: run with `node generateTwoPhaseVARK.js`
   ------------------------- */
if (process.argv[1].includes("generateTwoPhaseVARK.js")) {
  (async () => {
    console.log("Running two-phase VARK generator test...\n");

    const topic = "Newton's First Law";
    const percentages = { visual: 40, auditory: 20, readwrite: 20, kinesthetic: 20 };

    const out = await generateTwoPhaseVARK(topic, percentages);

    console.log("\n--- BASE LESSON ---\n");
    console.log(out.baseLesson || "(no base)");

    console.log("\n--- VARK FLOWING LESSON ---\n");
    console.log(out.varkLesson || "(no vark)");

    console.log("\n--- AUDITORY SCRIPT (for TTS) ---\n");
    console.log(out.auditoryScript || "(no script)");

    console.log("\n--- AUDIO FILE PATH ---\n");
    console.log(out.auditoryAudioPath || "(no audio)");

    process.exit(0);
  })();
}
