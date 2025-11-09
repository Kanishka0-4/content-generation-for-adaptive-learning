import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { signToken } from "@/lib/auth";
import { cookies } from "next/headers"; // still needed for reading if needed

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({ id: user.id, email: user.email });

    // ✅ Create response *first*
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email }
    });

    // ✅ Then set cookie on response
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response; // ✅ Return modified response
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
