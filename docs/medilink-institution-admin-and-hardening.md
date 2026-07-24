# MediLink Institution Admin Lifecycle & P0 Hardening Pass

Branch: `feature/patient-registration-and-pagination`

A running audit-and-fix pass, done incrementally: a full institution-admin-lifecycle capability for the Super Admin (see/fix/add admins, suspend/reactivate an institution with real enforcement), plus a batch of P0-priority fixes surfaced by a whole-app review — two real security gaps, a way to correct or remove a mistaken medical record, and notifications that no longer hard-cap at 50.

## What changed, at a glance

| Area                                 | Before                                                                                       | After                                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Institution admin visibility          | Super Admin's institution page showed only a member count — no way to see who the admin(s) are | New **Admins** tab lists every admin with email and a Confirmed/Pending badge                                                       |
| Fixing a typo'd admin email           | No recovery path — a wrong address at set-up meant the account was stuck forever               | Super Admin edits the email; the account resets to pending and a fresh invite goes to the corrected address                        |
| Adding an institution admin           | Only ever created once, at institution creation                                                | Super Admin can add another admin any time (`POST /institutions/:id/admins`); an existing Institution Admin can also add one via `/users` |
| Deactivating the last admin           | Allowed — would lock the whole institution out                                                 | Blocked with a clear error once it's the last active admin                                                                          |
| Institution status (Approve/Reject)   | Cosmetic — changed a label, nothing else checked it                                             | Enforced at login: a non-ACTIVE institution's users can't request or use a magic link; **Suspend/Reactivate** added alongside Approve/Reject |
| Institution-admin invite email        | Sent at institution **creation** — a dead link if clicked before approval                       | Sent at **approval** time instead, the first point the account is actually usable                                                  |
| Invitation link expiry                | Email said "7 days," the token actually died in 15 minutes                                       | Invitations really last 7 days now; sign-in links are unchanged at 15 minutes                                                       |
| Magic-link request abuse              | No rate limit — repeatedly requesting a link for someone else's email kept invalidating theirs  | Capped at 5 requests per email per 15 minutes                                                                                       |
| New-user creation                     | Only the invitee was told a user was created                                                    | Other active admins in the institution also get a heads-up email                                                                    |
| Wrong medical record data             | Permanent — no way to correct or remove a mistaken entry                                        | An assigned professional can edit any field, or soft-delete the record entirely                                                     |
| Notifications list                    | Hard-capped at the 50 most recent, nothing older reachable                                       | Fully paginated, same pattern as the Users/Institutions/Patients lists                                                              |
| Viewing yourself in the Users list    | Clicking your own status badge opened a confirm dialog that always failed server-side           | Your own row shows a "You" tag; Edit and the status toggle are disabled with a tooltip instead                                      |
| Email branding                        | All three email templates said "Bootcamp Starter," sent from `no-reply@bootcamp-starter.local`  | Sign-in, invitation, and new-user emails all say "MediLink," sent from `no-reply@medilink.local`, each closing with a "— MediLink" signature |

## Design decisions worth knowing

### Institution admin lifecycle (Super Admin side)

