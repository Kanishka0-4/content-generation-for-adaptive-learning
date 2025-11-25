"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const CONTENT_SECONDS = 30;

export default function QuizTakePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quizId, setQuizId] = useState(null);
  const [items, setItems] = useState([]);
  const [pointer, setPointer] = useState(0);
  const [stageType, setStageType] = useState(null);
  const [timer, setTimer] = useState(CONTENT_SECONDS);

  const answerStartRef = useRef(null);

  /* ----------------------------------------------------
     INITIALIZE QUIZ
  ---------------------------------------------------- */
  useEffect(() => {
    async function init() {
      try {
        const subjectId = localStorage.getItem("selected_subject_id");

        const res = await fetch("/api/quiz/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject_id: subjectId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setQuizId(data.quiz_id);
        setItems(data.items);

        setPointer(0);
        setStageType(data.items[0].type);
        setTimer(CONTENT_SECONDS);
        answerStartRef.current = Date.now();

        setLoading(false);
      } catch (e) {
        alert("Failed to start quiz: " + e.message);
        router.push("/quiz/start");
      }
    }

    init();
  }, []);

  /* ----------------------------------------------------
     TIMER LOGIC
  ---------------------------------------------------- */
  useEffect(() => {
    if (loading) return;
    if (stageType === "mcq") return;

    if (timer <= 0) {
      nextItem();
      return;
    }

    const t = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, stageType, loading]);

  /* ----------------------------------------------------
     SAVE ANSWER
  ---------------------------------------------------- */
  async function saveAnswer(opt) {
    const item = items[pointer];
    const now = Date.now();

    await fetch("/api/quiz/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz_item_id: item.id,
        selected_option: opt,
        time_taken_ms: now - answerStartRef.current,
        quiz_id: quizId,
      }),
    });
  }

  /* ----------------------------------------------------
     NEXT ITEM
  ---------------------------------------------------- */
  function nextItem() {
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

  /* ----------------------------------------------------
     LOADING SCREEN — Bigger text + spinner
  ---------------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="text-center text-2xl text-blue-800 flex items-center gap-3 font-semibold">
          <span>Preparing your quiz…</span>

          {/* ROUND LOADER */}
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
        style={{
          width: "90%",
          border: "3px solid #3b82f6",
        }}
      >

        {/* TOP CENTER TIMER */}
        {stageType !== "mcq" && (
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2 text-blue-700 text-lg font-semibold">

              {/* clock icon */}
              <svg xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6 text-blue-700">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>

              {timer}s
            </div>
          </div>
        )}

        {/* QUIZ TITLE */}
        <h1 className="text-3xl font-bold text-blue-700 mb-6">Quiz</h1>

        <ItemView
          id={current.id}
          type={current.type}
          onAnswer={(opt) => {
            saveAnswer(opt);
            nextItem();
          }}
        />
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   ITEM VIEW — content gets light blue background
---------------------------------------------------- */
function ItemView({ id, type, onAnswer }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      const r = await fetch(`/api/quiz/item/${id}`);
      const d = await r.json();
      setData(d.item);
    }
    load();
  }, [id]);

  if (!data) return "Loading...";

  /* ------------ CONTENT (text/audio/visual) ------------ */
  if (type !== "mcq") {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-lg leading-relaxed text-gray-800 shadow-sm">
        {data.question_text}
      </div>
    );
  }

  /* ------------ MCQ ------------ */
  return (
    <div>
      <p className="font-semibold text-lg mb-4">{data.question_text}</p>

      <div className="space-y-3">
        {data.options.map((o) => (
          <button
            key={o}
            onClick={() => onAnswer(o)}
            className="w-full text-left p-4 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-300 transition"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
