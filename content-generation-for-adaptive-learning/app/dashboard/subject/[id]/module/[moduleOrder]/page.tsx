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
  const [moduleId, setModuleId]     = useState<string | null>(null);
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
        setModuleId(data.module_id ?? null);
        setLoading(false);

      } catch (err) {
        console.error(err);
        setError("Failed to load module");
        setLoading(false);
      }
    }

    if (subjectId && moduleOrder) fetchContent();
  }, [subjectId, moduleOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading module...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
          <div className="text-red-500 text-5xl mb-4 text-center">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Error</h2>
          <p className="text-red-600 text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50/30 to-amber-50/50 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-orange-200/50 flex flex-col overflow-hidden bg-white shadow-sm">

        <div className="px-5 py-5 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">
            Contents
          </p>
          <p className="text-sm text-gray-600 font-medium">{chapters.length} chapters</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {chapters.map((chapter, i) => {
            const colorIndex = i % 10;
            const bgColor = activeIndex === i ? orangePalette[colorIndex] : 'transparent';
            const textColor = activeIndex === i ? '#fff' : '#6b7280';
            
            return (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                style={{
                  backgroundColor: bgColor,
                  transition: 'all 0.2s ease'
                }}
                className={`w-full text-left px-3 py-3 rounded-xl flex items-start gap-3 border ${
                  activeIndex === i
                    ? "border-transparent shadow-md transform scale-[1.02]"
                    : "border-transparent hover:bg-orange-50/50"
                }`}
              >
                <span 
                  style={{
                    backgroundColor: activeIndex === i ? 'rgba(255,255,255,0.3)' : '#f3f4f6',
                    color: activeIndex === i ? '#fff' : '#9ca3af'
                  }}
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                >
                  {i + 1}
                </span>
                <span 
                  style={{ color: textColor }}
                  className={`text-sm leading-snug ${
                    activeIndex === i ? "font-semibold" : "font-medium"
                  }`}
                >
                  {chapter.title}
                </span>
              </button>
            );
          })}
        </nav>

      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-[#FEFDFB]">
        {chapters[activeIndex] && (
          <div className="max-w-3xl mx-auto px-10 py-12">

            <div className="mb-8 pb-6 border-b border-orange-100">
              <span 
                style={{ backgroundColor: orangePalette[activeIndex % 10] }}
                className="inline-block text-xs font-bold text-white px-3 py-1.5 rounded-full shadow-sm mb-3"
              >
                Chapter {activeIndex + 1}
              </span>
              <h1
                className="text-3xl font-bold text-gray-900 leading-tight tracking-tight"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                {chapters[activeIndex].title.replace(/^Chapter\s+\d+:\s*/i, "")}
              </h1>
            </div>

            <MarkdownRenderer
              content={chapters[activeIndex].content}
              profile={profile ?? { visual: 33, audio: 33, text: 34 }}
              moduleId={moduleId ?? ""}
            />
              
            {/* Navigation */}
            <div className="mt-14 pt-8 border-t border-orange-100 flex justify-between items-center">
              {activeIndex > 0 ? (
                <button
                  onClick={() => setActiveIndex(activeIndex - 1)}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-orange-50 transition-all"
                >
                  ← Previous
                </button>
              ) : <div />}

              {activeIndex < chapters.length - 1 && (
                <button
                  onClick={() => setActiveIndex(activeIndex + 1)}
                  style={{ backgroundColor: orangePalette[activeIndex % 10] }}
                  className="text-sm font-bold text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  Next Chapter →
                </button>
              )}
            </div>

          </div>
        )}
      </main>

    </div>
  );
}

const orangePalette = [
  "#ff7b00", "#ff8800", "#ff9500", "#ffa200", "#ffaa00",
  "#ffb700", "#ffc300", "#ffd000", "#ffdd00", "#ffea00"
];