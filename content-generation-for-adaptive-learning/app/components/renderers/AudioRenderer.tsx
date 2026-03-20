"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AudioRendererProps {
  block: string;

  // 🔥 NEW: optional variant
  variant?: "default" | "chapter";
}

function toSpeakableText(markdown: string): string {
  return markdown
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[*\-]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

const SPEEDS = [
  { label: "0.50×", value: 0.50 },
  { label: "0.75×", value: 0.75 },
  { label: "1×",    value: 1.0  },
  { label: "1.5",   value: 1.5 },
  { label: "2.0",   value: 2.0  },
];

export default function AudioRenderer({ block, variant = "default" }: AudioRendererProps) {

  const [playing, setPlaying]     = useState(false);
  const [supported, setSupported] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [speed, setSpeed]         = useState(1.0);

  const speedRef    = useRef(1.0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      window.speechSynthesis?.cancel();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [block]);

  const handleSpeedChange = (val: number) => {
    setSpeed(val);
    speedRef.current = val;

    if (!playing) return;

    window.speechSynthesis.cancel();
    if (intervalRef.current) clearInterval(intervalRef.current);

    const text      = toSpeakableText(block);
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate  = val;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang === "en-US" && v.localService) ??
      voices.find((v) => v.lang.startsWith("en"));

    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => {
      setPlaying(true);
      setProgress(0);

      let elapsed = 0;
      const estimated = (text.length * 55) / val;

      intervalRef.current = setInterval(() => {
        elapsed += 200;
        setProgress(Math.min((elapsed / estimated) * 100, 95));
      }, 200);
    };

    utterance.onend = () => {
      setPlaying(false);
      setProgress(100);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimeout(() => setProgress(0), 800);
    };

    utterance.onerror = () => {
      setPlaying(false);
      setProgress(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = () => {
    if (!supported) return;

    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      setProgress(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const text = toSpeakableText(block);
    const currentSpeed = speedRef.current;

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate  = currentSpeed;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang === "en-US" && v.localService) ??
      voices.find((v) => v.lang.startsWith("en"));

    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => {
      setPlaying(true);
      setProgress(0);

      let elapsed = 0;
      const estimated = (text.length * 55) / currentSpeed;

      intervalRef.current = setInterval(() => {
        elapsed += 200;
        setProgress(Math.min((elapsed / estimated) * 100, 95));
      }, 200);
    };

    utterance.onend = () => {
      setPlaying(false);
      setProgress(100);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimeout(() => setProgress(0), 800);
    };

    utterance.onerror = () => {
      setPlaying(false);
      setProgress(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {supported && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          padding: "0.65rem 1rem",
          background: playing ? "#f0fdf4" : "#f8faff",
          border: `1px solid ${playing ? "#a7f3d0" : "#e0e7ff"}`,
          borderRadius: 10,
        }}>

          {/* Play button */}
          <button onClick={handlePlay} style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: playing
              ? "linear-gradient(135deg,#10b981,#34d399)"
              : "linear-gradient(135deg,#6366f1,#818cf8)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {playing ? "❚❚" : "▶"}
          </button>

          {/* Label + progress */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              marginBottom: "0.3rem",
              color: playing ? "#059669" : "#6366f1",
            }}>
              {variant === "chapter"
                ? (playing ? "Reading chapter..." : "Listen to this chapter")
                : (playing ? "Reading aloud..." : "Listen to this section")}
            </div>

            <div style={{
              height: 3,
              background: "#e5e7eb",
              borderRadius: 99,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                background: playing
                  ? "linear-gradient(90deg,#10b981,#34d399)"
                  : "linear-gradient(90deg,#6366f1,#818cf8)",
                width: `${progress}%`,
              }} />
            </div>
          </div>

          {/* Speed */}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {SPEEDS.map((s) => (
              <button
                key={s.value}
                onClick={() => handleSpeedChange(s.value)}
                style={{
                  padding: "0.2rem 0.45rem",
                  borderRadius: 6,
                  border: `1px solid ${speed === s.value ? "#6366f1" : "#e0e7ff"}`,
                  background: speed === s.value ? "#6366f1" : "transparent",
                  color: speed === s.value ? "#fff" : "#94a3b8",
                  fontSize: "0.65rem",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}