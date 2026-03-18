import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcrypt";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // ✅ Domain restriction
    const allowedDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
    ];

    const domain = email.split("@")[1].toLowerCase();

    if (!allowedDomains.includes(domain)) {
      return NextResponse.json(
        {
          error:
            "Please use a valid email provider (Gmail, Yahoo, Outlook, etc.)",
        },
        { status: 400 },
      );
    }

    const existing = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
      [name, email, hashedPassword],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
