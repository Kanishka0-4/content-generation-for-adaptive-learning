"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WelcomeQuizPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/get-subjects");
        const data = await res.json();
        setSubjects(data.subjects || []);
      } catch (e) {
        setError("Failed to load subjects");
      }
    }
    load();
  }, []);

  async function handleContinue() {
    if (!selected) return alert("Please choose a subject");

    const subjectObj = subjects.find((s) => s.id === selected);
    if (!subjectObj) return alert("Invalid subject");

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/subtopics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subjectObj.id,
          subject_name: subjectObj.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      // optionally store selected subject id for next steps (localStorage or server)
      localStorage.setItem("selected_subject_id", subjectObj.id);

      // go to quiz start page
      router.push("/quiz/start");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-blue-100 via-blue-50 to-white flex flex-col items-center justify-start pt-24 px-4">
      <div className="text-center max-w-xl w-full">
        <h1 className="text-5xl font-light text-blue-700 mb-4 text-center">
          Hello there!
        </h1>
        <p className="text-gray-700 text-lg mb-16 text-center">
          Choose a subject to begin your personalized learning journey.
        </p>

        {error && <div className="text-red-600 mb-6 font-medium">{error}</div>}

        <select
          className="w-full p-4 mb-8 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">-- Select a subject --</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleContinue}
          disabled={loading}
          className={`w-full py-4 rounded-lg text-white font-medium transition ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Preparing…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
