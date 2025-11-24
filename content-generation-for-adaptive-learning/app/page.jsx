"use server";
import { redirect } from "next/navigation";
// Importing: Read cookies directly in the Server Component context
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decodeAuthToken } from "@/lib/auth";

export default async function HomePage() {
  // --- FINAL ROBUST FIX FOR COOKIE ACCESS ---
  // We call cookies() and then explicitly use .get() for maximum compatibility.
  

  // Check if the cookie exists and grab its value safely
 const token = cookies().get?.("auth_token")?.value ?? null;

  

  // 2. Decode the token to get the user ID
  const userId = decodeAuthToken(token);

  if (userId) {
    // --- AUTHENTICATED USER LOGIC ---
    try {
      // 1. Fetch user data from the database
      const result = await db.query(
        "SELECT quiz_completed, learning_style FROM users WHERE id = $1",
        [userId]
      );

      const user = result.rows.length > 0 ? result.rows[0] : null;

      // 2. CHECK QUIZ STATUS: If logged in but quiz is NOT completed, redirect
      if (user && user.quiz_completed === false) {
        redirect("/quiz/welcome");
      }

      // 3. RENDER DASHBOARD: If quiz IS completed, show the main content
      return (
        <main className="p-8 bg-gray-50 min-h-screen">
          <div className="max-w-4xl mx-auto p-6 bg-blue-50 rounded-xl shadow-lg border border-blue-200">
            <h1 className="text-4xl font-extrabold text-blue-800 mb-4">
              Welcome to your Personalized Learning Dashboard!
            </h1>
            <p className="text-lg text-blue-600 mb-6">
              Your quiz is complete, and your learning style has been
              determined. Access your personalized content below.
            </p>

            <div className="p-4 bg-white border border-blue-300 rounded-lg shadow-inner">
              <p className="text-xl font-semibold text-gray-700">
                Current Learning Style:
                <span className="ml-2 font-bold text-blue-700">
                  {user?.learning_style || "Loading..."}
                </span>
              </p>
              <p className="mt-3 text-gray-500">
                This section will soon contain tailored educational materials
                based on your style.
              </p>
            </div>
          </div>
        </main>
      );
    } catch (error) {
      console.error("Database query error on root page:", error);
      redirect("/login");
    }
  } else {
    // --- UNAUTHENTICATED USER LOGIC ---
    redirect("/login");
  }
}



