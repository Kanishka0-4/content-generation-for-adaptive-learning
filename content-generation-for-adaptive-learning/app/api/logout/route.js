import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  cookies().set({
    name: "auth_token",
    value: "",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ success: true });
}
