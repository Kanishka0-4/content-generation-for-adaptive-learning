export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import Link from "next/link";


export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  // If token is valid → redirect to dashboard
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET as string);
      return <meta httpEquiv="refresh" content="0; url=/dashboard" />;
    } catch {}
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-600 to-purple-800 text-white text-center px-6">
      <h1 className="text-5xl font-extrabold mb-4">
        LIME <span className="text-yellow-300">(Learn In My Element)</span>
      </h1>
      <p className="text-lg max-w-2xl mb-8">
        An AI-driven adaptive learning platform that personalizes education
        according to your most efficient learning style.
      </p>

      <div className="flex gap-6">
        <Link
          href="/signup"
          className="bg-yellow-400 text-indigo-800 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 transition"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="border border-white font-semibold px-6 py-3 rounded-lg hover:bg-white hover:text-indigo-800 transition"
        >
          Login
        </Link>
      </div>

      <footer className="absolute bottom-6 text-sm text-gray-200">
        © {new Date().getFullYear()} LIME — Adaptive Learning Platform
      </footer>
    </main>
  );
}
