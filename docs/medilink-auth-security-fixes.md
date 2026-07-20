# MediLink Auth Fixes

Branch: `medilink-login-theme-redesign`

Two changes to the passwordless magic-link auth flow: a deliberate security
tradeoff (email enumeration, chosen knowingly), and a genuine bug where
accepting an invitation while already logged in as someone else silently
failed to switch accounts.

## What changed, at a glance

| Area | Before | After |
| --- | --- | --- |
| Requesting a magic link for an unregistered email | Always returned success (anti-enumeration: never reveals whether an email exists) | Returns a 404 "No account found with this email address" |
| Accepting an invite/magic link while already authenticated in the same browser | Middleware redirected straight to `/dashboard` **before** the token was ever verified — the old session silently stayed active | `/auth/verify` always runs and correctly switches to the new session, regardless of any existing session cookie |

## Design decisions worth knowing

### Email enumeration — a deliberate, flagged tradeoff

- `AuthService.requestMagicLink` previously found no user → logged a warning → returned `{ success: true }` anyway, specifically to prevent an attacker (or a nosy user) from probing which emails are registered by watching for a different response.
- This was changed to throw `NotFoundException('No account found with this email address')` **after explicitly flagging the tradeoff and getting confirmation** that showing the error was wanted over the safer default. Anyone can now check whether a given email is registered by testing the login form. If that stops being acceptable, the fix is to revert to the silent-success branch, not to add complexity on top of the current behavior.

### Invite-link login bug (critical)

- **Symptom**: an Institution Admin creates a Staff/Professional/Patient user, the invitation email goes out, but clicking the magic link (most commonly, an admin testing their own invite in the same browser they're already logged into) logs the browser in as **the admin**, not the new user.
- **Root cause**: `apps/web/proxy.ts` (the Next.js middleware) listed `/auth/verify` in `publicRoutes` (routes that don't require authentication) and then had a rule: "if a public route is visited by an already-authenticated visitor, redirect them to `/dashboard`." That rule fired for `/auth/verify` too — so if the browser already held *any* valid session cookie, the middleware redirected away **before the verify page's client-side code ever ran the token-verification API call**. The token was never consumed, no new session was created, and the browser just kept whatever session it already had.
- The backend side (`AuthService.verifyMagicLink`, `SessionService.createSession`, the cookie-setting in `AuthController`) was already correct — the token correctly resolves to the invited user's id and a new session cookie correctly overwrites the old one. The bug was entirely in the middleware short-circuiting the page before that code path ever ran.
- **Fix**: split the "public routes" concept into two lists — `publicRoutes` (routes that don't require authentication, used for the *unauthenticated → redirect to `/login`* check) and a smaller `authRedirectRoutes` (routes that should bounce an *already-authenticated* visitor away — just `/login`). `/auth/verify` is deliberately excluded from the second list: it must always be allowed to run, because it's the mechanism for switching sessions, which is a completely valid thing to do even while already logged in as someone else.

## QA steps

1. Try logging in with an email that isn't registered — confirm you get an explicit "No account found" error (toast), not a silent "check your email" success.
2. Try logging in with a registered email — confirm the normal "Check your email" flow still works.
3. **The critical one**: as Institution Admin, create a new Staff or Professional user. Open the invitation email in Mailpit **in the same browser tab/window** where you're still logged in as the admin. Click the link — confirm you land logged in as the **new user** (correct name/role in the sidebar), not the admin.
4. Log out fully, then use a fresh invite link with no prior session in that browser — confirm normal invite acceptance still works.
5. Confirm `/login` still redirects an already-authenticated user to `/dashboard` if they navigate to it directly (that part of the middleware behavior is intentionally unchanged).

## Still missing / follow-up

- No automated test covers the middleware's redirect logic — this bug shipped and went unnoticed for a while precisely because it required a specific manual scenario (already-authenticated browser + invite link) to surface. Worth a lightweight middleware test if this codebase ever adds one.
