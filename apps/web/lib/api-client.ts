"use client";

import { createClient } from "./supabase/client";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);

  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  } else if (process.env.NEXT_PUBLIC_BRILHIO_DEV_USER_ID) {
    headers.set("x-brilhio-dev-user-id", process.env.NEXT_PUBLIC_BRILHIO_DEV_USER_ID);
    if (process.env.NEXT_PUBLIC_BRILHIO_DEV_USER_EMAIL) {
      headers.set("x-brilhio-dev-user-email", process.env.NEXT_PUBLIC_BRILHIO_DEV_USER_EMAIL);
    }
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
}
