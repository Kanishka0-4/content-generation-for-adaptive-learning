import say from "say";
import path from "path";
import fs from "fs";

export function generateAudioFromText(text) {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(process.cwd(), "audio");
    const outputPath = path.join(outputDir, "audio_output.wav");

    // Ensure "audio" folder exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    say.export(text, null, 1.0, outputPath, (err) => {
      if (err) return reject(err);
      resolve("audio/audio_output.wav");
    });
  });
}
