"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decodeAuthToken } from "@/lib/auth";

export default async function HomePage() {

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value ?? null;

  const userId = decodeAuthToken(token);

  if (!userId) redirect("/login");

  const result = await db.query(
    "SELECT quiz_completed FROM users WHERE id = $1",
    [userId]
  );

  const user = result.rows[0];

  if (!user?.quiz_completed) {
    redirect("/quiz/welcome");
  }

  redirect("/dashboard");
}