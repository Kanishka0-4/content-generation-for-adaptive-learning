"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  Target,
  BookOpen,
  TrendingUp,
} from "lucide-react";

/* ---------------- TYPES ---------------- */

type RoadmapWeek = {
  week: string;
  focus_topics: string[];
  subtopics: string[];
  expected_outcome: string;
};

export default function RoadmapPage() {
  const { id } = useParams(); // ✅ CORRECT SOURCE OF ID

  const [roadmap, setRoadmap] = useState<RoadmapWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [completedWeeks, setCompletedWeeks] = useState<Set<number>>(new Set());

  /* ---------------- FETCH ROADMAP ---------------- */

  useEffect(() => {
    if (!id || typeof id !== "string") return; // ✅ HARD GUARD

    async function fetchRoadmap() {
      try {
        const res = await fetch(`/api/roadmap/get?id=${id}`);
        const data = await res.json();

        if (!res.ok || !Array.isArray(data)) {
          setError(data?.error || "Failed to load roadmap");
          return;
        }

        setRoadmap(data);
      } catch (err) {
        console.error(err);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchRoadmap();
  }, [id]);

  /* ---------------- HELPERS ---------------- */

  const toggleWeek = (index: number) => {
    const next = new Set(expandedWeeks);
    next.has(index) ? next.delete(index) : next.add(index);
    setExpandedWeeks(next);
  };

  const toggleComplete = (index: number) => {
    const next = new Set(completedWeeks);
    next.has(index) ? next.delete(index) : next.add(index);
    setCompletedWeeks(next);
  };

  const progressPercentage =
    roadmap.length > 0
      ? (completedWeeks.size / roadmap.length) * 100
      : 0;

  /* ---------------- STATES ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your roadmap...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
          <div className="text-red-500 text-5xl mb-4 text-center">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
            Error Loading Roadmap
          </h2>
          <p className="text-red-600 text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Your Learning Roadmap
          </h1>
        </div>
        <p className="text-gray-600 text-lg">
          Follow this structured path to master your subject step by step
        </p>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Overall Progress</span>
          </div>
          <span className="text-2xl font-bold text-blue-600">
            {Math.round(progressPercentage)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="mt-3 text-sm text-gray-600">
          {completedWeeks.size} of {roadmap.length} weeks completed
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-blue-200" />

        <div className="space-y-6">
          {roadmap.map((week, index) => {
            const isExpanded = expandedWeeks.has(index);
            const isCompleted = completedWeeks.has(index);

            return (
              <div key={index} className="relative flex gap-6 group">
                
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0">
                  <button
                    onClick={() => toggleComplete(index)}
                    className="w-12 h-12 rounded-full bg-white border-4 border-gray-100 shadow-sm flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md"
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-7 h-7 text-green-500" />
                    ) : (
                      <Circle className="w-7 h-7 text-gray-300" />
                    )}
                  </button>
                </div>

                {/* Content card */}
                <div className="flex-1">
                  <div
                    className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all duration-200 ${
                      isCompleted
                        ? "border-green-200 bg-green-50/30"
                        : "border-gray-100 hover:border-blue-200 hover:shadow-md"
                    }`}
                  >
                    {/* Header */}
                    <button
                      onClick={() => toggleWeek(index)}
                      className="w-full px-6 py-5 flex items-start justify-between text-left"
                    >
                      <div className="flex-1">
                        {/* Week / module pill */}
                        <span
                          className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 ${
                            isCompleted
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {week.week}
                        </span>

                        {/* Outcome visible when collapsed */}
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Learning outcome</h4>
                        {!isExpanded && (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {week.expected_outcome}
                          </p>
                        )}
                      </div>

                      <div className="ml-4 mt-1">
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-5 border-t border-gray-100 space-y-5">
                        
                        {/* Focus Topics */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Focus Areas
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {week.focus_topics.map((topic, i) => (
                              <span
                                key={i}
                                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Subtopics */}
                        {week.subtopics.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Key Concepts
                            </h4>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <ul className="space-y-1.5 text-sm text-gray-700">
                                {week.subtopics.map((subtopic, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-blue-500 mt-0.5">•</span>
                                    <span>{subtopic}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Outcome (expanded) */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Learning Outcome
                          </h4>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {week.expected_outcome}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion message */}
      {completedWeeks.size === roadmap.length && roadmap.length > 0 && (
        <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Congratulations!
          </h3>
          <p className="text-gray-700">
            You've completed the entire roadmap. Keep practicing and building projects!
          </p>
        </div>
      )}
    </div>
  </div>
);
}