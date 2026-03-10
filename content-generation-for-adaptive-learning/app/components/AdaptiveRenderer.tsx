"use client";

import VisualRenderer from "./renderers/VisualRenderer";
import TextRenderer from "./renderers/TextRenderer";
import AudioRenderer from "./renderers/AudioRenderer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface LearningProfile {
  visual: number;
  audio: number;
  text: number;
}

interface AdaptiveRendererProps {
  block: string;
  type: "visual" | "text";
  profile: LearningProfile;
}

/* ══════════════════════════════════════════════
   STEP CHAIN  — replaces numbered lists
══════════════════════════════════════════════ */


function StepChain({ steps }: { steps: string[] }) {
  return (
    <div style={{
      margin: "0.85rem 0",
      padding: "1rem 1.2rem",
      background: "#f8f9ff",
      border: "1px solid #e0e7ff",
      borderLeft: "3px solid #6366f1",
      borderRadius: "0 12px 12px 0",
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.45rem",
              background: "#eef2ff", border: "1px solid #c7d2fe",
              borderRadius: 999, padding: "0.35rem 0.9rem",
              fontSize: "0.82rem", color: "#3730a3",
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "linear-gradient(135deg,#6366f1,#818cf8)",
                color: "#fff", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{ fontWeight: 500 }}>{step}</span>
            </div>
            {i < steps.length - 1 && (
              <span style={{ color: "#a5b4fc", fontSize: "0.85rem" }}>→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   BULLET GRID  — replaces bullet lists
   • bold "Term: definition" → term cards
   • plain bullets → pill chips
══════════════════════════════════════════════ */
function BulletGrid({ items }: { items: string[] }) {
  const clean = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "$1");
  const hasTerm = items.every((it) => /\*\*[^*]+\*\*/.test(it));
  const colors = ["#6366f1","#0891b2","#059669","#d97706","#8b5cf6","#dc2626"];

  if (hasTerm) {
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
        gap: "0.55rem", margin: "0.85rem 0",
      }}>
        {items.map((item, i) => {
          const m = item.match(/\*\*([^*]+)\*\*[:\s–-]*(.*)/);
          const term = m?.[1] ?? clean(item);
          const def  = m?.[2]?.trim() ?? "";
          const color = colors[i % colors.length];
          return (
            <div key={i} style={{
              background: "#fff",
              border: `1px solid ${color}25`,
              borderTop: `3px solid ${color}`,
              borderRadius: 10,
              padding: "0.7rem 0.9rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color, marginBottom: def ? "0.25rem" : 0 }}>
                {term}
              </div>
              {def && <div style={{ fontSize: "0.77rem", color: "#6b7280", lineHeight: 1.5 }}>{def}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "0.85rem 0" }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: "#f0fdf4", border: "1px solid #a7f3d0",
          borderRadius: 999, padding: "0.28rem 0.8rem",
          fontSize: "0.81rem", color: "#065f46", fontWeight: 500,
        }}>
          {clean(item)}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   VISUAL TEXT BLOCK
   Walks line-by-line, intercepts lists,
   renders prose normally via ReactMarkdown
══════════════════════════════════════════════ */
function VisualTextBlock({ block }: { block: string }) {
  const lines = block.split("\n");
  const segments: React.ReactNode[] = [];
  let proseBuf: string[] = [];
  let numberedBuf: string[] = [];
  let bulletBuf: string[] = [];
  let key = 0;

  const flushProse = () => {
    const text = proseBuf.join("\n").trim();
    if (text) {
      segments.push(
        <div key={key++}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      );
    }
    proseBuf = [];
  };

  const flushNumbered = () => {
    if (numberedBuf.length >= 2) {
      const steps = numberedBuf.map((l) => l.replace(/^\d+\.\s+/, "").trim());
      segments.push(<StepChain key={key++} steps={steps} />);
    } else {
      proseBuf.push(...numberedBuf);
    }
    numberedBuf = [];
  };

  const flushBullets = () => {
    if (bulletBuf.length >= 2) {
      const items = bulletBuf.map((l) => l.replace(/^[*\-]\s+/, "").trim());
      segments.push(<BulletGrid key={key++} items={items} />);
    } else {
      proseBuf.push(...bulletBuf);
    }
    bulletBuf = [];
  };

  for (const line of lines) {
    const isNumbered = /^\d+\.\s+/.test(line);
    const isBullet   = /^[*\-]\s+/.test(line);
    const isEmpty    = !line.trim();

    if (isNumbered) {
      flushBullets();
      flushProse();
      numberedBuf.push(line);
    } else if (isBullet) {
      flushNumbered();
      flushProse();
      bulletBuf.push(line);
    } else if (isEmpty) {
      if (numberedBuf.length) flushNumbered();
      if (bulletBuf.length)   flushBullets();
      proseBuf.push(line);
    } else {
      if (numberedBuf.length) flushNumbered();
      if (bulletBuf.length)   flushBullets();
      proseBuf.push(line);
    }
  }

  flushNumbered();
  flushBullets();
  flushProse();

  return <>{segments}</>;
}

/* ══════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════ */
export default function AdaptiveRenderer({
  block,
  type,
  profile,
}: AdaptiveRendererProps) {

  const { visual, audio, text } = profile;

  const dominant =
    visual > text && visual > audio ? "visual"
    : text > visual && text > audio ? "text"
    : "audio";
 // ✅ now everything exists
  console.log("PROFILE:", profile);
  console.log("DOMINANT:", dominant);
  console.log("TYPE:", type);
  console.log("BLOCK PREVIEW:", block.slice(0, 100));

  console.log("PROFILE RAW:", JSON.stringify(profile));
  /* VISUAL BLOCKS — always VisualRenderer */
  if (type === "visual") {
    return <VisualRenderer block={block} />;
  }

  /* TEXT BLOCKS — transform based on dominant style */
  if (dominant === "visual") {
    return <VisualTextBlock block={block} />;
  }

  if (dominant === "audio") {
    return <AudioRenderer block={block} />;
  }

  return <TextRenderer block={block} />;
}