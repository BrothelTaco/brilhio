import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

function safeAppPath(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value : "";
  return text.startsWith("/") ? text : "";
}

function nextFromRedirectTo(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return "";

  try {
    const redirectUrl = new URL(value);
    return safeAppPath(redirectUrl.searchParams.get("next"));
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");
  const next =
    safeAppPath(formData.get("next")) ||
    nextFromRedirectTo(formData.get("redirect_to")) ||
    "/billing";

  if (typeof tokenHash === "string" && typeof type === "string") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url), { status: 303 });
    }
  }

  const fallbackUrl = new URL("/", request.url);
  fallbackUrl.searchParams.set("reason", "auth-callback-failed");
  return NextResponse.redirect(fallbackUrl, { status: 303 });
}
