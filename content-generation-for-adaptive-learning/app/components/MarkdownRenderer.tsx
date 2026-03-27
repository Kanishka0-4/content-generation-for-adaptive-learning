"use client";

import React, { useEffect } from "react";
import AdaptiveRenderer from "./AdaptiveRenderer";
import AudioRenderer from "./renderers/AudioRenderer";
import ChapterQuiz from "./ChapterQuiz";

interface LearningProfile {
  visual: number;
  audio: number;
  text: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: string;
}

interface MarkdownRendererProps {
  content: string;
  profile: LearningProfile;
  moduleId: string;
  setAudioContent?: (text: string) => void;
  quiz?: QuizQuestion[];
  onQuizComplete?: (score: number, total: number) => void;
}

/* ---------------- HELPERS ---------------- */

function getRanking(profile: LearningProfile): string[] {
  return Object.entries(profile)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);
}

/* ---------------- STEP 1: NORMALISE RAW CONTENT ---------------- */

/**
 * Fix all the ways the AI mis-formats tags before we do anything else.
 *
 * Problems seen in the wild:
 *  a) "[TEXT]" appears inline at the start of a line (not as a block wrapper)
 *  b) "[\n/TEXT]" — newline sneaks inside the closing bracket
 *  c) "* " bullets instead of "- " bullets (react-markdown doesn't render * lists)
 *  d) Quiz / MCQ artifacts polluting text blocks
 */
function normaliseContent(src: string): string {
  return (
    src
      // ✅ FIX (b): collapse "[\n/TAG]" → "[/TAG]"  (newline inside bracket)
      .replace(/\[\s*\n\s*\/(TEXT|VISUAL|AUDIO)\]/gi, "[/$1]")

      // ✅ FIX (a): strip bare inline opening tags (not followed by a newline)
      //    "[TEXT] • Introduction..." → "• Introduction..."
      .replace(/^\[(TEXT|VISUAL|AUDIO)\](?!\s*\n)/gm, "")

      // ✅ FIX (c): convert "* " list bullets → "- " for react-markdown
      .replace(/^\*\s+/gm, "- ")

      // ✅ Remove quiz / MCQ artifacts
      .replace(/#{1,3}\s*(Quiz|Questions?|Multiple Choice|MCQ).*\n?/gi, "")
      .replace(/\d+\.\s*.*\?\s*\n?(A\)|B\)|C\)|D\)).*\n?/gi, "")
      .replace(/^[A-D]\)\s*.*\n?/gm, "")
      .replace(/Correct\s*(answer|Answer|option|Option).*:?\s*[A-D]\s*\n?/gi, "")
      .replace(/Answer\s*:\s*[A-D]\s*\n?/gi, "")
  );
}

/* ---------------- STEP 2: STRIP KEY TAKEAWAYS FROM AUDIO ---------------- */

function stripKeyTakeaways(block: string): string {
  return block.replace(/Key\s*Takeaways[\s\S]*/gi, "").trim();
}

/* ---------------- STEP 3: PARSE TAGGED PARTS ---------------- */

/**
 * Splits the normalised source into typed parts.
 *
 * Tag format expected:  [TEXT] ... [/TEXT]   (case-insensitive, whitespace-tolerant)
 *
 * Any content NOT inside a recognised tag pair is collected as type "text".
 * This handles Analogy / Example / Key Takeaways blocks that appear
 * between [/TEXT] and [VISUAL] in the AI output.
 */
function parseTaggedParts(src: string) {
  const parts: { type: "visual" | "audio" | "text"; content: string }[] = [];

  // Allow optional whitespace/newlines around tag names and slashes
  const tagRegex = /\[\s*(TEXT|VISUAL|AUDIO)\s*\]([\s\S]*?)\[\s*\/\s*\1\s*\]/gi;

  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = tagRegex.exec(src)) !== null) {
    // Untagged content between previous end and this tag → treat as "text"
    if (m.index > lastIndex) {
      const plain = src.slice(lastIndex, m.index).trim();
      if (plain) parts.push({ type: "text", content: plain });
    }

    const tagType = m[1].toLowerCase() as "visual" | "audio" | "text";
    const tagContent = m[2].trim();

    if (tagContent) {
      parts.push({ type: tagType, content: tagContent });
    }

    lastIndex = tagRegex.lastIndex;
  }

  // Trailing content after the last closing tag
  if (lastIndex < src.length) {
    const rest = src.slice(lastIndex).trim();
    if (rest) parts.push({ type: "text", content: rest });
  }

  // Fallback: if nothing matched at all, treat entire source as text
  if (parts.length === 0 && src.trim()) {
    parts.push({ type: "text", content: src.trim() });
  }

  return parts;
}

/* ---------------- MAIN ---------------- */

export default function MarkdownRenderer({
  content,
  profile,
  moduleId,
  setAudioContent,
  quiz = [],
  onQuizComplete,
}: MarkdownRendererProps) {
  const ranking = getRanking(profile);
  const isAudioPrimary = ranking[0] === "audio";

  // Pipeline: normalise → parse
  const normalised = normaliseContent(content);
  const taggedParts = parseTaggedParts(normalised);

  // Collect all [AUDIO] blocks for the bottom player
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
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');

  .md-root {
    --ink: #1a1a1a;
    --ink-muted: #6b7280;
    --surface: #fffdf7;
    --surface-raised: #ffffff;
    --border: #ffe4b5;
    word-wrap: break-word;
    overflow-wrap: break-word;

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

  .md-root audio, .md-root text {
    display: none !important;
  }
`}</style>

      <div className="md-root">

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

          // Audio blocks are collected above and rendered at the bottom — skip here
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

        {/* Audio player pinned to the bottom of the chapter */}
        {audioContent && (
          <div style={{ marginTop: "2rem" }}>
            <AudioRenderer block={audioContent} variant="chapter" />
          </div>
        )}

        {/* Chapter quiz */}
        {quiz.length > 0 && (
          <ChapterQuiz
            quiz={quiz}
            onComplete={(score, total) => onQuizComplete?.(score, total)}
          />
        )}

      </div>
    </>
  );
}