"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function QuizResultsPage() {
  const [data, setData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchResults() {
      const quizId = localStorage.getItem("current_quiz_id");
      const res = await fetch("/api/quiz/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quizId }),
      });
      const d = await res.json();
      setData(d);
    }
    fetchResults();
  }, []);

  if (!data) {
    return <div className="p-10 text-center">Loading results…</div>;
  }

  const styleMap = {
    text: "Text-based Learner",
    audio: "Auditory Learner",
    visual: "Visual Learner",
  };

  const best = data.best_learning_style;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md max-w-2xl w-full p-10">

        {/* ===== HEADER ===== */}
        <div className="text-center mb-10">
          <p className="text-[17px] text-gray-500 mb-2">
            Quiz Results
          </p>

          <h1 className="text-4xl font-semibold text-blue-700 mb-3">
            {styleMap[best]}
          </h1>

          <p className="text-sm text-gray-600">
            This is the learning mode where you performed the strongest overall.
          </p>
        </div>

        {/* ===== BREAKDOWN ===== */}
        <div className="grid grid-cols-1 gap-4">
          {["text", "audio", "visual"].map((type) => (
            <div
              key={type}
              className={`p-5 rounded-lg border ${
                type === best
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-800">
                  {styleMap[type]}
                </p>

                <p className="text-sm text-gray-600">
                  Score:{" "}
                  {data.scores[type] !== undefined
                    ? data.scores[type].toFixed(3)
                    : "N/A"}
                </p>
              </div>

              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  Accuracy: {data.stats[type].correct}/{data.stats[type].total}
                </p>

                <p>
                  Avg Time:{" "}
                  {(
                    data.stats[type].time /
                    Math.max(1, data.stats[type].total) /
                    1000
                  ).toFixed(2)}
                  s
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ===== CTA ===== */}
        <div className="mt-10 text-center">
          <p className="text-sm text-slate-600 mb-4">
            You can now continue learning with courses aligned to your learning
            style.
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
