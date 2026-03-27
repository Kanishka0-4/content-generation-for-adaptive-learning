import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    // Get user id from query or JWT cookie
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      const token = req.cookies.get("auth_token")?.value;
      if (token) {
        try {
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
          id = decoded.id;
        } catch (jwtErr) {
          return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
      }
    }
    if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    const result = await pool.query("SELECT learning_profile FROM users WHERE id = $1", [id]);
    if (!result.rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ profile: result.rows[0].learning_profile });
  } catch (err: unknown) {
    let message = "";
    if (err instanceof Error) message = err.message;
    else message = String(err);
    return NextResponse.json({ error: "Failed to fetch profile", details: message }, { status: 500 });
  }
}