- `GET /institutions/:id` now also returns `admins: [{ id, fullName, email, isActive, isConfirmed }]` — but **only** on this Super-Admin-only endpoint. `findMine` (the "My Institution" page every other role uses) deliberately omits it: Staff/Professional/Patient have no business seeing another admin's email, so `admins` is optional in the shared `InstitutionDetailResponse` contract and simply isn't populated for them.
- Editing an admin's email (`PATCH /institutions/:id/admins/:adminId/email`) resets `isConfirmed` to `false` and sends a brand-new invitation — treated the same as a fresh invite, since the typical case is the original one never reached anyone.
- Adding an admin (`POST /institutions/:id/admins`) works on any institution regardless of status, matching how the founding admin is created — the point is to always have a recovery path even for an institution that's still `PENDING`.
- Institution Admins gained the same "add another admin" capability through the existing Users page (`POST /users`, role now includes `INSTITUTION_ADMIN`). This is the one change that made a `setStatus` self-check on `UsersService` (previously unreachable dead code, since admins weren't managed through that endpoint at all) actually live — you cannot deactivate your own account there, and separately, you cannot deactivate the **last** active admin of an institution at all (`ForbiddenException` with a specific message, not a generic failure).

### Institution status is now actually enforced

- `AuthGuard`, `requestMagicLink`, and `verifyMagicLink` all now check the caller's institution status and reject anything other than `ACTIVE` — covering `SUSPENDED` (new), `REJECTED`, and never-approved `PENDING` alike. Before this, Approve/Reject only ever changed a status label; nothing downstream ever looked at it.
- **Suspend**/**Reactivate** actions were added alongside the existing Approve/Reject, so a Super Admin now has a real lever to cut off a problem institution instead of just a cosmetic one.
- Enforcement lives in `SessionService.validateSession`, which now joins the caller's institution status onto the session lookup (`SessionUser` type) so the guard doesn't need a second query per request.
- The institution's admin invite email moved from `create()` to `approve()` as a direct consequence: since a `PENDING` institution can't log in anyway, sending the invite at creation just handed out a broken link. `approve()` now looks up every current admin (not just "the" admin — an institution could have gained a second one before ever being approved) and best-effort invites each.

### Auth hardening

- **Invitation expiry bug**: `createMagicLinkToken` is shared by sign-in links (15 minutes) and invitations, but always used the 15-minute expiry — despite the invitation email text promising 7 days. Fixed by giving the shared minting function an optional expiry parameter; `sendInvitation` now passes 7 days explicitly.
- **Magic-link rate limiting**: `requestMagicLink` had no limit on how often it could be called, and every call invalidates whatever link the target email currently has outstanding. That's a zero-auth way to repeatedly lock out someone whose email you know — request a link for their address right after they do, and theirs dies before they can click it. Fixed with a Redis-backed counter keyed by **email** (not IP — the request already reveals the target, so per-email is what actually bounds the specific attack described): 5 requests per 15-minute window, then a clear "please wait" error instead of silently proceeding. This doesn't fully solve the underlying problem (an attacker can still burn through a victim's own quota, since email alone can't distinguish who's asking), but it turns an indefinite lockout into a bounded 15-minute one.

### Medical record correction

- Originally scoped as a "void with a required reason" feature (new `voidReason`/`voidedAt`/`voidedById` columns, a correction record kept visible but flagged) — reverted in favor of a simpler edit + delete, per direct steer to stop overengineering it for what this app needs.
- **Edit** (`PATCH /records/:id`) reuses the exact same request shape as record creation; the record type itself is locked (a different type is a new record, not an edit). The frontend's `AddRecordDialog` was refactored so its per-type field blocks are shared with a new `EditRecordDialog`, instead of duplicating ~350 lines of form markup.
- **Delete** (`DELETE /records/:id`) is a **soft** delete — it flips the `isVoid` column that already existed in the schema (previously defined but never set by anything). Every read path (list, detail, edit, file upload/download) already filters `isVoid: false`, so a deleted record simply disappears everywhere without a migration, and stays recoverable directly in the database if that's ever needed. No files are touched on disk.
- Both are restricted to an assigned professional — a patient can still view their own records but not edit or delete them.

### Notifications pagination

- `findForUser` took a hard `MAX_NOTIFICATIONS = 50` cap with no way to see anything older. Replaced with the same shared `paginationQuerySchema`/`page`/`limit` pattern already used by Users, Institutions, and Patients — new `notificationListQuerySchema` contract, `skip`/`take` in the query, `<Pagination>` wired into the page.
- The navbar bell's unread-count badge is unaffected — it only reads `unreadCount`, which comes from a separate, unpaginated `count` query.

### Self-row UX in Users list

- Clicking your own status badge previously opened a working-looking confirm dialog that always failed with a forbidden error once submitted (the self-deactivation guard was already enforced server-side, just not reflected in the UI). Fixed by tagging your own row "You" and rendering a disabled Edit button and a plain, non-interactive status badge instead — both with a tooltip pointing to `/profile` for self-management.

### Email branding

- `mail.processor.ts`'s three templates (sign-in link, invitation, new-user admin heads-up) and `mail.service.ts`'s fallback `from` address all still said "Bootcamp Starter" / `no-reply@bootcamp-starter.local` — leftover placeholder branding from the starter template, never updated when the domain was remodeled to MediLink. All three now say "MediLink," send from `no-reply@medilink.local`, and close with a "— MediLink" signature. Copy tweaks alongside the rename: the sign-in email's unused-link line now reassures the reader their account is still secure, and the invitation subject spells out "on MediLink" instead of just the institution name.
- Scoped to the email content only — the `bootcamp_starter_session` cookie name and the `bootcamp_starter` Postgres database name (`docker-compose.yml`, `.env.example`) are internal plumbing a user never sees, so they were deliberately left alone.

## QA steps

1. As Super Admin, open an institution's **Admins** tab — confirm you see every admin with email and a Confirmed/Pending badge (this was the one that previously showed "No admins found" incorrectly — if it still does after a full restart/rebuild, that's a real regression, not a stale-build artifact).
2. Edit an admin's email — confirm it resets to Pending and a new invite appears in Mailpit at the corrected address; the old address can no longer request a link.
3. Add a new admin from the same tab — confirm it appears as Pending and gets an invite.
4. Try deactivating admins one by one from `/users` down to the last one — confirm the last one is blocked with a specific error, not a generic failure.
5. Suspend an ACTIVE institution — confirm a user from that institution is blocked from requesting *or* using a magic link, with a clear message. Reactivate — confirm they can log in again.
6. Create a fresh institution, approve it — confirm the invite email arrives only at approval, not at creation.
7. Create any user while a second Institution Admin exists — confirm that second admin gets a "New \_\_\_ added" email, but the admin who did the creating does not.
8. Check an invitation email in Mailpit — confirm it still works well after 15 minutes (the old bug: dead by then despite the email promising 7 days).
9. Rapidly request magic links for the same email 6+ times in under 15 minutes — confirm the 6th+ attempts are rejected with a rate-limit message.
10. As an assigned professional, edit a medical record's type-specific fields (e.g. a lab value) — confirm the correction shows immediately; try deleting a record — confirm it disappears from the patient's timeline and can no longer be opened directly, without erroring.
11. On `/notifications`, confirm pagination controls appear once you have more than one page's worth, and that the unread navbar badge stays accurate regardless of which page you're on.
12. On `/users`, confirm your own row has a "You" tag and both actions are inert with a tooltip, while every other row works normally.
13. In Mailpit, check all three email types (sign-in link, invitation, new-user heads-up) — confirm each says "MediLink," not "Bootcamp Starter," and is sent from `no-reply@medilink.local`.

## Still missing / follow-up

Explicitly deferred from the same audit pass, not fixed here:

- Deactivating a professional doesn't cascade to their active care-team assignments — they still show as "active" on a patient's care team, and access is silently restored if reactivated. Left as-is by direct decision.
- File uploads on medical records trust the client-supplied MIME type only, no content sniffing. Left as-is by direct decision.
- No de-duplication check on patient registration (`nationalId` isn't unique). Skipped for now.
- Notifications still don't deep-link to the patient/record they're about — clicking one only marks it read. Skipped for now.
- Email uniqueness is still global, not per-institution — a cross-institution email collision gets the same generic conflict error as a same-institution one. Not yet started.
- `reactivate()` on a **REJECTED** institution doesn't re-invite its admin, unlike `approve()` — a rejected institution's admin never got an invite in the first place (reject happens instead of approve), so reactivating one today still leaves them without a way in. Low-likelihood path, not fixed.
