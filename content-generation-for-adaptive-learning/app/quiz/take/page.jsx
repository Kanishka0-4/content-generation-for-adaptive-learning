"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const CONTENT_SECONDS = 10;

/* ===== Browser TTS ===== */
function speak(text, onEnd) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.onend = () => onEnd && onEnd();
  window.speechSynthesis.speak(u);
}

export default function QuizTakePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quizId, setQuizId] = useState(null);
  const [items, setItems] = useState([]);
  const [pointer, setPointer] = useState(0);
  const [stageType, setStageType] = useState(null);
  const [timer, setTimer] = useState(CONTENT_SECONDS);
  const [contentReady, setContentReady] = useState(false);

  const answerStartRef = useRef(null);

  // ✅ FIX #1: prevents double quiz generation in React Strict Mode
  const initializedRef = useRef(false);

  /* ===== INIT QUIZ ===== */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      const subjectId = localStorage.getItem("selected_subject_id");

      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject_id: subjectId }),
      });

      const data = await res.json();

      const firstContentIndex = data.items.findIndex(
        (i) => i.type !== "mcq"
      );

      localStorage.setItem("current_quiz_id", data.quiz_id);

      setQuizId(data.quiz_id);
      setItems(data.items);
      setPointer(firstContentIndex);
      setStageType(data.items[firstContentIndex].type);
      setTimer(CONTENT_SECONDS);
      answerStartRef.current = Date.now();

      setContentReady(true);
      setLoading(false);
    }

    init();
  }, []);

  /* ===== CONTENT TIMER (TEXT / VISUAL ONLY) ===== */
  useEffect(() => {
    if (!contentReady) return;
    if (stageType === "mcq" || stageType === "audio") return;

    if (timer <= 0) {
      nextItem();
      return;
    }

    const t = setTimeout(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(t);
  }, [timer, stageType, contentReady]);

  /* ===== SAVE ANSWER ===== */
  async function saveAnswer(selectedIndex) {
    const item = items[pointer];
    if (!item || !item.id) return false;

    const payload = {
      quiz_item_id: item.id,
      selected_option: selectedIndex,
      time_taken_ms: Date.now() - answerStartRef.current,
    };

    const res = await fetch("/api/quiz/answer", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Answer save failed");
      return false;
    }

    return true;
  }

  /* ===== NEXT ITEM ===== */
  function nextItem() {
    window.speechSynthesis.cancel();

    const next = pointer + 1;

    if (next >= items.length) {
      router.push("/quiz/results");
      return;
    }

    setPointer(next);
    setStageType(items[next].type);
    setTimer(CONTENT_SECONDS);
    answerStartRef.current = Date.now();
  }

  /* ===== LOADING ===== */
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="text-center text-2xl text-blue-800 flex items-center gap-3 font-semibold">
          <span>Preparing your quiz…</span>
          <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const current = items[pointer];

  return (
    <div className="min-h-screen w-full flex justify-center bg-gradient-to-b from-white to-blue-50 py-10 px-4">
      <div
        className="w-full max-w-5xl bg-white shadow-lg rounded-lg p-8"
        style={{ width: "90%", border: "3px solid #3b82f6" }}
      >
        {stageType !== "mcq" && stageType !== "audio" && (
          <div className="flex justify-center mb-2">
            <div className="text-blue-700 text-lg font-semibold">
              {timer}s
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold text-blue-700 mb-6">Quiz</h1>

        <ItemView
          item={current}
          onNext={nextItem}
          onSaveAnswer={saveAnswer}
        />
      </div>
    </div>
  );
}

/* ===== ITEM VIEW ===== */
function ItemView({ item, onNext, onSaveAnswer }) {
  useEffect(() => {
    if (item.type === "audio") {
      speak(item.question_text, () => onNext());
    }
    return () => window.speechSynthesis.cancel();
  }, [item]);

  /* ===== NON-MCQ ===== */
  if (item.type !== "mcq") {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-lg text-gray-800 shadow-sm">

          {item.type === "audio" && (
            <p className="text-gray-600 italic text-sm text-center">
              🎧 Listen to the audio carefully
            </p>
          )}

          {item.type === "visual" &&
            (() => {
              try {
                const parsed = JSON.parse(item.question_text);
                return (
                  <div className="max-w-xl mx-auto">
                    <div className="flex flex-col items-center gap-6">
                      {parsed.steps.map((s, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                            {i + 1}
                          </div>
                          <div className="mt-2 text-center text-sm font-medium text-gray-800 max-w-xs">
                            {s}
                          </div>
                          {i < parsed.steps.length - 1 && (
                            <div className="w-1 h-10 bg-blue-300 my-2"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              } catch {
                return <p>Invalid visual content</p>;
              }
            })()}

          {item.type !== "audio" && item.type !== "visual" && (
            <p>{item.question_text}</p>
          )}

        </div>
      </div>
    );
  }

  /* ===== MCQ ===== */
  return (
    <div>
      <p className="font-semibold text-lg mb-4">{item.question_text}</p>
      <div className="space-y-3">
        {item.options.map((o, idx) => (
          <button
            key={o}
            onClick={async () => {
              const ok = await onSaveAnswer(idx);
              if (ok) onNext();
            }}
            className="w-full text-left p-4 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-300 transition"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
} 