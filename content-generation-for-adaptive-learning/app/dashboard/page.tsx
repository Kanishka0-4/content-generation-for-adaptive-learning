"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Subject = {
  id: number;
  title: string;
  exam: string | null;
  total_duration: string | null;
  progress: number;
};

export default function DashboardPage() {

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  /* ---------------- LOGOUT ---------------- */

  const handleLogout = async () => {

    try {

      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      // clear any stored quiz/session info
      localStorage.clear();

      router.push("/login");

    } catch (err) {
      console.error("Logout failed:", err);
    }

  };

  /* ---------------- FETCH SUBJECTS ---------------- */

  useEffect(() => {

    async function fetchSubjects() {

      try {

        const res = await fetch("/api/dashboard/subjects", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch subjects");
        }

        const data = await res.json();

        setSubjects(data);

      } catch (err) {

        console.error("Dashboard fetch error:", err);

      } finally {

        setLoading(false);

      }

    }

    fetchSubjects();

  }, []);

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return <p className="p-6">Loading dashboard...</p>;
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">

        {/* HEADER */}

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">

          <div>
            <h1 className="text-4xl font-semibold text-gray-900">
              Your Study Dashboard
            </h1>

            <p className="text-gray-600 mt-1">
              Manage your subjects and track your learning progress.
            </p>
          </div>

          <div className="flex gap-3">

            <button
              onClick={() => router.push("/roadmap")}
              className="bg-black text-white px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90"
            >
              + Generate New Roadmap
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-red-600 transition"
            >
              Logout
            </button>

          </div>

        </header>

        {/* EMPTY STATE */}

        {subjects.length === 0 && (

          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No subjects yet
            </h2>

            <p className="text-gray-600 mb-6">
              Start by generating your first study roadmap using the AI planner.
            </p>

            <button
              onClick={() => router.push("/roadmap")}
              className="bg-black text-white px-6 py-3 rounded-lg text-sm font-medium"
            >
              Generate Roadmap
            </button>

          </div>

        )}

        {/* SUBJECT LIST */}

        {subjects.length > 0 && (

          <section className="space-y-6">

            <h2 className="text-xl font-semibold text-gray-900">
              Your Subjects
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {subjects.map((subj) => (

                <div
                  key={subj.id}
                  onClick={() =>
                    router.push(`/dashboard/subject/${subj.id}`)
                  }
                  className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:shadow-md transition"
                >

                  <div className="flex justify-between items-start mb-2">

                    <h3 className="text-lg font-semibold text-gray-900">
                      {subj.title}
                    </h3>

                    <span className="text-sm text-blue-600">
                      Open →
                    </span>

                  </div>

                  <div className="text-sm text-gray-500 space-y-1">

                    {subj.exam && (
                      <p>Exam: {subj.exam}</p>
                    )}

                    {subj.total_duration && (
                      <p>Duration: {subj.total_duration}</p>
                    )}

                  </div>

                  <div className="mt-5">

                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{subj.progress}%</span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">

                      <div
                        className="bg-black h-2 rounded-full"
                        style={{ width: `${subj.progress}%` }}
                      />

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </section>

        )}

      </div>

    </div>
  );
}