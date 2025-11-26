import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { signToken } from "@/lib/auth";
import { cookies } from "next/headers"; // ✅ correct import

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // ✅ Only insert once, and return inserted user
    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hashedPassword]
    );

    const user = result.rows[0];

    // ✅ Generate JWT token
    const token = signToken({ id: user.id, email: user.email });

    // ✅ Create response first
    const response = NextResponse.json({ success: true, user });

    // ✅ Then attach cookie to the response
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // works for localhost + deploy
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
