# Auth Operations

## Supabase Redirect URLs

In Supabase, configure these allowed redirect URLs before enabling production auth:

```text
http://localhost:3000/auth/callback
https://<web-origin>/auth/callback
brilhio://auth/callback
```

Mirror the deployed values in API environment as:

```text
SUPABASE_AUTH_REDIRECT_URLS=https://<web-origin>/auth/callback,brilhio://auth/callback
EXPO_PUBLIC_MOBILE_AUTH_CALLBACK_URL=brilhio://auth/callback
```

The API readiness check requires the web `/auth/callback` and mobile `brilhio://auth/callback` entries to be present in `SUPABASE_AUTH_REDIRECT_URLS`.

## Google OAuth

Enable Google in the Supabase Auth provider dashboard and add the Google OAuth client id and secret there. The web sign-in and join buttons already call Supabase with `redirectTo` pointing at `/auth/callback`; Supabase must be configured to allow that URL.

## Mobile Password Reset

Mobile reset emails use `EXPO_PUBLIC_MOBILE_AUTH_CALLBACK_URL`. The app handles `brilhio://auth/callback`, exchanges the recovery code or token hash with Supabase, and presents a native password update form.
