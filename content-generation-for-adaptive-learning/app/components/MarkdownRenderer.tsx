"use client";

import AdaptiveRenderer from "./AdaptiveRenderer";

interface LearningProfile {
  visual: number;
  audio: number;
  text: number;
}

interface MarkdownRendererProps {
  content: string;
  profile: LearningProfile;
  moduleId: string;
}

function getRanking(profile: LearningProfile): string[] {
  return Object.entries(profile)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);
}

export default function MarkdownRenderer({ content, profile, moduleId }: MarkdownRendererProps) {

  const cleaned = content
    .replace(/###\s*1\.\s*Hook.*\n?/gi, "")
    .replace(/###\s*2\.\s*Concept.*\n?/gi, "")
    .replace(/###\s*3\.\s*Concept.*\n?/gi, "")
    .replace(/###\s*4\.\s*Visual.*\n?/gi, "")
    .replace(/###\s*5\.\s*Worked.*\n?/gi, "")
    .replace(/###\s*6\.\s*Scenario.*\n?/gi, "")
    .replace(/###\s*7\.\s*Key.*\n?/gi, "")
    .replace(
      /\*\*\d+\.\s*(Hook|Concept Explanation|Concept Breakdown|Visualiz\w+|Worked Example|Scenario|Key Takeaways)[^*]*\*\*\n?/gi,
      ""
    );

  const parts = cleaned.split(/\[VISUAL\]\s*([\s\S]*?)\s*\[\/VISUAL\]/g);

  const ranking      = getRanking(profile);
  const isAudioPrimary = ranking[0] === "audio";
  const isVisualLow  = profile.visual < 30;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .md-root {
          --ink: #1a1a2e;
          --ink-muted: #5a5a7a;
          --surface: #fafaf8;
          --surface-raised: #ffffff;
          --border: #e8e8f0;
          --accent: #5b5fcf;
          --accent-soft: #eeeeff;
          --visual-bg: #f4f4fb;
          --radius: 14px;
          --font-body: 'DM Sans', sans-serif;
          --font-display: 'Lora', Georgia, serif;
        }

        .md-root {
          font-family: var(--font-body);
          color: var(--ink);
          background: var(--surface);
          max-width: 760px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 5rem;
          line-height: 1.75;
        }

        .md-text-block {
          background: var(--surface-raised);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 2rem 2.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 12px rgba(91,95,207,0.04), 0 1px 3px rgba(0,0,0,0.04);
          transition: box-shadow 0.2s ease;
        }
        .md-text-block:hover {
          box-shadow: 0 4px 20px rgba(91,95,207,0.08), 0 2px 6px rgba(0,0,0,0.05);
        }

        .md-audio-block {
          background: #f8fffc;
          border: 1px solid #d1fae5;
          border-top: 3px solid #10b981;
          border-radius: var(--radius);
          padding: 1.5rem 2.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 12px rgba(16,185,129,0.04);
        }

        .md-visual-block {
          background: var(--visual-bg);
          border: 1.5px solid #d8d8f0;
          border-radius: var(--radius);
          padding: 1.75rem 2.25rem;
          margin-bottom: 1.5rem;
          position: relative;
          overflow: hidden;
        }
        .md-visual-block::before {
          content: "◈  Visual";
          position: absolute;
          top: 0.75rem; right: 1rem;
          font-size: 0.65rem; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--accent); opacity: 0.7;
        }

        .md-prose h1, .md-prose h2, .md-prose h3 {
          font-family: var(--font-display);
          color: var(--ink); line-height: 1.3;
        }
        .md-prose h1 { font-size: 1.65rem; font-weight: 600; margin: 0 0 1.25rem; }
        .md-prose h2 { font-size: 1.2rem; font-weight: 600; margin: 1.75rem 0 0.85rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border); }
        .md-prose h3 { font-size: 1rem; font-weight: 600; color: var(--accent); margin: 1.5rem 0 0.65rem; }

        .md-prose p {
          margin: 0 0 1.4rem;
          font-size: 0.95rem; color: #3d3d5c;
          font-weight: 300; line-height: 1.85;
        }
        .md-prose p:last-child { margin-bottom: 0; }

        .md-prose strong {
          font-weight: 600; color: var(--ink);
          background: var(--accent-soft);
          padding: 0.05em 0.3em; border-radius: 4px; font-size: 0.93em;
        }
        .md-prose em {
          font-family: var(--font-display);
          font-style: italic; color: var(--ink-muted);
        }

        .md-prose p:has(+ ul),
        .md-prose p:has(+ ol) {
          margin-bottom: 0.6rem;
          font-size: 0.82rem; font-weight: 600;
          color: var(--accent); text-transform: uppercase;
          letter-spacing: 0.06em; opacity: 0.8;
        }

        .md-prose ul, .md-prose ol {
          margin: 0 0 1.4rem; padding: 0;
          list-style: none;
          display: flex; flex-direction: column; gap: 0.45rem;
        }

        .md-prose ul li, .md-prose ol li {
          display: flex; align-items: flex-start; gap: 0.7rem;
          padding: 0.6rem 0.9rem; border-radius: 9px;
          font-size: 0.9rem; font-weight: 300; line-height: 1.65;
          border-left: 3px solid;
        }

        /* ══════════════════════════════════════
           VISUAL HIGH (≥ 30) — colourful rows
        ══════════════════════════════════════ */
        .md-visual-high .md-prose ul li:nth-child(6n+1) { background: #eef2ff; border-color: #6366f1; color: #312e81; }
        .md-visual-high .md-prose ul li:nth-child(6n+2) { background: #ecfeff; border-color: #0891b2; color: #164e63; }
        .md-visual-high .md-prose ul li:nth-child(6n+3) { background: #f0fdf4; border-color: #059669; color: #064e3b; }
        .md-visual-high .md-prose ul li:nth-child(6n+4) { background: #fffbeb; border-color: #d97706; color: #78350f; }
        .md-visual-high .md-prose ul li:nth-child(6n+5) { background: #faf5ff; border-color: #8b5cf6; color: #3b0764; }
        .md-visual-high .md-prose ul li:nth-child(6n+6) { background: #fff1f2; border-color: #e11d48; color: #881337; }

        .md-visual-high .md-prose ol li:nth-child(6n+1) { background: #eef2ff; border-color: #6366f1; color: #312e81; }
        .md-visual-high .md-prose ol li:nth-child(6n+2) { background: #ecfeff; border-color: #0891b2; color: #164e63; }
        .md-visual-high .md-prose ol li:nth-child(6n+3) { background: #f0fdf4; border-color: #059669; color: #064e3b; }
        .md-visual-high .md-prose ol li:nth-child(6n+4) { background: #fffbeb; border-color: #d97706; color: #78350f; }
        .md-visual-high .md-prose ol li:nth-child(6n+5) { background: #faf5ff; border-color: #8b5cf6; color: #3b0764; }
        .md-visual-high .md-prose ol li:nth-child(6n+6) { background: #fff1f2; border-color: #e11d48; color: #881337; }

        .md-visual-high .md-prose ul li::before {
          content: ""; width: 7px; height: 7px;
          border-radius: 50%; flex-shrink: 0;
          margin-top: 0.48rem; background: currentColor; opacity: 0.5;
        }

        /* ══════════════════════════════════════
           VISUAL LOW (< 30) — subtle highlights
        ══════════════════════════════════════ */
        .md-visual-low .md-prose ul li,
        .md-visual-low .md-prose ol li {
          background: #f8f8fc;
          border-color: #c8c8e8;
          color: #3d3d5c;
        }

        .md-visual-low .md-prose ul li::before {
          content: ""; width: 6px; height: 6px;
          border-radius: 50%; flex-shrink: 0;
          margin-top: 0.5rem; background: var(--accent); opacity: 0.35;
        }

        /* ── ordered list numbers (both modes) ── */
        .md-prose ol { counter-reset: list-counter; }
        .md-prose ol li { counter-increment: list-counter; }

        .md-visual-high .md-prose ol li::before {
          content: counter(list-counter);
          min-width: 20px; height: 20px; border-radius: 50%;
          background: currentColor; color: #fff;
          font-size: 0.62rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 0.18rem; opacity: 1;
        }

        .md-visual-low .md-prose ol li::before {
          content: counter(list-counter);
          min-width: 18px; height: 18px; border-radius: 50%;
          background: var(--accent); color: #fff; opacity: 0.5;
          font-size: 0.6rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 0.2rem;
        }

        .md-prose li li { background: transparent !important; border: none !important; padding: 0.1rem 0; }

        .md-prose blockquote {
          border-left: 3px solid var(--accent); background: var(--accent-soft);
          margin: 1.25rem 0; padding: 0.85rem 1.25rem;
          border-radius: 0 8px 8px 0; color: var(--ink-muted);
          font-style: italic; font-family: var(--font-display); font-size: 0.94rem;
        }
        .md-prose blockquote p { color: inherit; margin: 0; }

        .md-prose code {
          background: var(--accent-soft); color: var(--accent);
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.82em; padding: 0.15em 0.45em; border-radius: 5px; font-weight: 500;
        }
        .md-prose pre {
          background: var(--ink); color: #d4d4ff; border-radius: 10px;
          padding: 1.25rem 1.5rem; overflow-x: auto; margin: 1.25rem 0;
          font-size: 0.84rem; line-height: 1.65;
        }
        .md-prose pre code { background: none; color: inherit; padding: 0; font-size: inherit; }

        .md-prose table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin: 1.25rem 0; }
        .md-prose th { background: var(--accent-soft); color: var(--accent); font-weight: 500; text-align: left; padding: 0.6rem 0.9rem; border-bottom: 2px solid #d0d0f0; }
        .md-prose td { padding: 0.55rem 0.9rem; border-bottom: 1px solid var(--border); color: var(--ink); font-weight: 300; }
        .md-prose tr:last-child td { border-bottom: none; }
        .md-prose tr:hover td { background: var(--accent-soft); }

        .md-prose a { color: var(--accent); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
        .md-prose a:hover { text-decoration-thickness: 2px; }
        .md-prose hr { border: none; border-top: 1px solid var(--border); margin: 1.75rem 0; }
      `}</style>

      {/* md-visual-high or md-visual-low class controls bullet colour intensity */}
      <div className={`md-root ${isVisualLow ? "md-visual-low" : "md-visual-high"}`}>
        {parts.map((part, index) => {

          if (index % 2 === 1) {
            return (
              <div key={index} className="md-visual-block">
                <AdaptiveRenderer block={part} type="visual" profile={profile} moduleId={moduleId} />
              </div>
            );
          }

          if (!part.trim()) return null;

          if (isAudioPrimary) {
            return (
              <div key={index} className="md-audio-block">
                <AdaptiveRenderer block={part} type="text" profile={profile} moduleId={moduleId} />
              </div>
            );
          }

          return (
            <div key={index} className="md-text-block">
              <AdaptiveRenderer block={part} type="text" profile={profile} moduleId={moduleId} />
            </div>
          );
        })}
      </div>
    </>
  );
}