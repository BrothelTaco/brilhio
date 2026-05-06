import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { DEV_AUTH_COOKIE } from "../../lib/dev-auth";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("signedOut", "1");
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete(DEV_AUTH_COOKIE);
  return response;
}
