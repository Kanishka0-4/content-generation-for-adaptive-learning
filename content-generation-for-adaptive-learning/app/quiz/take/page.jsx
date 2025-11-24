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
        setStageType(data.items[0]?.type || null);
        setLoading(false);
      } catch (e) {
        alert("Failed to start quiz: " + e.message);
        router.push("/quiz/start");
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (loading || stageType === "mcq") return;

    if (timer <= 0) {
      nextItem();
      return;
    }

    const t = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, stageType, loading]);

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
      })
    });
  }

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

  if (loading) return <div>Preparing quiz...</div>;

  const current = items[pointer];

  return (
    <div className="p-6">
      <h2>Quiz ID: {quizId}</h2>

      {stageType !== "mcq" && <p>{timer}s left</p>}

      <ItemView id={current.id} type={current.type} onAnswer={opt => { saveAnswer(opt); nextItem(); }} />
    </div>
  );
}

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

  if (type === "mcq") {
    return (
      <div>
        <p className="font-semibold mb-3">{data.question_text}</p>
        {data.options.map(o => (
          <button key={o} onClick={() => onAnswer(o)} className="block p-2 border mb-2 rounded">
            {o}
          </button>
        ))}
      </div>
    );
  }

  return <p>{data.question_text}</p>;
}
