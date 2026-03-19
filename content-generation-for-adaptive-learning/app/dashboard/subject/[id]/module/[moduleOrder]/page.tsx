"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MarkdownRenderer from "@/app/components/MarkdownRenderer";

interface Chapter {
  title: string;
  content: string;
}

interface LearningProfile {
  visual: number;
  audio: number;
  text: number;
}

function parseChapters(markdown: string): Chapter[] {
  const lines = markdown.split("\n");
  const chapters: Chapter[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (/^#{2,3}\s+Chapter\s+\d+/i.test(line)) {
      if (currentTitle) {
        chapters.push({
          title: currentTitle,
          content: currentLines.join("\n").trim(),
        });
      }
      currentTitle = line.replace(/^#{2,3}\s+/, "").trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentTitle) {
    chapters.push({
      title: currentTitle,
      content: currentLines.join("\n").trim(),
    });
  }

  return chapters;
}

export default function ModulePage() {

  const params = useParams();
  const subjectId   = params?.id as string;
  const moduleOrder = params?.moduleOrder as string;

  const [chapters, setChapters]     = useState<Chapter[]>([]);
  const [profile, setProfile]       = useState<LearningProfile | null>(null);
  const [moduleId, setModuleId]     = useState<string | null>(null); // 🔥 NEW
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(
          `/api/dashboard/subjects/${subjectId}/module/${moduleOrder}`
        );

        if (!res.ok) {
          setError("Module content not found");
          setLoading(false);
          return;
        }

        const data = await res.json();

        setChapters(parseChapters(data.content));
        setProfile(data.learning_profile ?? null);
        setModuleId(data.module_id ?? null); // 🔥 NEW
        setLoading(false);

      } catch (err) {
        console.error(err);
        setError("Failed to load module");
        setLoading(false);
      }
    }

    if (subjectId && moduleOrder) fetchContent();
  }, [subjectId, moduleOrder]);

  if (loading) return <p className="p-6 text-slate-500">Loading module...</p>;
  if (error)   return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-slate-200 flex flex-col overflow-hidden bg-white">

        <div className="px-5 py-5 border-b border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Contents
          </p>
          <p className="text-sm text-slate-500">{chapters.length} chapters</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {chapters.map((chapter, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-150 flex items-start gap-3 border ${
                activeIndex === i
                  ? "bg-amber-50 border-amber-200"
                  : "border-transparent hover:bg-slate-50"
              }`}
            >
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                activeIndex === i ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {i + 1}
              </span>
              <span className={`text-sm leading-snug ${
                activeIndex === i ? "text-amber-900 font-medium" : "text-slate-600"
              }`}>
                {chapter.title}
              </span>
            </button>
          ))}
        </nav>

      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-[#FAFAF8]">
        {chapters[activeIndex] && (
          <div className="max-w-3xl mx-auto px-10 py-12">

            <div className="mb-8 pb-6 border-b border-slate-200">
              <span className="inline-block text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 mb-3">
                Chapter {activeIndex + 1}
              </span>
              <h1
                className="text-3xl font-bold text-slate-900 leading-tight tracking-tight"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                {chapters[activeIndex].title.replace(/^Chapter\s+\d+:\s*/i, "")}
              </h1>
            </div>

            <MarkdownRenderer
              content={chapters[activeIndex].content}
              profile={profile ?? { visual: 33, audio: 33, text: 34 }}
              moduleId={moduleId ?? ""} // 🔥 PASS moduleId
            />

            {/* Navigation */}
            <div className="mt-14 pt-8 border-t border-slate-200 flex justify-between">
              {activeIndex > 0 ? (
                <button
                  onClick={() => setActiveIndex(activeIndex - 1)}
                  className="text-sm text-slate-500 hover:text-slate-800"
                >
                  Previous
                </button>
              ) : <div />}

              {activeIndex < chapters.length - 1 && (
                <button
                  onClick={() => setActiveIndex(activeIndex + 1)}
                  className="text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-lg"
                >
                  Next Chapter
                </button>
              )}
            </div>

          </div>
        )}
      </main>

    </div>
  );
}