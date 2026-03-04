"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/* ---------------- TYPES ---------------- */

type Module = {
  module_order: number;
  title: string;
  goal: string;
  topics: string[];
};

type Subject = {
  id: number;
  title: string;
  exam: string | null;
  total_duration: string | null;
};

/* ---------------- PAGE ---------------- */

export default function SubjectLandingPage() {
  const params = useParams();
  const router = useRouter();

  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : null;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------------- FETCH DATA ---------------- */

  useEffect(() => {
    if (!id) {
      setError("Invalid subject id");
      setLoading(false);
      return;
    }

    async function fetchSubject() {
      try {
        const res = await fetch(`/api/dashboard/subjects/${id}`);

        if (!res.ok) {
          const text = await res.text();
          console.error("❌ API ERROR", res.status, text);
          setError(`API error ${res.status}`);
          return;
        }

        const data = await res.json();
        setSubject(data.subject);
        setModules(data.modules || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load subject");
      } finally {
        setLoading(false);
      }
    }

    fetchSubject();
  }, [id]);

  /* ---------------- STATES ---------------- */

  if (loading) {
    return <p className="p-6">Loading subject...</p>;
  }

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  if (!subject) {
    return <p className="p-6 text-red-600">Subject not found</p>;
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* SUBJECT HEADER */}
      <div>
        <h1 className="text-3xl font-bold">{subject.title}</h1>
        <p className="text-gray-600 mt-1">
          {subject.exam && `Exam: ${subject.exam} • `}
          {subject.total_duration}
        </p>
      </div>

      {/* ACTION BAR */}
      <div className="flex flex-wrap gap-4">
        <button
          className="px-4 py-2 border rounded hover:bg-gray-100"
          onClick={() =>
            router.push(`/dashboard/subject/${id}/roadmap`)
          }
        >
          🗺 Roadmap
        </button>

        <button
          className="px-4 py-2 border rounded hover:bg-gray-100"
          onClick={() =>
            router.push(`/dashboard/subject/${id}/chat`)
          }
        >
          💬 Chat / History
        </button>

        <button
          className="px-4 py-2 border rounded cursor-not-allowed opacity-60"
          disabled
        >
          📊 Progress (coming soon)
        </button>
      </div>

      {/* MODULES GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {modules.map((mod) => (
          <div
            key={mod.module_order}
            className="relative group cursor-pointer"
            onClick={() =>
              router.push(
                `/dashboard/subject/${id}/module/${mod.module_order}`
              )
            }
          >
            {/* BASE CARD */}
            <div
              className="
                bg-white border border-gray-200 rounded-xl
                shadow-sm
                h-36
                flex flex-col items-center justify-center
                p-4
                transition-opacity duration-200
                group-hover:opacity-0
              "
            >
              <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-semibold mb-3">
                {mod.module_order}
              </div>

              <h3 className="text-sm font-semibold text-center text-gray-900">
                {mod.title}
              </h3>
            </div>

            {/* HOVER OVERLAY (does not affect grid) */}
            <div
              className="
                absolute inset-0 z-10
                bg-white border border-gray-200 rounded-xl
                shadow-lg
                p-4
                opacity-0
                pointer-events-auto
                group-hover:opacity-100
                transition-opacity duration-200
                flex flex-col
              "
            >
              <h4 className="text-sm font-semibold text-gray-800 mb-2">
                Topics covered
              </h4>

              <ul className="text-xs text-gray-600 space-y-1 overflow-y-auto">
                {mod.topics.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
