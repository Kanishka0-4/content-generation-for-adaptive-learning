import fs from "fs";
import path from "path";
import say from "say";

// ------------------------------------------------------------
// 1. Build Unified Prompt (VARK Content Generator)
// ------------------------------------------------------------
function buildUnifiedPrompt(topic, percentages) {
  return `
You are an Adaptive Learning Content Generator.

Your task is to generate blended VARK-style learning content for the topic below.
You MUST follow the required structure and allocate section length based on percentages.

Learning Style Percentages:
- Visual: ${percentages.visual}%
- Auditory: ${percentages.auditory}%
- Read/Write: ${percentages.readwrite}%
- Kinesthetic: ${percentages.kinesthetic}%

Total output must be 300–400 words.

---

### REQUIRED OUTPUT FORMAT (MUST FOLLOW EXACTLY)

=== VISUAL SECTION ===
Include ALL of the following:
1. Labeled Diagram (ASCII, max 8 lines)
2. Flowchart (A → B → C)
3. Mind Map (text indentation)
4. Color-coded Table (ASCII)

=== AUDITORY SECTION ===
A SHORT auditory-style explanation.
- Conversational
- Easy to understand
- No lists, no visuals
- Sound like a teacher speaking

=== READ/WRITE SECTION ===
Include:
- One definition
- 2–3 short explanation paragraphs
- Bullet-point key points
- One real-life example

=== KINESTHETIC SECTION ===
Include:
- 2–3 hands-on tasks (categorize, match, arrange, simulate)
- One step-by-step mental or physical activity
- Must feel practical and engaging

---

### GLOBAL RULES
- Section length must follow percentages.
- Do NOT repeat content between sections.
- Do NOT introduce facts not essential to the topic.
- MUST follow the structure exactly.
- Clean formatting only.

---

Generate the VARK content for the topic:
"${topic}"
  `;
}


// ------------------------------------------------------------
// 2. Extract ONLY the auditory section (for TTS)
// ------------------------------------------------------------
function extractAuditorySection(text) {
  const start = text.indexOf("=== AUDITORY SECTION ===");
  const end = text.indexOf("=== READ/WRITE SECTION ===");

  if (start === -1 || end === -1) return "";

  return text.substring(start + "=== AUDITORY SECTION ===".length, end).trim();
}


// ------------------------------------------------------------
// 3. Convert auditory text → audio WAV file
// ------------------------------------------------------------
async function generateAudio(text) {
  return new Promise((resolve, reject) => {
    const audioDir = path.join(process.cwd(), "audio");

    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir);
    }

    const outputPath = path.join(audioDir, "auditory_output.wav");

    say.export(text, null, 1.0, outputPath, (err) => {
      if (err) return reject(err);
      resolve(outputPath);
    });
  });
}


// ------------------------------------------------------------
// 4. Main Unified VARK Generator
// ------------------------------------------------------------
export async function generateUnifiedVARK(topic, percentages) {
  try {
    const prompt = buildUnifiedPrompt(topic, percentages);

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral",
        prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }

    const data = await response.json();
    const fullText = data.response;

    // Extract auditory text
    const auditoryText = extractAuditorySection(fullText);

    // Generate audio only if auditory content exists
    let audioFilePath = null;
    if (auditoryText.length > 0) {
      audioFilePath = await generateAudio(auditoryText);
    }

    return {
      topic,
      varkContent: fullText,
      auditoryAudioPath: audioFilePath
    };

  } catch (err) {
    console.error("❌ Error generating Unified VARK content:", err.message);
    return {
      topic,
      varkContent: "",
      auditoryAudioPath: null,
      error: err.message
    };
  }
}


// ------------------------------------------------------------
// 5. Optional Standalone Test
// Run: node generateUnifiedVARK.js
// ------------------------------------------------------------
if (process.argv[1].includes("generateUnifiedVARK.js")) {
  async function test() {
    const samplePercent = {
      visual: 40,
      auditory: 20,
      readwrite: 20,
      kinesthetic: 20
    };

    const result = await generateUnifiedVARK("Dynamic Programming", samplePercent);

    console.log("\n=== UNIFIED VARK OUTPUT ===\n");
    console.log(result.varkContent);

    console.log("\n🎧 Audio saved at:", result.auditoryAudioPath);
  }

  test();
}
