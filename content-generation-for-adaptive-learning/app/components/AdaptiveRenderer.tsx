"use client";

import VisualRenderer from "./renderers/VisualRenderer";
import TextRenderer from "./renderers/TextRenderer";
import AudioRenderer from "./renderers/AudioRenderer";

interface LearningProfile {
  visual: number;
  audio: number;
  text: number;
}

interface AdaptiveRendererProps {
  block: string;
  type: "visual" | "text";
  profile: LearningProfile;
  moduleId: string;
}

export default function AdaptiveRenderer({ block, type }: AdaptiveRendererProps) {

  /* ── VISUAL BLOCKS ── */
  if (type === "visual") {
    return <VisualRenderer block={block} />;
  }

  /* ── TEXT BLOCKS
     md-prose wraps ONLY TextRenderer so AudioRenderer
     buttons are never inside md-prose and work correctly ── */
  return (
    <>
      <div className="md-prose">
        <TextRenderer block={block} />
      </div>
      <AudioRenderer {...({ block } as any)} />
    </>
  );
}