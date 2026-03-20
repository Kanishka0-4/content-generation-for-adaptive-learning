"use client";

import React, { useEffect } from "react";
import AdaptiveRenderer from "./AdaptiveRenderer";
import AudioRenderer from "./renderers/AudioRenderer";

interface LearningProfile {
  visual: number;
  audio: number;
  text: number;
}

interface MarkdownRendererProps {
  content: string;
  profile: LearningProfile;
  moduleId: string;
  setAudioContent?: (text: string) => void;
}

/* ---------------- HELPERS ---------------- */

function getRanking(profile: LearningProfile): string[] {
  return Object.entries(profile)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);
}

function parseTaggedParts(src: string) {
  const parts: { type: "visual" | "audio" | "text"; content: string }[] = [];
  const tagRegex = /\[(VISUAL|AUDIO|TEXT)\]\s*([\s\S]*?)\s*\[\/\1\]/gi;

  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = tagRegex.exec(src)) !== null) {
    if (m.index > lastIndex) {
      const plain = src.slice(lastIndex, m.index);
      if (plain.trim()) parts.push({ type: "text", content: plain });
    }

    parts.push({
      type: m[1].toLowerCase() as any,
      content: m[2],
    });

    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < src.length) {
    const rest = src.slice(lastIndex);
    if (rest.trim()) parts.push({ type: "text", content: rest });
  }

  return parts;
}

function stripKeyTakeaways(block: string) {
  return block.replace(/Key\s*Takeaways[\s\S]*/gi, "").trim();
}

/* ---------------- MAIN ---------------- */

export default function MarkdownRenderer({
  content,
  profile,
  moduleId,
  setAudioContent,
}: MarkdownRendererProps) {

  const ranking = getRanking(profile);
  const isAudioPrimary = ranking[0] === "audio";

  const taggedParts = parseTaggedParts(content);

  /* 🔥 COLLECT AUDIO */
  const audioContent = taggedParts
    .filter((p) => p.type === "audio")
    .map((p) => stripKeyTakeaways(p.content))
    .join("\n\n");

  useEffect(() => {
    if (setAudioContent && audioContent) {
      setAudioContent(audioContent);
    }
  }, [audioContent, setAudioContent]);

  return (
    <>
      {/* ✅ RESTORED STYLING */}
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');

  .md-root {
    --ink: #1a1a1a;
    --ink-muted: #6b7280;
    --surface: #fffdf7;
    --surface-raised: #ffffff;
    --border: #ffe4b5;
.md-root {
  word-wrap: break-word;
  overflow-wrap: break-word;
}
  
    /* 🎨  PALETTE */
    --accent: #ff9500;
    --accent-strong: #ff7b00;
    --accent-soft: #fff4d6;
    --accent-light: #ffd000;

    --visual-bg: #fff8e6;
    --radius: 12px;

    font-family: 'Inter', sans-serif;
    color: var(--ink);
    background: var(--surface);
    max-width: 760px;
    margin: 0 auto;
    line-height: 1.7;
  }

  .md-text-block {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 1px 4px rgba(255,149,0,0.08);
  }

  .md-visual-block {
    background: var(--visual-bg);
    border: 1px solid var(--accent-light);
    border-radius: var(--radius);
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 8px rgba(255,149,0,0.12);
  }

  /* 🔥 Rich typography (UNCHANGED) */
  .md-root h1, .md-root h2, .md-root h3 {
    font-family: 'Lora', serif;
    line-height: 1.3;
  }

  .md-root h2 {
    border-bottom: 2px solid var(--border);
    padding-bottom: 0.5rem;
  }

  .md-root h3 {
    color: var(--accent-strong);
  }

  .md-root strong {
    color: var(--accent-strong);
  }

  /* ✅ FIXED BULLETS (ONLY ADDITION) */
  .md-root ul {
    list-style: disc;
    padding-left: 1.2rem;
  }

  .md-root ol {
    list-style: decimal;
    padding-left: 1.2rem;
  }

  .md-root ul li::marker {
    color: var(--accent);
  }

  .md-root blockquote {
    border-left: 3px solid var(--accent);
    background: var(--accent-soft);
    padding: 1rem 1.5rem;
    border-radius: 0 var(--radius) var(--radius) 0;
    color: var(--ink-muted);
    font-style: italic;
  }

  .md-root code {
    background: var(--accent-soft);
    color: var(--accent-strong);
    padding: 0.2em 0.4em;
    border-radius: 4px;
  }

  .md-root table th {
    background: var(--accent-soft);
    color: var(--accent-strong);
    border-bottom: 2px solid var(--accent-light);
  }

  .md-root table tr:hover td {
    background: var(--accent-soft);
  }

  .md-root a {
    color: var(--accent);
    text-decoration: underline;
  }

  .md-root hr {
    border-top: 1px solid var(--border);
  }

  /* fallback safety */
  .md-root audio, .md-root text {
    display: none !important;
  }
`}</style>

      <div className="md-root">

        {/* ✅ MAIN CONTENT */}
        {taggedParts.map((part, index) => {

          if (part.type === "visual") {
            return (
              <div key={index} className="md-visual-block">
                <AdaptiveRenderer
                  block={part.content}
                  type="visual"
                  profile={profile}
                  moduleId={moduleId}
                />
              </div>
            );
          }

          if (part.type === "audio") return null;

          if (!part.content.trim()) return null;

          if (isAudioPrimary) {
            return (
              <div key={index} className="md-visual-block">
                <AdaptiveRenderer
                  block={part.content}
                  type="text"
                  profile={profile}
                  moduleId={moduleId}
                />
              </div>
            );
          }

          return (
            <div key={index} className="md-text-block">
              <AdaptiveRenderer
                block={part.content}
                type="text"
                profile={profile}
                moduleId={moduleId}
              />
            </div>
          );
        })}

        {/* 🔥 FINAL AUDIO PLAYER (BOTTOM OF CHAPTER) */}
        {audioContent && (
          <div style={{ marginTop: "2rem" }}>
            <AudioRenderer block={audioContent} variant="chapter" />
          </div>
        )}

      </div>
    </>
  );
}