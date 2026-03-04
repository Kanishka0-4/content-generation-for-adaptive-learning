// twoPhaseVARK_llama.js
// Single-file two-phase VARK pipeline using local Ollama (llama3.1) + say TTS
// Run: node twoPhaseVARK_llama.js

import fs from "fs";
import path from "path";
import say from "say";

const OLLAMA_API = "http://localhost:11434/api/generate";
const MODEL = "llama3.1"; // change if your Ollama model id is different

/* -------------------------
   Short Phase 1 prompt: Base lesson
   ------------------------- */
function buildBasePrompt(topic) {
  return `Write a clear study lesson for the topic below.
Include:
- 1–2 sentence introduction
- 2–3 short explanation paragraphs
- one practical real-life example
- a 2–3 line summary

Rules: Do NOT include diagrams, lists of tasks, or audio text. Keep it coherent and ~200-300 words.

Topic: "${topic}"`.trim();
}

/* -------------------------
   Short Phase 2 prompt: VARK transform
   (rewrite base lesson adding VARK elements proportionally)
   ------------------------- */
function buildVarkPrompt(baseLesson, percentages, topic) {
  return `Rewrite the lesson below into a single, coherent learning lesson for the same topic.
Keep the original flow (intro → explanation → example → summary) and do NOT create labeled VARK sections.
Include ALL FOUR styles but vary the AMOUNT (not presence) using these weights:
Visual ${percentages.visual}%, Auditory ${percentages.auditory}%, Read/Write ${percentages.readwrite}%, Kinesthetic ${percentages.kinesthetic}%.
Guidelines:
- Visual: add small inline ASCII diagrams or short arrow flows where useful (≤8 lines each).
- Auditory: add a few short teacher-style, conversational lines.
- Read/Write: add brief note-like lines or a small bullet list where helpful.
- Kinesthetic: add 1–2 short hands-on or mental tasks after the explanation.
Keep the lesson ~300–450 words, coherent, no repeats, no new facts.

At the end append exactly:
=== AUDITORY SCRIPT ===
<one short spoken script (≤ 50 words)>

Base lesson:
"""${baseLesson.replace(/"""/g, '\\"""')}"""
Topic: "${topic}"`.trim();
}

/* -------------------------
   Helper: call Ollama generate endpoint
   ------------------------- */
async function callOllama(prompt, model = MODEL) {
  const res = await fetch(OLLAMA_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json();
  return data.response || "";
}

/* -------------------------
   Extract the auditory script marker and clean lesson
   ------------------------- */
function extractAuditoryScript(varkText) {
  const marker = "=== AUDITORY SCRIPT ===";
  const idx = varkText.indexOf(marker);
  if (idx === -1) return { varkLesson: varkText.trim(), auditoryScript: "" };

  const lesson = varkText.substring(0, idx).trim();
  const after = varkText.substring(idx + marker.length).trim();
  // script = first paragraph or until double newline
  const double = after.indexOf("\n\n");
  const script = double === -1 ? after.trim() : after.substring(0, double).trim();
  return { varkLesson: lesson, auditoryScript: script };
}

/* -------------------------
   Generate WAV audio using say
   ------------------------- */
async function textToWav(text, filename = "vark_auditory.wav") {
  return new Promise((resolve, reject) => {
    const audioDir = path.join(process.cwd(), "audio");
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
    const out = path.join(audioDir, filename);

    say.export(text, null, 1.0, out, (err) => {
      if (err) return reject(err);
      resolve(out);
    });
  });
}

/* -------------------------
   Orchestrator: run both phases and TTS
   ------------------------- */
async function runTwoPhase(topic, percentages) {
  try {
    console.log("➡ Phase 1: generating base lesson...");
    const basePrompt = buildBasePrompt(topic);
    const baseLesson = await callOllama(basePrompt);
    if (!baseLesson) throw new Error("Empty base lesson");

    console.log("➡ Phase 2: generating VARK-enhanced lesson...");
    const varkPrompt = buildVarkPrompt(baseLesson, percentages, topic);
    const varkText = await callOllama(varkPrompt);
    if (!varkText) throw new Error("Empty VARK lesson");

    const { varkLesson, auditoryScript } = extractAuditoryScript(varkText);

    let audioPath = null;
    if (auditoryScript && auditoryScript.length > 8) {
      console.log("➡ Generating audio from auditory script...");
      audioPath = await textToWav(auditoryScript, `auditory_${Date.now()}.wav`);
    } else {
      console.log("ℹ No auditory script found or it's too short; skipping TTS.");
    }

    return { topic, baseLesson, varkLesson, auditoryScript, audioPath };
  } catch (err) {
    console.error("ERROR in runTwoPhase:", err.message);
    return { topic, error: err.message };
  }
}

/* -------------------------
   Quick test runner (edit topic/percentages here)
   ------------------------- */
(async () => {
  const topic = "Newton's First Law";
  const percentages = { visual: 40, auditory: 20, readwrite: 20, kinesthetic: 20 };

  console.log("\nRunning two-phase VARK pipeline using", MODEL, "\n");
  const out = await runTwoPhase(topic, percentages);

  console.log("\n--- BASE LESSON ---\n");
  console.log(out.baseLesson || "(none)");

  console.log("\n--- VARK FLOWING LESSON ---\n");
  console.log(out.varkLesson || "(none)");

  console.log("\n--- AUDITORY SCRIPT ---\n");
  console.log(out.auditoryScript || "(none)");

  console.log("\n--- AUDIO FILE ---\n");
  console.log(out.audioPath || "(none)");
})();
