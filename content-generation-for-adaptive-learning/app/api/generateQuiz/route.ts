import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL_NAME = "llama-3.3-70b-versatile";

async function askGroq(prompt: string) {
	const chatCompletion = await groq.chat.completions.create({
		messages: [{ role: "user", content: prompt }],
		model: MODEL_NAME,
		response_format: { type: "json_object" },
		temperature: 0.1,
	});
	return JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
}

export async function POST(request: Request) {
	try {
		const { chapterTitle, chapterContent } = await request.json();
		const prompt = `
CHAPTER TITLE: "${chapterTitle}"
CHAPTER CONTENT: "${chapterContent}"

Generate EXACTLY 3 MCQs for this chapter.
Each MCQ must have 4 options and indicate the correct answer.
Return your response as a JSON object in the following format:
{
	"quiz": [
		{ "question": "...", "options": ["A", "B", "C", "D"], "correct": "A" }
	]
}
ONLY return valid JSON.
`;
		const result = await askGroq(prompt);
		return NextResponse.json({ quiz: result.quiz });
	} catch (err) {
		console.error("Quiz generation error:", err);
		let errorMessage = "Quiz generation failed";
		let errorDetails = {};
		if (err instanceof Error) {
			errorMessage = err.message;
			errorDetails = { stack: err.stack };
		} else {
			errorDetails = err as object;
		}
		return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 });
	}
}