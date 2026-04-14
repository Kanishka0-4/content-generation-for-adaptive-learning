"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WelcomeQuizPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/get-subjects");
        const data = await res.json();
        setSubjects(data.subjects || []);
      } catch (e) {
        setError("Failed to load subjects");
      }
    }
    load();
  }, []);

  async function handleContinue() {
    if (!selected) return alert("Please choose a subject");
    const subjectObj = subjects.find((s) => s.id === selected);
    if (!subjectObj) return alert("Invalid subject");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subtopics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: subjectObj.id, subject_name: subjectObj.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
     router.push(`/quiz/start?subject_id=${subjectObj.id}`);
      
    } catch (err) {
      console.error(err);
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;800&family=Instrument+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-20px) scale(1.04); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .wq-root {
          min-height: 100vh;
          background: #fffaf5;
          font-family: 'Instrument Sans', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          position: relative;
          overflow: hidden;
        }

        .wq-blob {
          position: absolute; border-radius: 50%;
          filter: blur(80px); pointer-events: none;
        }
        .wq-blob-1 { width: 500px; height: 500px; background: #fb923c22; top: -120px; right: -100px; animation: float 9s ease-in-out infinite; }
        .wq-blob-2 { width: 400px; height: 400px; background: #3b82f618; bottom: -100px; left: -80px; animation: float 7s ease-in-out infinite; animation-delay: -4s; }
        .wq-blob-3 { width: 250px; height: 250px; background: #fbbf2415; top: 50%; left: 60%; animation: float 11s ease-in-out infinite; animation-delay: -8s; }

        .wq-brand {
          position: absolute; top: 1.75rem; left: 2rem;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1rem; font-weight: 800;
          color: #1e293b; letter-spacing: -0.02em;
          display: flex; align-items: center; gap: 0.4rem;
          z-index: 1;
        }
        .wq-brand-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .wq-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 480px;
          background: #fff;
          border: 1px solid #f1e8dc;
          border-radius: 20px;
          padding: 2.75rem 2.5rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.03), 0 20px 60px rgba(249,115,22,0.08);
          animation: fadeUp 0.4s ease both;
        }

        .wq-badge {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: #fff7ed; border: 1px solid #fed7aa;
          border-radius: 999px; padding: 0.3rem 0.8rem;
          font-size: 0.68rem; font-weight: 700;
          color: #ea580c; letter-spacing: 0.07em;
          text-transform: uppercase; margin-bottom: 1.25rem;
        }
        .wq-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: #f97316; }

        .wq-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 2rem; font-weight: 800;
          color: #1e293b; letter-spacing: -0.03em;
          line-height: 1.2; margin-bottom: 0.6rem;
        }
        .wq-title span { color: #f97316; }

        .wq-sub {
          font-size: 0.88rem; color: #94a3b8;
          line-height: 1.6; margin-bottom: 2rem;
        }

        .wq-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #f1e8dc, transparent);
          margin-bottom: 1.75rem;
        }

        .wq-label {
          display: block;
          font-size: 0.72rem; font-weight: 600;
          color: #64748b; letter-spacing: 0.07em;
          text-transform: uppercase; margin-bottom: 0.5rem;
        }

        .wq-select-wrap { position: relative; margin-bottom: 1.25rem; }

        .wq-select {
          width: 100%; appearance: none;
          background: #fafafa;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.82rem 2.75rem 0.82rem 1rem;
          font-size: 0.9rem;
          font-family: 'Instrument Sans', sans-serif;
          color: #1e293b; cursor: pointer; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .wq-select:focus {
          border-color: #f97316; background: #fff;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }
        .wq-select-arrow {
          position: absolute; right: 1rem; top: 50%;
          transform: translateY(-50%); pointer-events: none; color: #94a3b8;
        }

        .wq-error {
          display: flex; align-items: center; gap: 0.5rem;
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 8px; padding: 0.6rem 0.85rem;
          font-size: 0.82rem; color: #dc2626; margin-bottom: 1rem;
        }

        .wq-btn {
          width: 100%; padding: 0.85rem;
          border: none; border-radius: 12px;
          background: linear-gradient(135deg, #f97316, #fb923c);
          color: #fff;
          font-family: 'Instrument Sans', sans-serif;
          font-size: 0.92rem; font-weight: 600;
          cursor: pointer; position: relative; overflow: hidden;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(249,115,22,0.35);
        }
        .wq-btn:hover:not(:disabled) {
          opacity: 0.93; transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(249,115,22,0.45);
        }
        .wq-btn:active:not(:disabled) { transform: translateY(0); }
        .wq-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .wq-btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
          transform: translateX(-100%); transition: transform 0.5s ease;
        }
        .wq-btn:hover::after { transform: translateX(100%); }

        .wq-note {
          display: flex; align-items: center; justify-content: center;
          gap: 0.4rem; margin-top: 1.25rem;
          font-size: 0.78rem; color: #cbd5e1;
        }
      `}</style>

      <div className="wq-root">
        <div className="wq-blob wq-blob-1" />
        <div className="wq-blob wq-blob-2" />
        <div className="wq-blob wq-blob-3" />

        <div className="wq-brand">
          <div className="wq-brand-dot" />
          Tri-Sara
        </div>

        <div className="wq-card">

          <div className="wq-badge">
            <div className="wq-badge-dot" />
            Step 1 of 2
          </div>

          <h1 className="wq-title">
            What are you<br />learning <span>today?</span>
          </h1>
          <p className="wq-sub">
            Pick a subject and we'll build a personalized quiz to understand how you learn best.
          </p>

          <div className="wq-divider" />

          {error && (
            <div className="wq-error">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6.5" stroke="#dc2626"/>
                <path d="M7 4v3.5M7 9.5v.5" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <label className="wq-label">Subject</label>
          <div className="wq-select-wrap">
            <select
              className="wq-select"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Choose a subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <svg className="wq-select-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <button className="wq-btn" onClick={handleContinue} disabled={loading}>
            {loading ? "Preparing your quiz…" : "Continue →"}
          </button>

          <div className="wq-note">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm0 4v3M6 4v.5" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Takes about 2 minutes to complete
          </div>

        </div>
      </div>
    </>
  );
}