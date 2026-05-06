import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/schedule";
  const redirectUrl = new URL(next.startsWith("/") ? next : "/schedule", requestUrl.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  const fallbackUrl = new URL("/", requestUrl.origin);
  fallbackUrl.searchParams.set("reason", "auth-callback-failed");
  return NextResponse.redirect(fallbackUrl);
}
