import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { hasActiveSubscriptionStatus } from "@brilhio/contracts";
import { type NextRequest, NextResponse } from "next/server";
import { DEV_AUTH_COOKIE, isDevAuthEnabled } from "./lib/dev-auth";

const PROTECTED_PATHS = ["/schedule", "/dashboard", "/account", "/accounts", "/onboarding", "/content", "/strategy", "/billing"] as const;
const BILLING_EXEMPT_PATHS = ["/billing"] as const;
const ONBOARDING_EXEMPT_PATHS = ["/billing", "/onboarding", "/account"] as const;

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function routeRequiresAuth(pathname: string) {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function routeRequiresSubscription(pathname: string) {
  if (process.env.REQUIRE_SUBSCRIPTION !== "true") return false;
  return (
    routeRequiresAuth(pathname) &&
    !BILLING_EXEMPT_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  );
}

export async function middleware(request: NextRequest) {
  if (!routeRequiresAuth(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (
    isDevAuthEnabled() &&
    process.env.REQUIRE_SUBSCRIPTION !== "true" &&
    request.cookies.get(DEV_AUTH_COOKIE)?.value === "1"
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("reason", "auth-required");
    return NextResponse.redirect(redirectUrl);
  }

  const needsProfileCheck =
    routeRequiresSubscription(request.nextUrl.pathname) ||
    routeRequiresAuth(request.nextUrl.pathname);

  if (needsProfileCheck) {
    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_status, onboarding_completed_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.search = "";
      redirectUrl.searchParams.set("reason", "profile-check-failed");
      return NextResponse.redirect(redirectUrl);
    }

    if (routeRequiresSubscription(request.nextUrl.pathname)) {
      const hasAccess = hasActiveSubscriptionStatus(data?.subscription_status);
      if (!hasAccess) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/billing";
        redirectUrl.search = "";
        redirectUrl.searchParams.set("reason", "subscription-required");
        return NextResponse.redirect(redirectUrl);
      }
    }

    const pathname = request.nextUrl.pathname;
    const onboardingCompleted = Boolean(data?.onboarding_completed_at);
    const isOnboardingPath = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
    const isOnboardingExempt = ONBOARDING_EXEMPT_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

    if (isOnboardingPath && onboardingCompleted) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/schedule";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (!isOnboardingPath && !isOnboardingExempt && !onboardingCompleted) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/onboarding";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/schedule/:path*",
    "/dashboard/:path*",
    "/content/:path*",
    "/strategy/:path*",
    "/account/:path*",
    "/accounts/:path*",
    "/onboarding/:path*",
    "/billing/:path*",
  ],
};
