"use client";

import { useState } from "react";

/* ---------------- TYPES ---------------- */

type RoadmapWeek = {
  week: string;
  focus_topics: string[];
  subtopics: string[];
  expected_outcome: string;
};

/* ---------------- COMPONENT ---------------- */

export default function RoadmapGeneratorPage() {
  const [input, setInput] = useState("");
  const [roadmap, setRoadmap] = useState<RoadmapWeek[]>([]);
  const [subjectTitle, setSubjectTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  /* -------- Generate Roadmap -------- */

  async function generateRoadmap() {
    if (!input.trim()) return;

    setLoading(true);
    setError("");
    setSaved(false);
    setRoadmap([]);

    try {
      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to generate roadmap");
        return;
      }

      if (!data?.roadmap || !Array.isArray(data.roadmap)) {
        setError("Unexpected response from server");
        return;
      }

      setSubjectTitle(data.subjectTitle || "");

      const normalized: RoadmapWeek[] = data.roadmap.map(
        (w: any, i: number) => ({
          week: typeof w.week === "string" ? w.week : `Week ${i + 1}`,

          focus_topics: Array.isArray(w.focus_topics)
            ? w.focus_topics
            : typeof w.focus_topics === "string"
            ? [w.focus_topics]
            : [],

          subtopics: Array.isArray(w.subtopics)
            ? w.subtopics
            : typeof w.subtopics === "string"
            ? [w.subtopics]
            : [],

          expected_outcome:
            typeof w.expected_outcome === "string"
              ? w.expected_outcome
              : "",
        })
      );

      setRoadmap(normalized);
    } catch (err) {
      console.error(err);
      setError("Network or server error");
    } finally {
      setLoading(false);
    }
  }

  /* -------- Save Roadmap -------- */

  async function saveRoadmap() {
    if (roadmap.length === 0) return;

    try {
      const res = await fetch("/api/roadmap/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmap,
          subjectTitle: subjectTitle || input,
          duration: `${roadmap.length} weeks`,
          exam: null
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to save roadmap");
        return;
      }

      setSaved(true);

    } catch (err) {
      console.error(err);
      setError("Failed to save roadmap");
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-semibold">
            Study Roadmap Generator
          </h1>
          <p className="text-gray-600 mt-2">
            Describe what you want to study and get a structured roadmap.
          </p>
        </header>

        {/* Input */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What do you want to study?
          </label>

          <textarea
            className="w-full border border-gray-300 rounded-lg p-4 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-black"
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Computer Networks in 8 weeks"
          />

          <div className="mt-4">
            <button
              onClick={generateRoadmap}
              disabled={loading || !input.trim()}
              className="bg-black text-white px-6 py-2.5 rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Roadmap"}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Roadmap */}
        {roadmap.length > 0 && (
          <section className="mt-10">

            {subjectTitle && (
              <p className="text-sm text-gray-500 mb-4">
                Subject detected:{" "}
                <span className="font-medium">{subjectTitle}</span>
              </p>
            )}

            <h2 className="text-xl font-semibold mb-6">
              Generated Roadmap
            </h2>

            <div className="relative">

              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-300" />

              <div className="space-y-10">
                {roadmap.map((week, index) => (
                  <div key={index} className="relative flex gap-6">

                    <div className="relative z-10">
                      <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                    </div>

                    <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6">

                      <div className="mb-4">
                        <h3 className="text-lg font-semibold">
                          {week.week}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Module {index + 1}
                        </p>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">
                          Focus Topics
                        </h4>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                          {week.focus_topics.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>

                      {week.subtopics.length > 0 && (
                        <details className="mb-4">
                          <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                            View Subtopics
                          </summary>
                          <ul className="mt-2 list-disc list-inside text-sm text-gray-700 space-y-1">
                            {week.subtopics.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </details>
                      )}

                      {week.expected_outcome && (
                        <div className="border-t border-gray-200 pt-3">
                          <h4 className="text-sm font-semibold mb-1">
                            Expected Outcome
                          </h4>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {week.expected_outcome}
                          </p>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!saved && (
              <button
                onClick={saveRoadmap}
                className="mt-8 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-lg text-sm"
              >
                Save Roadmap
              </button>
            )}

            {saved && (
              <div className="mt-6 flex items-center gap-4">
                <p className="text-green-700 font-medium">
                  ✅ Roadmap saved successfully
                </p>

                <button
                  onClick={() => (window.location.href = "/dashboard")}
                  className="bg-black text-white px-5 py-2 rounded-lg text-sm hover:opacity-90"
                >
                  Go to Dashboard
                </button>
              </div>
            )}

          </section>
        )}
      </div>
    </div>
  );
}