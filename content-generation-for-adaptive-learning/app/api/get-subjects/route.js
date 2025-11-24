// app/api/get-subjects/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query(
      "SELECT id, name FROM subjects ORDER BY name ASC"
    );
    return NextResponse.json({ subjects: result.rows });
  } catch (err) {
    console.error("GET /api/get-subjects error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
