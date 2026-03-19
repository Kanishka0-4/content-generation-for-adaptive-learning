"use client";

import { useRouter } from "next/navigation";

export default function QuizStart() {
  const router = useRouter();
  const subjectId = typeof window !== "undefined"
    ? localStorage.getItem("selected_subject_id")
    : null;

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
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .qs-root {
          min-height: 100vh;
          background: #fffaf5;
          font-family: 'Instrument Sans', sans-serif;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 2rem 1.5rem;
          position: relative; overflow: hidden;
        }

        .qs-blob {
          position: absolute; border-radius: 50%;
          filter: blur(80px); pointer-events: none;
        }
        .qs-blob-1 { width: 500px; height: 500px; background: #fb923c22; top: -120px; right: -100px; animation: float 9s ease-in-out infinite; }
        .qs-blob-2 { width: 400px; height: 400px; background: #3b82f618; bottom: -100px; left: -80px; animation: float 7s ease-in-out infinite; animation-delay: -4s; }
        .qs-blob-3 { width: 200px; height: 200px; background: #fbbf2415; top: 40%; left: 55%; animation: float 11s ease-in-out infinite; animation-delay: -8s; }

        .qs-brand {
          position: absolute; top: 1.75rem; left: 2rem;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1rem; font-weight: 800;
          color: #1e293b; letter-spacing: -0.02em;
          display: flex; align-items: center; gap: 0.4rem;
          z-index: 1;
        }
        .qs-brand-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .qs-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 520px;
          background: #fff;
          border: 1px solid #f1e8dc;
          border-radius: 24px;
          padding: 3rem 2.75rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.03), 0 24px 64px rgba(249,115,22,0.08);
          animation: fadeUp 0.5s ease both;
          text-align: center;
        }

        /* icon circle */
        .qs-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: linear-gradient(135deg, #fff7ed, #ffedd5);
          border: 1.5px solid #fed7aa;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem; margin: 0 auto 1.5rem;
          box-shadow: 0 4px 16px rgba(249,115,22,0.15);
        }

        .qs-badge {
          display: inline-flex; align-items: center; gap: 0.35rem;
          background: #fff7ed; border: 1px solid #fed7aa;
          border-radius: 999px; padding: 0.28rem 0.75rem;
          font-size: 0.68rem; font-weight: 700;
          color: #ea580c; letter-spacing: 0.07em;
          text-transform: uppercase; margin-bottom: 1.25rem;
        }
        .qs-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: #f97316; }

        .qs-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 2.1rem; font-weight: 800;
          color: #1e293b; letter-spacing: -0.03em;
          line-height: 1.2; margin-bottom: 1rem;
        }
        .qs-title span { color: #f97316; }

        .qs-sub {
          font-size: 0.92rem; color: #64748b;
          line-height: 1.7; margin-bottom: 2rem;
          max-width: 360px; margin-left: auto; margin-right: auto;
        }

        /* steps row */
        .qs-steps {
          display: flex; justify-content: center;
          gap: 0; margin-bottom: 2.25rem;
        }
        .qs-step {
          display: flex; flex-direction: column; align-items: center;
          gap: 0.4rem; flex: 1; max-width: 100px;
          position: relative;
        }
        .qs-step:not(:last-child)::after {
          content: '';
          position: absolute; top: 16px; left: 60%;
          width: 80%; height: 1.5px;
          background: linear-gradient(90deg, #fed7aa, #fde68a);
        }
        .qs-step-dot {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #fb923c);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700;
          box-shadow: 0 2px 8px rgba(249,115,22,0.3);
          position: relative; z-index: 1;
        }
        .qs-step-label {
          font-size: 0.68rem; color: #94a3b8;
          font-weight: 500; text-align: center; line-height: 1.3;
        }

        .qs-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #f1e8dc, transparent);
          margin-bottom: 2rem;
        }

        .qs-btn {
          width: 100%; padding: 0.95rem;
          border: none; border-radius: 14px;
          background: linear-gradient(135deg, #f97316, #fb923c);
          color: #fff;
          font-family: 'Instrument Sans', sans-serif;
          font-size: 1rem; font-weight: 600;
          cursor: pointer; position: relative; overflow: hidden;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(249,115,22,0.35);
          letter-spacing: 0.01em;
        }
        .qs-btn:hover {
          opacity: 0.93; transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(249,115,22,0.45);
        }
        .qs-btn:active { transform: translateY(0); }
        .qs-btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
          transform: translateX(-100%); transition: transform 0.5s ease;
        }
        .qs-btn:hover::after { transform: translateX(100%); }

        .qs-note {
          display: flex; align-items: center; justify-content: center;
          gap: 0.4rem; margin-top: 1.1rem;
          font-size: 0.78rem; color: #cbd5e1;
        }
      `}</style>

      <div className="qs-root">
        <div className="qs-blob qs-blob-1" />
        <div className="qs-blob qs-blob-2" />
        <div className="qs-blob qs-blob-3" />

        <div className="qs-brand">
          <div className="qs-brand-dot" />
          Tri-Sara
        </div>

        <div className="qs-card">

          <div className="qs-icon">🎯</div>

          <div className="qs-badge">
            <div className="qs-badge-dot" />
            Step 2 of 2
          </div>

          <h1 className="qs-title">
            You're almost <span>there!</span>
          </h1>
          <p className="qs-sub">
            Take this short quiz so we can understand your learning style
            and unlock a fully personalized experience just for you.
          </p>

          {/* 3-step indicator */}
          <div className="qs-steps">
            {[
              { n: 1, label: "Answer questions" },
              { n: 2, label: "We analyse you" },
              { n: 3, label: "Learn your way" },
            ].map((s) => (
              <div key={s.n} className="qs-step">
                <div className="qs-step-dot">{s.n}</div>
                <span className="qs-step-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="qs-divider" />

          <button className="qs-btn" onClick={() => router.push("/quiz/take")}>
            Start the Quiz →
          </button>

          <div className="qs-note">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm0 4v3M6 4v.5" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Only takes a few minutes
          </div>

        </div>
      </div>
    </>
  );
}