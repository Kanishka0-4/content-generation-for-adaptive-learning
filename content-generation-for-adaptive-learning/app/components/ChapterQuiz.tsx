"use client";
import { useState } from "react";

interface Question {
  question: string;
  options: string[];
  correct: string;
}

interface ChapterQuizProps {
  quiz: Question[];
  onComplete: (score: number, total: number) => void;
}

export default function ChapterQuiz({ quiz, onComplete }: ChapterQuizProps) {
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const allAnswered = Object.keys(answers).length === quiz.length;

  const submitQuiz = () => {
    let correct = 0;
    quiz.forEach((q, i) => {
      const ci = ["A","B","C","D"].indexOf(q.correct);
      const ct = ci >= 0 ? q.options[ci] : q.correct;
      if (answers[i] === ct) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    onComplete(correct, quiz.length);
  };

  if (!quiz.length) return null;

  return (
    <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">

      <div className="flex items-center gap-2 mb-6">
        <span className="text-amber-500 text-lg">📝</span>
        <h2 className="text-lg font-bold text-amber-900" style={{ fontFamily: "'Lora', serif" }}>
          Chapter Quiz
        </h2>
      </div>

      {quiz.map((q, i) => (
        <div key={i} className="mb-6 last:mb-0">
          <p className="text-sm font-semibold text-slate-800 mb-3">
            {i + 1}. {q.question}
          </p>

          <div className="space-y-2">
            {q.options.map((opt, j) => {
              const isSelected = answers[i] === opt;
              const correctIndex = ["A","B","C","D"].indexOf(q.correct);
              const correctText = correctIndex >= 0 ? q.options[correctIndex] : q.correct;
              const isCorrect = opt === correctText;
              let optionStyle = "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50";

              if (submitted) {
                if (isCorrect) optionStyle = "border-green-400 bg-green-50 text-green-800 font-medium";
                else if (isSelected && !isCorrect) optionStyle = "border-red-300 bg-red-50 text-red-700";
                else optionStyle = "border-slate-200 bg-white text-slate-400";
              } else if (isSelected) {
                optionStyle = "border-amber-400 bg-amber-50 text-amber-900 font-medium";
              }

              return (
                <label
                  key={j}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${optionStyle} ${submitted ? "cursor-default" : ""}`}
                >
                  <input
                    type="radio"
                    name={`q${i}`}
                    value={opt}
                    disabled={submitted}
                    checked={isSelected}
                    onChange={() => setAnswers({ ...answers, [i]: opt })}
                    className="accent-amber-500"
                  />
                  {opt}
                  {submitted && isCorrect && <span className="ml-auto text-green-500 text-xs font-bold">✓ Correct</span>}
                  {submitted && isSelected && !isCorrect && <span className="ml-auto text-red-400 text-xs font-bold">✗ Wrong</span>}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <button
          onClick={submitQuiz}
          disabled={!allAnswered}
          className={`mt-6 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
            allAnswered
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {allAnswered ? "Submit Quiz" : `Answer all ${quiz.length} questions to submit`}
        </button>
      ) : (
        <div className="mt-6 flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-amber-200">
          <span className="text-sm text-slate-600">Your score</span>
          <span className="text-lg font-bold text-amber-600">{score} / {quiz.length}</span>
        </div>
      )}
    </div>
  );
}
