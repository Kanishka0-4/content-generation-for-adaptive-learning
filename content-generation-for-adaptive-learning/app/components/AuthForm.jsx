"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ type }) {
  const router = useRouter();
  const isLogin = type === "login";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const updatedForm = { ...form, [e.target.name]: e.target.value };
    setForm(updatedForm);
    setError("");

    if (e.target.name === "email") {
      const email = updatedForm.email;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Invalid email format");
        return;
      }
      const allowedDomains = [
        "gmail.com",
        "yahoo.com",
        "outlook.com",
        "hotmail.com",
        "icloud.com",
      ];
      const domain = email.split("@")[1]?.toLowerCase();
      if (domain && !allowedDomains.includes(domain)) {
        setError("Use Gmail, Yahoo, Outlook, etc.");
        return;
      }
    }

    if (e.target.name === "password") {
      const password = updatedForm.password;

      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setError("Must include uppercase letter");
        return;
      }
      if (!/[a-z]/.test(password)) {
        setError("Must include lowercase letter");
        return;
      }
      if (!/\d/.test(password)) {
        setError("Must include a number");
        return;
      }
      if (!/[^A-Za-z0-9\s]/.test(password)) {
        setError("Must include a special character");
        return;
      }

      if (/\s/.test(password)) {
        setError("Password should not contain spaces");
        return;
      }

      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Invalid email format");
      setLoading(false);
      return;
    }

    const allowedDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
    ];
    const domain = form.email.split("@")[1]?.toLowerCase();
    if (!allowedDomains.includes(domain)) {
      setError(
        "Please use a valid email provider (Gmail, Yahoo, Outlook, etc.)",
      );
      setLoading(false);
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[^\s]{8,}$/;

    if (!form.password || !passwordRegex.test(form.password)) {
      setError(
        "Password must be 8+ chars, include uppercase, lowercase, number, special character and no spaces",
      );
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(isLogin ? "/api/login" : "/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
     
      if (isLogin) {
        router.push(data.quiz_completed === false ? "/quiz/welcome" : "/");
      } else {
        router.push("/quiz/welcome");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

        .auth-root {
          display: flex;
          min-height: 100vh;
          font-family: 'Instrument Sans', sans-serif;
          background: #fffaf5;
        }

        /* ── Left panel ── */
        .auth-left {
          display: none;
          position: relative;
          overflow: hidden;
          background: #fff7ed;
          border-right: 1px solid #f1e8dc;
        }
        @media (min-width: 900px) {
          .auth-left {
            display: flex; flex: 1;
            flex-direction: column; justify-content: flex-end;
            padding: 3rem;
          }
        }

        .auth-blob {
          position: absolute; border-radius: 50%;
          filter: blur(70px); pointer-events: none;
        }
        .auth-blob-1 { width: 320px; height: 320px; background: #fb923c28; top: -60px; right: -60px; animation: float 9s ease-in-out infinite; }
        .auth-blob-2 { width: 240px; height: 240px; background: #3b82f618; bottom: 10%; left: -40px; animation: float 7s ease-in-out infinite; animation-delay: -4s; }
        .auth-blob-3 { width: 180px; height: 180px; background: #fbbf2420; top: 40%; right: 10%; animation: float 11s ease-in-out infinite; animation-delay: -8s; }

        .auth-left-grid {
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, #f97316 1px, transparent 1px);
          background-size: 32px 32px;
          opacity: 0.07;
        }

        .auth-left-content { position: relative; z-index: 1; }

        .auth-brand {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.1rem; font-weight: 800;
          color: #1e293b; letter-spacing: -0.02em;
          margin-bottom: 3rem;
          display: flex; align-items: center; gap: 0.45rem;
        }
        .auth-brand-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .auth-left-headline {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(2rem, 3vw, 2.75rem);
          font-weight: 800; color: #1e293b;
          line-height: 1.15; letter-spacing: -0.03em;
          margin-bottom: 1rem;
        }
        .auth-left-headline span { color: #f97316; }

        .auth-left-sub {
          font-size: 0.9rem; color: #94a3b8;
          line-height: 1.65; max-width: 300px;
        }

        .auth-pills {
          display: flex; flex-wrap: wrap; gap: 0.5rem;
          margin-top: 2rem;
        }
        .auth-pill {
          display: flex; align-items: center; gap: 0.35rem;
          background: #fff; border: 1px solid #f1e8dc;
          border-radius: 999px; padding: 0.3rem 0.8rem;
          font-size: 0.75rem; font-weight: 500; color: #64748b;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .auth-pill-dot { width: 6px; height: 6px; border-radius: 50%; }

        /* ── Right panel ── */
        .auth-right {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          padding: 2rem 1.5rem;
          background: #fffaf5;
        }

        .auth-card {
          width: 100%; max-width: 420px;
          animation: fadeUp 0.4s ease both;
        }

        .auth-mobile-brand {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.05rem; font-weight: 800;
          color: #1e293b; letter-spacing: -0.02em;
          margin-bottom: 2.5rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        @media (min-width: 900px) { .auth-mobile-brand { display: none; } }

        .auth-badge {
          display: inline-flex; align-items: center; gap: 0.35rem;
          background: #fff7ed; border: 1px solid #fed7aa;
          border-radius: 999px; padding: 0.28rem 0.75rem;
          font-size: 0.68rem; font-weight: 700;
          color: #ea580c; letter-spacing: 0.07em;
          text-transform: uppercase; margin-bottom: 1rem;
        }
        .auth-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: #f97316; }

        .auth-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.9rem; font-weight: 800;
          color: #1e293b; letter-spacing: -0.03em;
          margin-bottom: 0.4rem; line-height: 1.15;
        }

        .auth-subtitle {
          font-size: 0.85rem; color: #94a3b8;
          margin-bottom: 2rem; line-height: 1.5;
        }

        .auth-form-card {
          background: #fff;
          border: 1px solid #f1e8dc;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.03), 0 20px 60px rgba(249,115,22,0.07);
          margin-bottom: 1.25rem;
        }

        .auth-field { margin-bottom: 1rem; }
        .auth-field:last-child { margin-bottom: 0; }

        .auth-label {
          display: block;
          font-size: 0.72rem; font-weight: 600;
          color: #64748b; letter-spacing: 0.07em;
          text-transform: uppercase; margin-bottom: 0.45rem;
        }

        .auth-input {
          width: 100%;
          background: #fafafa;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          font-size: 0.9rem; color: #1e293b;
          font-family: 'Instrument Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .auth-input::placeholder { color: #cbd5e1; }
        .auth-input:focus {
          border-color: #f97316;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }

        .auth-error {
          display: flex; align-items: center; gap: 0.5rem;
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 8px; padding: 0.6rem 0.85rem;
          font-size: 0.82rem; color: #dc2626;
          margin-top: 1rem;
        }

        .auth-submit {
          width: 100%; padding: 0.85rem;
          border: none; border-radius: 12px;
          background: linear-gradient(135deg, #f97316, #fb923c);
          color: #fff;
          font-family: 'Instrument Sans', sans-serif;
          font-size: 0.92rem; font-weight: 600;
          cursor: pointer; margin-top: 1.25rem;
          position: relative; overflow: hidden;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(249,115,22,0.35);
        }
        .auth-submit:hover:not(:disabled) {
          opacity: 0.93; transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(249,115,22,0.45);
        }
        .auth-submit:active:not(:disabled) { transform: translateY(0); }
        .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-submit::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .auth-submit:hover::after { transform: translateX(100%); }

        .auth-footer {
          text-align: center;
          font-size: 0.83rem; color: #94a3b8;
        }
        .auth-footer a {
          color: #f97316; text-decoration: none; font-weight: 600;
        }
        .auth-footer a:hover { text-decoration: underline; }

        .auth-divider {
          display: flex; align-items: center; gap: 0.75rem;
          margin: 1.25rem 0;
        }
        .auth-divider-line { flex: 1; height: 1px; background: #f1e8dc; }
        .auth-divider-text {
          font-size: 0.72rem; color: #cbd5e1;
          letter-spacing: 0.06em; text-transform: uppercase;
        }
      `}</style>

      <div className="auth-root">
        {/* ── Left panel ── */}
        <div className="auth-left">
          <div className="auth-blob auth-blob-1" />
          <div className="auth-blob auth-blob-2" />
          <div className="auth-blob auth-blob-3" />
          <div className="auth-left-grid" />
          <div className="auth-left-content">
            <div className="auth-brand">
              <div className="auth-brand-dot" />
              Tri-Sara
            </div>
            <h1 className="auth-left-headline">
              Learning that
              <br />
              adapts to <span>you</span>
            </h1>
            <p className="auth-left-sub">
              Your personalized learning companion — adapting every lesson to
              how you learn best.
            </p>
            <div className="auth-pills">
              <div className="auth-pill">
                <div
                  className="auth-pill-dot"
                  style={{ background: "#f97316" }}
                />
                Visual learning
              </div>
              <div className="auth-pill">
                <div
                  className="auth-pill-dot"
                  style={{ background: "#3b82f6" }}
                />
                Audio learning
              </div>
              <div className="auth-pill">
                <div
                  className="auth-pill-dot"
                  style={{ background: "#10b981" }}
                />
                Text learning
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-mobile-brand">
              <div className="auth-brand-dot" />
              Tri-Sara
            </div>

            <div className="auth-badge">
              <div className="auth-badge-dot" />
              {isLogin ? "Welcome back" : "Get started"}
            </div>

            <h2 className="auth-title">
              {isLogin ? "Sign in to Tri-Sara" : "Create your account"}
            </h2>
            <p className="auth-subtitle">
              {isLogin
                ? "Continue your personalized learning journey"
                : "Start learning the way that works for you"}
            </p>

            <div className="auth-form-card">
              <form onSubmit={handleSubmit}>
                {!isLogin && (
                  <div className="auth-field">
                    <label className="auth-label">Full Name</label>
                    <input
                      className="auth-input"
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Jane Smith"
                      required
                    />
                  </div>
                )}

                <div className="auth-field">
                  <label className="auth-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@gmail.com"
                    required
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <input
                    className="auth-input"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {error && (
                  <div className="auth-error">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6.5" stroke="#dc2626" />
                      <path
                        d="M7 4v3.5M7 9.5v.5"
                        stroke="#dc2626"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  className="auth-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Please wait..."
                    : isLogin
                      ? "Sign in →"
                      : "Create account →"}
                </button>
              </form>
            </div>

            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">or</span>
              <div className="auth-divider-line" />
            </div>

            <p className="auth-footer">
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <a href={isLogin ? "/signup" : "/login"}>
                {isLogin ? "Sign up free" : "Sign in"}
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
