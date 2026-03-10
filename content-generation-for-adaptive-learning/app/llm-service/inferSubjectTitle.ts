import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

/**
 * Infers a canonical subject title from roadmap modules
 */
export async function inferSubjectTitleFromRoadmap(roadmap: any[]) {
  try {
    const moduleTitles = roadmap
      .slice(0, 3)
      .map((m: any, i: number) => `${i + 1}. ${m.week || m.title}`)
      .join("\n");

    const prompt = `
Given the following study modules:

${moduleTitles}

Return a SHORT canonical subject name (2–4 words max).

Rules:
- No extra text
- No punctuation
- No exam names
`;

    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 10,
    });

    const text = completion.choices[0]?.message?.content?.trim();

    return text || "General Subject";
  } catch (err) {
    console.error("Subject title inference failed:", err);
    return "General Subject";
  }
}