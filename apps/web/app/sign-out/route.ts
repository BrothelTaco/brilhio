import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("signedOut", "1");
  return NextResponse.redirect(redirectUrl);
}
