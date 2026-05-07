# Auth Operations

## Supabase Redirect URLs

In Supabase, configure these allowed redirect URLs before enabling production auth:

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/confirm
https://<web-origin>/auth/callback
https://<web-origin>/auth/confirm
brilhio://auth/callback
```

Mirror the deployed values in API environment as:

```text
SUPABASE_AUTH_REDIRECT_URLS=https://<web-origin>/auth/callback,brilhio://auth/callback
EXPO_PUBLIC_MOBILE_AUTH_CALLBACK_URL=brilhio://auth/callback
```

The API readiness check requires the web `/auth/callback` and mobile `brilhio://auth/callback` entries to be present in `SUPABASE_AUTH_REDIRECT_URLS`.

## Email Confirmation Template

Use a token-hash confirmation link instead of Supabase's default `{{ .ConfirmationURL }}` link. Some email providers and security products prefetch one-time links; when that happens, Supabase consumes the token before the user clicks it and redirects back with `error_code=otp_expired`.

In Supabase Dashboard, open **Authentication -> Email -> Templates -> Confirm signup** and set the confirmation button/link URL to:

```html
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}
```

The `/auth/confirm` page intentionally requires a human button click before it calls `verifyOtp`, so link prefetching does not consume the token.

## App Data Ownership

Supabase Auth owns identity. Brilhio app data starts at `profiles`, which is auto-created from `auth.users` by the database trigger in `20260428000000_profiles.sql`.

Product tables are shared tables keyed by `user_id`, not one table per user. Browser/mobile clients can read their own rows through RLS, but meaningful writes should go through the API so `REQUIRE_SUBSCRIPTION=true` can gate the whole product consistently. The service role bypasses RLS for those API-owned writes.

Stripe is the payment source of truth. Signup may create an auth user and profile before payment is complete; until Stripe webhooks update `profiles.subscription_status` to an active status, paid product routes should redirect to billing or return payment-required responses.

## Mobile Password Reset

Mobile reset emails use `EXPO_PUBLIC_MOBILE_AUTH_CALLBACK_URL`. The app handles `brilhio://auth/callback`, exchanges the recovery code or token hash with Supabase, and presents a native password update form.
