import { NextResponse } from "next/server";
import {
  DEV_AUTH_COOKIE,
  getDevLoginCredentials,
  isDevAuthEnabled,
} from "../../../lib/dev-auth";

export async function POST(request: Request) {
  if (!isDevAuthEnabled()) {
    return NextResponse.json({ error: "Development login is disabled." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const credentials = getDevLoginCredentials();

  if (
    email !== credentials.email.toLowerCase() ||
    password !== credentials.password
  ) {
    return NextResponse.json({ error: "Invalid development login." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEV_AUTH_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
