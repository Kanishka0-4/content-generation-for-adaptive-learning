"use client";
import { useRouter } from "next/navigation";
export default function QuizStart() {
  const router = useRouter();
  const subjectId = typeof window !== "undefined" ? localStorage.getItem("selected_subject_id") : null;

     return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-blue-100 via-blue-50 to-white flex flex-col items-center justify-start pt-36 px-4 overflow-hidden">

      {/* Top Wave */}
      <div className="absolute top-0 left-0 right-0 -z-10">
        <svg viewBox="0 0 1440 320" className="w-full opacity-40">
          <path
            fill="#93c5fd"
            d="M0,192L80,186.7C160,181,320,171,480,170.7C640,171,800,181,960,181.3C1120,181,1280,171,1360,165.3L1440,160L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"
          ></path>
        </svg>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0 -z-10 rotate-180">
        <svg viewBox="0 0 1440 320" className="w-full opacity-30">
          <path
            fill="#bfdbfe"
            d="M0,192L80,186.7C160,181,320,171,480,170.7C640,171,800,181,960,181.3C1120,181,1280,171,1360,165.3L1440,160L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"
          ></path>
        </svg>
      </div>

      <div className="text-center max-w-2xl w-full animate-fadeIn">
        <h1 className="text-5xl font-light text-blue-700 mb-6">
          You're almost there!
        </h1>

        <p className="text-gray-700 text-lg leading-relaxed mb-20">
          To help us better understand your learning style,  
          please take this short quiz and unlock personalized learning.
        </p>

        <button
          onClick={() => router.push("/quiz/take")}
          className="w-full py-4 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-200"
        >
          Start the Quiz
        </button>
      </div>

      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.9s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(25px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
