"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import MarkdownRenderer from "@/app/components/MarkdownRenderer";

interface Chapter {
  title: string;
  content: string;
}

function parseChapters(markdown: string): Chapter[] {
  const lines = markdown.split("\n");
  const chapters: Chapter[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (/^#{2,3}\s+Chapter\s+\d+/i.test(line)) {
      if (currentTitle) {
        chapters.push({ title: currentTitle, content: currentLines.join("\n").trim() });
      }
      currentTitle = line.replace(/^#{2,3}\s+/, "").trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentTitle) {
    chapters.push({ title: currentTitle, content: currentLines.join("\n").trim() });
  }

  return chapters;
}

export default function ModulePage() {
  const params = useParams();
  const subjectId = params.id as string;
  const moduleOrder = params.moduleOrder as string;
  const router = useRouter();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ── Chapter quiz state ── */
  const [quiz, setQuiz] = useState<any[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [completedChapterQuizzes, setCompletedChapterQuizzes] = useState<Set<number>>(new Set());

  /* ── Module quiz state ── */
  const [moduleQuiz, setModuleQuiz] = useState<any[]>([]);
  const [moduleQuizLoading, setModuleQuizLoading] = useState(false);
  const [moduleQuizAnswers, setModuleQuizAnswers] = useState<{ [key: number]: string }>({});
  const [moduleQuizScore, setModuleQuizScore] = useState<number | null>(null);
  const [moduleQuizTotal, setModuleQuizTotal] = useState<number | null>(null);
  const [moduleQuizResult, setModuleQuizResult] = useState<any>(null);
  const [showModuleQuiz, setShowModuleQuiz] = useState(false);
  const [moduleQuizAlreadyDone, setModuleQuizAlreadyDone] = useState(false);

  /* ── Next module state ── */
  const [nextModuleReady, setNextModuleReady] = useState(false);
  const [nextModuleIsLast, setNextModuleIsLast] = useState(false);
  const [nextModulePolling, setNextModulePolling] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Fetch module content ── */
  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(`/api/dashboard/subjects/${subjectId}/module/${moduleOrder}`);
        if (!res.ok) {
          setError("Module content not found");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setChapters(parseChapters(data.content));
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load module");
        setLoading(false);
      }
    }
    fetchContent();
  }, [subjectId, moduleOrder]);

  /* ── Load saved chapter progress ── */
  useEffect(() => {
    if (chapters.length === 0) return;
    async function fetchChapterProgress() {
      try {
        const res = await fetch(`/api/chapterQuiz?subjectId=${subjectId}&moduleOrder=${moduleOrder}`);
        if (res.status === 401) { router.push("/login"); return; }
        const data = await res.json();
        if (data.completed && data.completed.length > 0) {
          setCompletedChapterQuizzes(new Set<number>(data.completed.map((r: any) => r.chapter_index)));
        }
      } catch (err) {
        console.error("Failed to load chapter progress", err);
      }
    }
    fetchChapterProgress();
  }, [chapters, subjectId, moduleOrder]);

  /* ── Load saved module quiz progress ── */
  useEffect(() => {
    async function fetchModuleQuizProgress() {
      try {
        const res = await fetch(`/api/moduleQuiz?subjectId=${subjectId}&moduleOrder=${moduleOrder}`);
        if (res.status === 401) { router.push("/login"); return; }
        const data = await res.json();
        if (data.exists) {
          setModuleQuiz(data.mcqs || []);
          if (data.score != null && data.total != null) {
            setModuleQuizScore(data.score);
            setModuleQuizTotal(data.total);
            setModuleQuizAlreadyDone(true);
            setShowModuleQuiz(true);
            // Quiz already done — check if next module is ready
            checkNextModuleReady();
          }
        }
      } catch (err) {
        console.error("Failed to load module quiz progress", err);
      }
    }
    fetchModuleQuizProgress();
  }, [subjectId, moduleOrder]);

  /* ── Cleanup poll on unmount ── */
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  /* ── Check if next module content is ready ── */
  async function checkNextModuleReady() {
    const nextOrder = Number(moduleOrder) + 1;
    try {
      const res = await fetch(`/api/moduleReady?subjectId=${subjectId}&moduleOrder=${nextOrder}`);
      const data = await res.json();

      if (data.isLast) {
        setNextModuleIsLast(true);
        setNextModuleReady(false);
        return true; // stop polling
      }

      if (data.ready) {
        setNextModuleReady(true);
        setNextModulePolling(false);
        return true; // stop polling
      }

      return false; // keep polling
    } catch (err) {
      console.error("Next module check failed", err);
      return false;
    }
  }

  /* ── Start polling for next module ── */
  function startPollingNextModule() {
    setNextModulePolling(true);

    // Check immediately first
    checkNextModuleReady().then((done) => {
      if (done) return;

      // Then poll every 5 seconds
      pollIntervalRef.current = setInterval(async () => {
        const done = await checkNextModuleReady();
        if (done && pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }, 5000);
    });
  }

  /* ── Generate chapter quiz on chapter change ── */
  useEffect(() => {
    if (!chapters[activeIndex]) return;
    if (completedChapterQuizzes.has(activeIndex)) {
      setQuiz([]);
      setQuizLoading(false);
      return;
    }
    setQuiz([]);
    setQuizLoading(true);
    async function generateQuiz() {
      try {
        const res = await fetch("/api/generateQuiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapterTitle: chapters[activeIndex].title,
            chapterContent: chapters[activeIndex].content,
          }),
        });
        const data = await res.json();
        setQuiz(data.quiz || []);
      } catch (err) {
        console.error("Quiz generation failed", err);
      } finally {
        setQuizLoading(false);
      }
    }
    generateQuiz();
  }, [activeIndex, chapters, completedChapterQuizzes]);

  /* ── Derived state ── */
  const allChapterQuizzesDone =
    chapters.length > 0 && chapters.every((_, i) => completedChapterQuizzes.has(i));
  const isLastChapter = activeIndex === chapters.length - 1;
  const canGoNext = completedChapterQuizzes.has(activeIndex);

  /* ── Chapter quiz completion ── */
  async function handleChapterQuizComplete(score: number, total: number) {
    setCompletedChapterQuizzes((prev) => new Set([...prev, activeIndex]));
    try {
      const res = await fetch("/api/chapterQuiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          moduleOrder: Number(moduleOrder),
          chapterIndex: activeIndex,
          score,
          total,
        }),
      });
      if (res.status === 401) router.push("/login");
    } catch (err) {
      console.error("Failed to save chapter quiz score", err);
    }
  }

  /* ── Start module quiz ── */
  async function handleStartModuleQuiz() {
    setShowModuleQuiz(true);
    if (moduleQuiz.length > 0) return;
    setModuleQuizLoading(true);
    try {
      const res = await fetch("/api/moduleQuiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleTitle: `Module ${moduleOrder}`,
          topics: chapters.map((c) => c.title),
          profile: { visual: 40, audio: 20, text: 40 },
          subjectId,
          moduleOrder: Number(moduleOrder),
        }),
      });
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setModuleQuiz(data.mcqs || []);
      setModuleQuizAnswers({});
    } catch (err) {
      console.error("Module quiz fetch failed", err);
    } finally {
      setModuleQuizLoading(false);
    }
  }

  /* ── Submit module quiz ── */
  async function submitModuleQuiz() {
    let correct = 0;
    moduleQuiz.forEach((q: any, i: number) => {
      const correctOptionIndex = ["A", "B", "C", "D"].indexOf(q.answer);
      const correctOptionText = q.options[correctOptionIndex];
      if (moduleQuizAnswers[i] === correctOptionText) correct++;
    });
    setModuleQuizScore(correct);
    setModuleQuizTotal(moduleQuiz.length);

    try {
      const res = await fetch("/api/moduleQuiz/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          moduleOrder,
          score: correct,
          total: moduleQuiz.length,
          profile: { visual: 40, audio: 20, text: 40 },
          quiz: moduleQuiz,
        }),
      });
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setModuleQuizResult(data);
      setModuleQuizAlreadyDone(true);

      // ── Start polling for next module generation ──
      startPollingNextModule();
    } catch (err) {
      console.error("Score save failed", err);
    }
  }

  if (loading) return <p className="p-6 text-slate-500">Loading module...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-72 shrink-0 border-r border-slate-200 flex flex-col overflow-hidden bg-white">

        {/* Back buttons */}
        <div className="px-4 py-4 border-b border-slate-200 flex flex-col gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-3 py-2 rounded-lg transition-all w-full text-left"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </button>
          <button
            onClick={() => router.push(`/dashboard/subject/${subjectId}`)}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-3 py-2 rounded-lg transition-all w-full text-left"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Modules
          </button>
        </div>

        <div className="px-5 py-4 border-b border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contents</p>
          <p className="text-sm text-slate-500">{chapters.length} chapters</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {chapters.map((chapter, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-150 flex items-start gap-3 border ${
                activeIndex === i ? "bg-amber-50 border-amber-200" : "border-transparent hover:bg-slate-50"
              }`}
            >
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                completedChapterQuizzes.has(i)
                  ? "bg-green-400 text-white"
                  : activeIndex === i
                  ? "bg-amber-400 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {completedChapterQuizzes.has(i) ? "✓" : i + 1}
              </span>
              <span className={`text-sm leading-snug ${activeIndex === i ? "text-amber-900 font-medium" : "text-slate-600"}`}>
                {chapter.title}
              </span>
            </button>
          ))}

          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module Quiz</p>
            <div className={`px-3 py-2 text-sm rounded-lg ${
              moduleQuizAlreadyDone
                ? "text-green-700 font-medium bg-green-50"
                : allChapterQuizzesDone
                ? "text-amber-700 font-medium bg-amber-50"
                : "text-slate-400 italic"
            }`}>
              {moduleQuizAlreadyDone
                ? `✓ Completed — ${moduleQuizScore}/${moduleQuizTotal}`
                : allChapterQuizzesDone
                ? "🎯 Ready to attempt"
                : "Complete all chapters first"}
            </div>
          </div>
        </nav>

        <div className="px-5 py-4 border-t border-slate-200">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Progress</span>
            <span>
              {chapters.length > 0
                ? Math.round((completedChapterQuizzes.size / chapters.length) * 100)
                : 0}%
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{
                width: chapters.length > 0
                  ? `${(completedChapterQuizzes.size / chapters.length) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
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
              profile={{ visual: 40, audio: 20, text: 40 }}
              moduleId={String(moduleOrder)}
              quiz={quizLoading ? [] : quiz}
              onQuizComplete={handleChapterQuizComplete}
            />

            {completedChapterQuizzes.has(activeIndex) && (
              <div className="mt-10 rounded-2xl border border-green-200 bg-green-50 p-5 flex items-center gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">Quiz already completed</p>
                  <p className="text-xs text-green-600 mt-0.5">You've already passed this chapter's quiz. Continue to the next chapter.</p>
                </div>
              </div>
            )}

            {quizLoading && (
              <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-amber-700">Generating chapter quiz...</span>
              </div>
            )}

            <div className="mt-14 pt-8 border-t border-slate-200 flex justify-between items-center">
              {activeIndex > 0 ? (
                <button
                  onClick={() => setActiveIndex(activeIndex - 1)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
              ) : <div />}

              <div className="flex flex-col items-end gap-1">
                {isLastChapter && allChapterQuizzesDone && !showModuleQuiz && !moduleQuizAlreadyDone && (
                  <button
                    onClick={handleStartModuleQuiz}
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-purple-500 hover:bg-purple-600 px-5 py-2.5 rounded-lg transition-colors shadow-sm"
                  >
                    🎯 Take Module Quiz
                  </button>
                )}

                {isLastChapter && moduleQuizAlreadyDone && (
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                    ✓ Module Quiz Done — {moduleQuizScore}/{moduleQuizTotal}
                  </div>
                )}

                {!isLastChapter && (
                  <>
                    {!canGoNext && quiz.length > 0 && (
                      <span className="text-xs text-amber-600 font-medium">
                        Complete the quiz to continue
                      </span>
                    )}
                    <button
                      onClick={() => canGoNext && setActiveIndex(activeIndex + 1)}
                      disabled={!canGoNext && quiz.length > 0}
                      className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                        canGoNext || quiz.length === 0
                          ? "text-white bg-amber-500 hover:bg-amber-600"
                          : "text-slate-400 bg-slate-100 cursor-not-allowed"
                      }`}
                    >
                      Next Chapter
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Module Quiz ── */}
        {showModuleQuiz && (
          <div className="max-w-3xl mx-auto px-10 py-12 border-t border-slate-200">
            <div className="mb-8">
              <span className="inline-block text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 mb-3">
                Module Quiz
              </span>
              <h2
                className="text-2xl font-bold text-slate-900"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                Module {moduleOrder} Retention Quiz
              </h2>
              <p className="text-sm text-slate-500 mt-1">Tests your understanding across all chapters</p>
            </div>

            {moduleQuizLoading ? (
              <div className="flex items-center gap-3 py-8">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-500">Generating module quiz...</span>
              </div>
            ) : moduleQuizScore === null ? (
              <div>
                {moduleQuiz.map((q: any, i: number) => (
                  <div key={i} className="mb-6">
                    <p className="font-medium text-slate-800 mb-3">{i + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt: string, j: number) => (
                        <label
                          key={j}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                            moduleQuizAnswers[i] === opt
                              ? "border-amber-400 bg-amber-50 text-amber-900 font-medium"
                              : "border-slate-200 bg-white text-slate-700 hover:border-amber-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`mq${i}`}
                            value={opt}
                            checked={moduleQuizAnswers[i] === opt}
                            onChange={() => setModuleQuizAnswers({ ...moduleQuizAnswers, [i]: opt })}
                            className="accent-amber-500"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  className={`mt-6 w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                    Object.keys(moduleQuizAnswers).length === moduleQuiz.length
                      ? "bg-purple-500 hover:bg-purple-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                  onClick={submitModuleQuiz}
                  disabled={Object.keys(moduleQuizAnswers).length !== moduleQuiz.length}
                >
                  {Object.keys(moduleQuizAnswers).length === moduleQuiz.length
                    ? "Submit Module Quiz"
                    : `Answer all ${moduleQuiz.length} questions to submit`}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between px-6 py-4 bg-white rounded-2xl border border-slate-200 mb-8">
                  <div>
                    <p className="text-sm text-slate-500">Your score</p>
                    <p className="text-3xl font-bold text-purple-600 mt-0.5">
                      {moduleQuizScore} / {moduleQuizTotal ?? moduleQuiz.length}
                    </p>
                    <p className="text-sm text-slate-400">
                      {Math.round((moduleQuizScore / (moduleQuizTotal ?? moduleQuiz.length)) * 100)}% correct
                    </p>
                  </div>
                  {moduleQuizResult?.newProfile && (
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Updated Profile</p>
                      <p className="text-xs text-slate-600">Visual {moduleQuizResult.newProfile.visual}%</p>
                      <p className="text-xs text-slate-600">Audio {moduleQuizResult.newProfile.audio}%</p>
                      <p className="text-xs text-slate-600">Text {moduleQuizResult.newProfile.text}%</p>
                    </div>
                  )}
                </div>

                {Object.keys(moduleQuizAnswers).length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-slate-700 mb-4">Answer Review</p>
                    {moduleQuiz.map((q: any, i: number) => {
                      const correctOptionIndex = ["A", "B", "C", "D"].indexOf(q.answer);
                      const correctOptionText = q.options[correctOptionIndex];
                      const userAnswer = moduleQuizAnswers[i];
                      const isCorrect = userAnswer === correctOptionText;
                      return (
                        <div key={i} className={`mb-4 p-4 rounded-xl border ${isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                          <p className="text-sm font-medium text-slate-800 mb-2">{i + 1}. {q.question}</p>
                          <p className="text-xs text-slate-500">
                            Your answer: <span className={`font-semibold ${isCorrect ? "text-green-700" : "text-red-600"}`}>{userAnswer}</span>
                          </p>
                          {!isCorrect && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Correct answer: <span className="font-semibold text-green-700">{correctOptionText}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {Object.keys(moduleQuizAnswers).length === 0 && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
                    You completed this quiz in a previous session.
                  </div>
                )}

                {/* ── Next module button — shown only when ready ── */}
                <div className="mt-6">
                  {nextModuleIsLast ? (
                    // No more modules — course complete
                    <div className="w-full py-4 bg-green-50 border border-green-200 rounded-xl text-center">
                      <p className="text-sm font-semibold text-green-700">🎉 You've completed all modules!</p>
                      <button
                        className="mt-2 text-xs text-green-600 underline"
                        onClick={() => router.push(`/dashboard/subject/${subjectId}`)}
                      >
                        Return to subject overview
                      </button>
                    </div>
                  ) : nextModuleReady ? (
                    // Next module is ready — show button
                    <button
                      className="w-full py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors"
                      onClick={() => router.push(`/dashboard/subject/${subjectId}/module/${Number(moduleOrder) + 1}`)}
                    >
                      Go to Next Module →
                    </button>
                  ) : nextModulePolling ? (
                    // Still generating — show spinner
                    <div className="w-full py-3 bg-slate-100 rounded-xl flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-slate-500">Preparing next module...</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}