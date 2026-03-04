import say from "say";
import path from "path";
import fs from "fs";

// ------------------------------------------
// 1️⃣ AUDITORY TEXT GENERATOR
// ------------------------------------------
async function generateAuditoryText(baseContent) {
  const prompt = `
You are an educational content generator that produces AUDITORY-style learning material.

Convert the following content into a SHORT auditory VARK explanation.
Keep it conversational and under 120 words.

CONTENT:
${baseContent}
`;

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral",
      prompt,
      stream: false
    })
  });

  const data = await response.json();
  return data.response;
}

// ------------------------------------------
// 2️⃣ AUDIO GENERATOR
// ------------------------------------------
async function generateAudioFromText(text) {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(process.cwd(), "audio");
    const outputPath = path.join(outputDir, "auditory_output.wav");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    say.export(text, null, 1.0, outputPath, (err) => {
      if (err) return reject(err);
      resolve(outputPath);
    });
  });
}

// ------------------------------------------
// 3️⃣ EXPORTABLE FUNCTION for Unified VARK
// ------------------------------------------
export async function generateAuditory(baseContent) {
  try {
    const text = await generateAuditoryText(baseContent);
    const audio = await generateAudioFromText(text);

    return { text, audio };

  } catch (err) {
    console.error("❌ Auditory generation failed:", err);
    return { text: "", audio: null };
  }
}
