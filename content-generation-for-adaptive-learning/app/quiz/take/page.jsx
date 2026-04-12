"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const CONTENT_SECONDS = 15;

function speak(text, onEnd) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.onend = () => onEnd && onEnd();
  window.speechSynthesis.speak(u);
}

function AudioItem({ item, onNext }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
    speak(item.question_text, () => {
      setIsPlaying(false);
      setHasFinished(true);
      onNext();
    });
  };

  return (
    <>
      <span className="qt-badge qt-badge-green">
        <span className="qt-badge-dot" style={{ background: "#16a34a" }} />
        Audio
      </span>
      <div className="qt-audio-box">
        <div className="qt-audio-icon">🎧</div>
        <p style={{ fontSize: "0.9rem", color: "#15803d", fontWeight: 500 }}>
          {isPlaying ? "Listen carefully…" : "Press play when you're ready"}
        </p>
        {isPlaying ? (
          <div
            style={{
              display: "flex",
              gap: "4px",
              alignItems: "center",
              height: 28,
            }}
          >
            {[1, 2, 3, 4, 5].map((b) => (
              <div
                key={b}
                className="qt-wave-bar"
                style={{
                  height: `${8 + b * 4}px`,
                  animationDelay: `${b * 0.12}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <button
            onClick={handlePlay}
            disabled={hasFinished}
            style={{
              marginTop: "0.5rem",
              padding: "0.6rem 1.6rem",
              borderRadius: "999px",
              border: "none",
              background: hasFinished
                ? "#d1fae5"
                : "linear-gradient(135deg, #10b981, #34d399)",
              color: hasFinished ? "#065f46" : "#fff",
              fontFamily: "'Instrument Sans', sans-serif",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: hasFinished ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: hasFinished
                ? "none"
                : "0 4px 12px rgba(16,185,129,0.3)",
              transition: "all 0.15s ease",
            }}
          >
            {hasFinished ? "✓ Done" : "▶ Play"}
          </button>
        )}
      </div>
    </>
  );
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
  const initializedRef = useRef(false);

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

      if (!data || !Array.isArray(data.items)) {
        console.error("Quiz API returned invalid response:", data);
        alert("Quiz generation failed. Check server logs.");
        router.push("/dashboard");
        return;
      }

      const firstContentIndex = data.items.findIndex((i) => i.type !== "mcq");
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

  useEffect(() => {
    if (!contentReady) return;
    if (stageType === "mcq" || stageType === "audio") return;
    if (timer <= 0) {
      nextItem();
      return;
    }
    const t = setTimeout(() => setTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, stageType, contentReady]);

  async function saveAnswer(selectedIndex) {
    const item = items[pointer];
    if (!item || !item.id) return false;
    const res = await fetch("/api/quiz/answer", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz_item_id: item.id,
        selected_option: selectedIndex,
        time_taken_ms: Date.now() - answerStartRef.current,
      }),
    });
    if (!res.ok) {
      console.error("Answer save failed");
      return false;
    }
    return true;
  }

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

  /* ── Loading ── */
  if (loading) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;800&family=Instrument+Sans:wght@300;400;500&display=swap');
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#fffaf5",
            fontFamily: "'Instrument Sans', sans-serif",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "3px solid #fed7aa",
              borderTop: "3px solid #f97316",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ fontSize: "1rem", color: "#92400e", fontWeight: 500 }}>
            Preparing your quiz…
          </p>
        </div>
      </>
    );
  }

  const current = items[pointer];
  const progress = ((pointer + 1) / items.length) * 100;
  const isContent = stageType !== "mcq" && stageType !== "audio";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;800&family=Instrument+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50%       { transform: scaleY(1.4); }
        }

        .qt-root {
          min-height: 100vh;
          background: #fffaf5;
          font-family: 'Instrument Sans', sans-serif;
          display: flex; flex-direction: column;
          align-items: center; padding: 0 1.5rem 3rem;
          position: relative; overflow: hidden;
        }

        .qt-blob {
          position: fixed; border-radius: 50%;
          filter: blur(80px); pointer-events: none; z-index: 0;
        }
        .qt-blob-1 { width: 400px; height: 400px; background: #fb923c18; top: -80px; right: -60px; }
        .qt-blob-2 { width: 350px; height: 350px; background: #3b82f612; bottom: -60px; left: -60px; }

        .qt-topbar {
          position: relative; z-index: 1;
          width: 100%; max-width: 680px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.5rem 0 1.25rem;
        }
        .qt-brand {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1rem; font-weight: 800;
          color: #1e293b; letter-spacing: -0.02em;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .qt-brand-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #fb923c);
        }
        .qt-counter {
          font-size: 0.78rem; font-weight: 600;
          color: #94a3b8; letter-spacing: 0.04em;
        }

        .qt-progress-wrap {
          position: relative; z-index: 1;
          width: 100%; max-width: 680px;
          height: 4px; background: #f1e8dc;
          border-radius: 99px; margin-bottom: 2rem; overflow: hidden;
        }
        .qt-progress-fill {
          height: 100%; border-radius: 99px;
          background: linear-gradient(90deg, #f97316, #fb923c);
          transition: width 0.4s ease;
        }

        .qt-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 680px;
          background: #fff;
          border: 1px solid #f1e8dc;
          border-radius: 20px;
          padding: 2.5rem 2.25rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.03), 0 20px 60px rgba(249,115,22,0.07);
          animation: fadeUp 0.3s ease both;
        }

        .qt-badge {
          display: inline-flex; align-items: center; gap: 0.35rem;
          padding: 0.28rem 0.75rem; border-radius: 999px;
          font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.07em; text-transform: uppercase;
          margin-bottom: 1.25rem;
        }
        .qt-badge-dot { width: 5px; height: 5px; border-radius: 50%; }
        .qt-badge-orange { background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
        .qt-badge-blue   { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
        .qt-badge-green  { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

        .qt-timer {
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1.5rem;
        }
        .qt-timer-inner {
          width: 52px; height: 52px; border-radius: 50%;
          border: 3px solid #fed7aa;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.1rem; font-weight: 800; color: #f97316;
          background: #fff7ed;
        }

        .qt-content-text {
          font-size: 1rem; color: #334155; line-height: 1.7;
        }

        .qt-audio-box {
          display: flex; flex-direction: column;
          align-items: center; gap: 1rem; padding: 2rem;
          background: #f0fdf4; border: 1px solid #bbf7d0;
          border-radius: 14px; text-align: center;
        }
        .qt-audio-icon {
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg,#10b981,#34d399);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem;
          box-shadow: 0 4px 16px rgba(16,185,129,0.3);
        }
        .qt-wave-bar {
          width: 4px; border-radius: 99px;
          background: #10b981; opacity: 0.7;
          animation: wave 0.8s ease-in-out infinite alternate;
        }

        .qt-visual-steps {
          display: flex; flex-direction: column; align-items: center;
        }
        .qt-step-node { display: flex; flex-direction: column; align-items: center; }
        .qt-step-circle {
          width: 44px; height: 44px; border-radius: 50%;
          background: linear-gradient(135deg,#f97316,#fb923c);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 0.9rem; font-weight: 800;
          box-shadow: 0 3px 10px rgba(249,115,22,0.3);
        }
        .qt-step-label {
          margin-top: 0.5rem; font-size: 0.88rem; font-weight: 500;
          color: #334155; text-align: center; max-width: 220px; line-height: 1.4;
        }
        .qt-step-line {
          width: 2px; height: 32px;
          background: linear-gradient(#fed7aa,#fde68a); margin: 4px 0;
        }

        .qt-question {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.2rem; font-weight: 700;
          color: #1e293b; line-height: 1.4;
          margin-bottom: 1.5rem; letter-spacing: -0.01em;
        }

        .qt-option {
          width: 100%; text-align: left;
          padding: 0.9rem 1.1rem; border-radius: 12px;
          border: 1.5px solid #e2e8f0; background: #fafafa;
          font-family: 'Instrument Sans', sans-serif;
          font-size: 0.9rem; color: #334155;
          cursor: pointer; margin-bottom: 0.6rem;
          transition: all 0.15s ease;
          display: flex; align-items: center; gap: 0.75rem;
        }
        .qt-option:hover {
          border-color: #f97316; background: #fff7ed;
          color: #c2410c; transform: translateX(3px);
        }
        .qt-option:last-child { margin-bottom: 0; }
        .qt-option-letter {
          width: 24px; height: 24px; border-radius: 50%;
          background: #f1f5f9; border: 1.5px solid #e2e8f0;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 700; color: #64748b;
          flex-shrink: 0; transition: all 0.15s ease;
        }
        .qt-option:hover .qt-option-letter {
          background: #f97316; border-color: #f97316; color: #fff;
        }

        .qt-skip {
          margin-top: 1.5rem; width: 100%; padding: 0.75rem;
          border: 1.5px solid #e2e8f0; border-radius: 10px;
          background: transparent;
          font-family: 'Instrument Sans', sans-serif;
          font-size: 0.85rem; color: #94a3b8; cursor: pointer;
          transition: all 0.15s ease;
        }
        .qt-skip:hover { border-color: #f97316; color: #f97316; background: #fff7ed; }
      `}</style>

      <div className="qt-root">
        <div className="qt-blob qt-blob-1" />
        <div className="qt-blob qt-blob-2" />

        {/* Top bar */}
        <div className="qt-topbar">
          <div className="qt-brand">
            <div className="qt-brand-dot" />
            Quiz
          </div>
          <div className="qt-counter">
            {pointer + 1} / {items.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="qt-progress-wrap">
          <div className="qt-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Card */}
        <div className="qt-card" key={pointer}>
          <ItemView
            item={current}
            stageType={stageType}
            timer={timer}
            isContent={isContent}
            onNext={nextItem}
            onSaveAnswer={saveAnswer}
          />
        </div>
      </div>
    </>
  );
}

/* ── Item View ── */
function ItemView({ item, stageType, timer, isContent, onNext, onSaveAnswer }) {
  /* useEffect(() => {
    if (item.type === "audio") speak(item.question_text, () => onNext());
    return () => window.speechSynthesis.cancel();
  }, [item]);*/

  const LETTERS = ["A", "B", "C", "D"];

  /* AUDIO */
  if (item.type === "audio") {
    return <AudioItem item={item} onNext={onNext} />;
  }

  /* VISUAL */
  if (item.type === "visual") {
    let parsed = null;
    try {
      parsed = JSON.parse(item.question_text);
    } catch {}
    return (
      <>
        <span className="qt-badge qt-badge-blue">
          <span className="qt-badge-dot" style={{ background: "#2563eb" }} />
          Visual
        </span>

        {(parsed?.subject || parsed?.topic) && (
          <div style={{ marginBottom: "1.5rem" }}>
            {parsed.subject && (
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  marginBottom: "0.25rem",
                }}
              >
                {parsed.subject}
              </p>
            )}
            {parsed.topic && (
              <p
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  letterSpacing: "-0.01em",
                }}
              >
                {parsed.topic}
              </p>
            )}
          </div>
        )}

        {isContent && (
          <div className="qt-timer">
            <div className="qt-timer-inner">{timer}</div>
          </div>
        )}
        {parsed?.steps ? (
          <div className="qt-visual-steps">
            {parsed.steps.map((s, i) => {
              const colors = [
                "#6366f1",
                "#0891b2",
                "#059669",
                "#d97706",
                "#8b5cf6",
                "#e11d48",
              ];
              const bgs = [
                "#eef2ff",
                "#ecfeff",
                "#f0fdf4",
                "#fffbeb",
                "#faf5ff",
                "#fff1f2",
              ];
              const color = colors[i % colors.length];
              const bg = bgs[i % bgs.length];
              const last = i === parsed.steps.length - 1;
              return (
                <div key={i} className="qt-step-node">
                  <div className="qt-step-spine">
                    <div
                      className="qt-step-circle"
                      style={{
                        background: color,
                        boxShadow: `0 2px 8px ${color}40`,
                      }}
                    >
                      {i + 1}
                    </div>
                    {!last && (
                      <div
                        className="qt-step-line"
                        style={{
                          background: `linear-gradient(${color}60, ${colors[(i + 1) % colors.length]}40)`,
                        }}
                      />
                    )}
                  </div>
                  <div
                    className="qt-step-card"
                    style={{
                      background: bg,
                      borderColor: color,
                      color: "#1e293b",
                    }}
                  >
                    {s}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="qt-content-text">{item.question_text}</p>
        )}
      </>
    );
  }

  /* TEXT content (non-MCQ) */
  if (item.type !== "mcq") {
    return (
      <>
        <span className="qt-badge qt-badge-orange">
          <span className="qt-badge-dot" style={{ background: "#ea580c" }} />
          Read
        </span>
        {isContent && (
          <div className="qt-timer">
            <div className="qt-timer-inner">{timer}</div>
          </div>
        )}
        <p className="qt-content-text">{item.question_text}</p>
      </>
    );
  }

  /* MCQ */
  return (
    <>
      <span className="qt-badge qt-badge-orange">
        <span className="qt-badge-dot" style={{ background: "#ea580c" }} />
        Question
      </span>
      <p className="qt-question">{item.question_text}</p>
      <div>
        {item.options.map((o, idx) => (
          <button
            key={o}
            className="qt-option"
            onClick={async () => {
              const ok = await onSaveAnswer(idx);
              if (ok) onNext();
            }}
          >
            <span className="qt-option-letter">{LETTERS[idx]}</span>
            {o}
          </button>
        ))}
      </div>
    </>
  );
}
