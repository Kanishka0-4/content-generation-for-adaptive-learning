import { generateAuditory } from "./generateAuditory.js";
import { generateAudioFromText } from "./audioGenerator.js";

async function test() {
  const baseContent = `
Newton's First Law states that an object remains at rest or in constant motion unless acted upon by an external force.
`;

  console.log("➡ Step 1: Generating Auditory VARK content...\n");

  // 1️⃣ Generate auditory text
  const auditoryText = await generateAuditory(baseContent);

  console.log("=== GENERATED AUDITORY TEXT ===\n");

  if (!auditoryText || auditoryText.trim().length === 0) {
    console.log("❌ No auditory text was returned. Stopping here.\n");
    return;
  }

  console.log(auditoryText);

  console.log("\n➡ Step 2: Converting auditory text to audio...\n");

  try {
    // 2️⃣ Generate audio file from text
    const audioFile = await generateAudioFromText(auditoryText);

    console.log("✅ Audio successfully generated!");
    console.log("📄 File:", audioFile);
    console.log("📍 Full path:", process.cwd() + "/" + audioFile);
    console.log("\n🎧 Open the WAV file manually to listen.\n");

  } catch (err) {
    console.error("❌ Audio generation failed:", err);
  }
}

test();
