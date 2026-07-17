# Member Management CRUD and Invitation Flow Test Plan

## Scope

This plan verifies the member management CRUD and invitation features:

- Active member listing
- Create member without login
- Edit member username and role
- Delete member
- Pending invitation listing
- Invite member by email
- Resend invitation
- Cancel invitation
- Accept invitation from email link
- Tenant isolation and role-based access
- Event behavior after member role changes

## Prerequisites

Start from a clean, migrated local environment.

```bash
npm run services:init
npm install
npx turbo run db:generate
npx turbo run db:deploy
npx turbo run db:seed
npm run dev
```

Expected local services:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Mailpit: `http://localhost:8025`
- Postgres: `localhost:5433`
- Redis: `localhost:6380`

Seeded accounts:

- Super admin: `admin@bootcamp-starter.local`
- TechCorp org admin: `admin@techcorp.example.com`
- TechCorp member: `member@techcorp.example.com`

Sign in through `http://localhost:3000/login`, then open the newest magic-link email in Mailpit.

## Pre-Flight Verification

Run the quality gates before manual testing:

```bash
npx turbo run check-types
npx turbo run lint
npm run format:check
```

Expected result: all commands pass.

Also verify the migration exists:

```bash
dir packages\database\prisma\migrations
```

Expected result: a migration named similar to `*_add_member_invitations` is present.

## Role Access Matrix

| User            | Expected `/members` Access | Notes                                                                   |
| --------------- | -------------------------- | ----------------------------------------------------------------------- |
| `SUPER_ADMIN`   | Allowed                    | Can view members across orgs and must select org when creating/inviting |
| `ORG_ADMIN`     | Allowed                    | Scoped to their own organization                                        |
| auth `MEMBER`   | Denied                     | Should see access denied page                                           |
| Unauthenticated | Redirected                 | Should redirect to `/login`                                             |

## Manual UI Tests

### 1. Org Admin Can Open Member Management

1. Sign in as `admin@techcorp.example.com`.
2. Go to `http://localhost:3000/members`.

Expected:

- Page loads without errors.
- Active Members table is visible.
- Pending Invitations section is visible.
- Create and Invite buttons are visible.
- Organization selector is not shown in create/invite dialogs.

### 2. Super Admin Can Open Member Management

1. Sign in as `admin@bootcamp-starter.local`.
2. Go to `http://localhost:3000/members`.
3. Open Create dialog.
4. Open Invite dialog.

Expected:

- Page loads without errors.
- Active Members table may show members across organizations.
- Create and Invite dialogs include an Organization selector.
- Organization selector lists active organizations.

### 3. Auth Member Cannot Manage Members

1. Sign in as `member@techcorp.example.com`.
2. Go to `http://localhost:3000/members`.

Expected:

- Access denied page is shown.
- Member table and mutation buttons are not shown.

### 4. Create Presenter Member Without Login

1. Sign in as TechCorp org admin.
2. Open Members.
3. Click Create.
4. Enter username: `manual-presenter-1`.
5. Select role: `Presenter`.
6. Submit.

Expected:

- Success toast appears.
- Dialog closes.
- New member appears in Active Members.
- Email column shows `No login`.
- Role badge shows `Presenter`.

### 5. Create Admin Member Without Login

1. Click Create.
2. Enter username: `manual-admin-1`.
3. Select role: `Admin`.
4. Submit.

Expected:

- Success toast appears.
- New member appears.
- Role badge shows `Admin`.
- Email column shows `No login`.

### 6. Duplicate Username Is Blocked

1. Click Create.
2. Enter username: `manual-presenter-1`.
3. Select any role.
4. Submit.

Expected:

- Error toast appears.
- No duplicate row is added.
- API should return a conflict-style error.

### 7. Edit Member Username

1. Find `manual-presenter-1`.
2. Click edit.
3. Change username to `manual-presenter-1-renamed`.
4. Save.

Expected:

- Success toast appears.
- Table updates with the new username.
- Role remains unchanged.

### 8. Edit Member Role

1. Find `manual-presenter-1-renamed`.
2. Click edit.
3. Change role to `Admin`.
4. Save.

Expected:

- Success toast appears.
- Role badge changes to `Admin`.

### 9. Delete Member

1. Find `manual-admin-1`.
2. Click delete.
3. Confirm browser confirmation.

Expected:

- Success toast appears.
- Member disappears from Active Members.
- Refreshing the page does not bring the member back.

### 10. Cancel Delete

1. Find any member.
2. Click delete.
3. Cancel browser confirmation.

Expected:

- No API request should complete.
- Member remains in table.
- No success toast appears.

## Invitation Flow Tests

Use unique emails for each run, for example:

- `invite-presenter-001@example.com`
- `invite-admin-001@example.com`
- `invite-cancel-001@example.com`

### 11. Invite Presenter

1. Sign in as TechCorp org admin.
2. Open Members.
3. Click Invite.
4. Enter email: `invite-presenter-001@example.com`.
5. Enter username: `invite-presenter-001`.
6. Select role: `Presenter`.
7. Submit.

Expected:

- Success toast appears.
- Invitation appears in Pending Invitations.
- Mailpit receives an invitation email.
- Active Members does not contain `invite-presenter-001` yet.

### 12. Invite Admin Domain Member

1. Click Invite.
2. Enter email: `invite-admin-001@example.com`.
3. Enter username: `invite-admin-001`.
4. Select role: `Admin`.
5. Submit.

Expected:

- Success toast appears.
- Invitation appears in Pending Invitations with role `Admin`.
- Mailpit receives an invitation email.

Important expected behavior after acceptance:

- The auth user role should be `MEMBER`.
- The Coordly member role should be `ADMIN`.
- This user should not become auth `ORG_ADMIN`.

### 13. Duplicate Pending Invite Email Is Blocked

1. Click Invite.
2. Enter email: `invite-presenter-001@example.com`.
3. Enter username: `some-other-username`.
4. Submit.

Expected:

- Error toast appears.
- No second pending invite is created.

### 14. Duplicate Pending Invite Username Is Blocked

1. Click Invite.
2. Enter email: `some-other-email@example.com`.
3. Enter username: `invite-presenter-001`.
4. Submit.

Expected:

- Error toast appears.
- No second pending invite is created.

### 15. Resend Invitation

1. In Pending Invitations, find `invite-presenter-001@example.com`.
2. Click resend.
3. Open Mailpit.

Expected:

- Success toast appears.
- A new invitation email is delivered.
- The old invitation link should no longer be usable if token rotation is enforced.
- The newest invitation link should remain usable.

### 16. Cancel Invitation

1. Invite `invite-cancel-001@example.com` with username `invite-cancel-001`.
2. Confirm it appears in Pending Invitations.
3. Click cancel.
4. Confirm browser confirmation.

Expected:

- Success toast appears.
- Invitation disappears from Pending Invitations.
- Invitation link from Mailpit cannot be accepted.

### 17. Accept Presenter Invitation

1. Open the newest invitation email for `invite-presenter-001@example.com` in Mailpit.
2. Click the invitation link.

Expected:

- Browser opens `/invite/accept?token=...`.
- Acceptance page shows loading, then success.
- User is redirected to `/dashboard`.
- User is authenticated.
- Sidebar should show member-level navigation, not org-admin navigation.
- `/members` should show access denied for this invited user.

Then sign back in as TechCorp org admin and verify:

- `invite-presenter-001` appears in Active Members.
- Email column shows `invite-presenter-001@example.com`.
- The invitation no longer appears in Pending Invitations.

### 18. Accept Admin Domain Member Invitation

1. Open the newest invitation email for `invite-admin-001@example.com`.
2. Click the invitation link.
3. After redirect, inspect navigation.

Expected:

- User is signed in.
- User does not get `/members` access.
- User is auth `MEMBER`, not auth `ORG_ADMIN`.
- Their member role is `ADMIN`, so event attendee registration rules should treat them as a Coordly admin member.

### 19. Accept Same Invitation Twice

1. Copy an invitation link.
2. Open it once and accept it.
3. Open the same link again in a fresh/private browser session.

Expected:

- First acceptance succeeds.
- Second acceptance fails with an already accepted or invalid invitation error.
- No duplicate user is created.
- No duplicate member is created.

### 20. Missing or Invalid Token

Open:

- `http://localhost:3000/invite/accept`
- `http://localhost:3000/invite/accept?token=bad-token`

Expected:

- Missing token shows a clear error.
- Bad token shows an error.
- No session is created.

## Existing User Invite Tests

### 21. Invite Existing Unassigned User

If you have or create a user with no `organizationId`, invite that email.

Expected:

- Invite can be sent.
- Accepting the invite assigns the user to the inviting organization.
- A linked `Member` row is created.

### 22. Invite User Already In Same Organization But Not Linked To Member

If a user belongs to the same organization and has no linked `Member` row:

Expected:

- Invite can be sent.
- Accepting creates the linked `Member` row.
- User keeps their existing auth role unless product rules say otherwise.

### 23. Invite User Already Linked To A Member

Try inviting an email for a user already linked through `Member.userId`.

Expected:

- Invite is blocked.
- No pending invitation is created.

### 24. Invite User In Another Organization

Try inviting a user whose `organizationId` belongs to a different org.

Expected:

- Invite is blocked.
- Error explains the user already belongs to another organization.

### 25. Invite Super Admin

Try inviting `admin@bootcamp-starter.local`.

Expected:

- Invite is blocked.
- Super admin is not converted or linked as a member.

## Tenant Isolation Tests

These are critical.

### 26. Org Admin Cannot See Another Org's Members

1. Sign in as TechCorp org admin.
2. Open `/members`.

Expected:

- Only TechCorp members are visible.
- No members from Green Energy or other organizations appear.

### 27. Org Admin Cannot Use `organizationId` Query To Access Another Org

Use an API client while signed in as TechCorp org admin:

```http
GET http://localhost:3001/members?organizationId=<another-org-id>
```

Expected:

- Request is rejected with forbidden access.

Repeat for:

```http
GET http://localhost:3001/members/invitations?organizationId=<another-org-id>
```

Expected:

- Request is rejected.

### 28. Org Admin Cannot Update Another Org's Member

Use an API client with a member ID from another org:

```http
PATCH http://localhost:3001/members/<other-org-member-id>
Content-Type: application/json

{
  "username": "cross-tenant-edit"
}
```

Expected:

- Request returns not found or forbidden.
- Other org's member is unchanged.

### 29. Org Admin Cannot Delete Another Org's Member

Use an API client:

```http
DELETE http://localhost:3001/members/<other-org-member-id>
```

Expected:

- Request returns not found or forbidden.
- Other org's member remains.

### 30. Org Admin Cannot Resend Or Cancel Another Org's Invitation

Use another org's invitation ID:

```http
POST http://localhost:3001/members/invitations/<id>/resend
DELETE http://localhost:3001/members/invitations/<id>
```

Expected:

- Request returns not found or forbidden.
- Invitation remains unchanged.

## Super Admin Tests

### 31. Super Admin Must Select Organization For Create

1. Sign in as super admin.
2. Open Create dialog.
3. Enter username and role but do not select organization.
4. Submit.

Expected:

- Request fails with `organizationId is required`.
- No member is created.

### 32. Super Admin Must Select Organization For Invite

1. Open Invite dialog as super admin.
2. Fill email, username, role but do not select organization.
3. Submit.

Expected:

- Request fails with `organizationId is required`.
- No invitation is created.

### 33. Super Admin Creates Member In Selected Org

1. Open Create dialog.
2. Select TechCorp.
3. Create username `super-created-techcorp-member`.

Expected:

- Member appears.
- Organization ID corresponds to selected org.

### 34. Super Admin Invites Member To Selected Org

1. Open Invite dialog.
2. Select TechCorp.
3. Invite `super-invite-techcorp@example.com`.

Expected:

- Invitation appears.
- Email is sent.
- Accepting link creates member in TechCorp.

## Event Rule Regression Tests

### 35. Created Presenter Can Be Used As Event Presenter

If create/edit event UI exists later, verify presenter members are selectable as presenters. If only seed/API paths exist, verify event detail still displays presenter names normally after member CRUD changes.

Expected:

- Existing event pages load.
- Existing presenters still appear.
- Deleting a presenter sets event presenter to null or equivalent safe display, not a crash.

### 36. Invited Presenter Cannot Register For Own Hosted Event

If an invited presenter is assigned as an event presenter:

Expected:

- They can manage attendance for hosted event where existing logic allows.
- They cannot register as attendee for their own hosted event.

### 37. MemberRole.ADMIN Cannot Register As Attendee

1. Accept an invitation with role `Admin`.
2. Sign in as that invited user.
3. Open an upcoming event.

Expected:

- Event registration is unavailable or blocked.
- User is still not auth `ORG_ADMIN`.

### 38. Regular Invited Presenter Can Register For Other Events

1. Accept presenter invitation.
2. Open an upcoming event they are not hosting.

Expected:

- Registration is allowed when the event is in their organization.
- Duplicate registration is still prevented.

## API Contract Tests

Use an API client with cookies from a valid signed-in browser session.

### 39. Create Member Request Validation

Invalid payloads:

```json
{}
```

```json
{ "username": "", "role": "PRESENTER" }
```

```json
{ "username": "valid", "role": "MEMBER" }
```

Expected:

- Requests fail validation.
- No member is created.

### 40. Update Member Request Validation

Invalid payloads:

```json
{}
```

```json
{ "role": "ORG_ADMIN" }
```

Expected:

- Requests fail validation.
- Member is unchanged.

### 41. Invite Request Validation

Invalid payloads:

```json
{ "email": "not-an-email", "username": "bad", "role": "PRESENTER" }
```

```json
{ "email": "valid@example.com", "username": "", "role": "PRESENTER" }
```

```json
{ "email": "valid@example.com", "username": "valid", "role": "SUPER_ADMIN" }
```

Expected:

- Requests fail validation.
- No invitation is created.

### 42. Accept Invite Request Validation

Invalid payloads:

```json
{}
```

```json
{ "token": "" }
```

Expected:

- Requests fail validation.
- No user/member/session is created.

## Database Integrity Checks

Run these checks with a SQL client or Prisma Studio after manual tests.

### 43. Invitation Token Is Not Stored Raw

Inspect `private.MemberInvitation`.

Expected:

- Table has `tokenHash`.
- Raw emailed token is not stored.

### 44. Accepted Invitation Has Linked User And Member

For an accepted invitation:

Expected:

- `acceptedAt` is set.
- A `User` exists with invited email.
- `User.organizationId` equals invitation org.
- A `Member` exists with `userId` equal to accepted user ID.
- `Member.organizationId` equals invitation org.

### 45. Canceled Invitation Has No Member

For a canceled invitation:

Expected:

- `revokedAt` is set.
- No user/member is created solely from that canceled invite.

### 46. Deleted Presenter Does Not Break Events

1. Delete a presenter member who is assigned to an event.
2. Open that event detail page.

Expected:

- Page loads.
- Presenter field is blank, null, or safely displayed.
- No API 500 occurs.

## Mailpit Tests

### 47. Invitation Email Content

Open a sent invitation email.

Expected:

- Subject mentions the organization.
- Body contains inviter name.
- Body contains organization name.
- Body contains invitation link.
- Expiry text says 7 days.

### 48. Resend Email Creates New Message

After clicking resend:

Expected:

- Mailpit message count increases.
- Newest email contains a working invite link.

## Session Behavior Tests

### 49. Accept Invite Creates Session

After accepting an invite:

Expected:

- Browser has `bootcamp_starter_session` cookie.
- `/dashboard` loads without redirect to login.
- `/auth/me` returns the invited user.

### 50. Accept Invite While Already Signed In

1. Sign in as one user.
2. Open a different user's invitation link.

Expected:

- Invitation acceptance should either switch to the invited user session or fail clearly.
- No mixed identity state should occur.
- After acceptance, `/auth/me` should match the invited email if acceptance succeeded.

## Regression Tests

### 51. Existing Login Still Works

Verify magic-link login still works for:

- `admin@bootcamp-starter.local`
- `admin@techcorp.example.com`
- `member@techcorp.example.com`

Expected:

- Magic link emails still send.
- Verification still creates session.
- Role-based navigation remains correct.

### 52. Existing Members Page Loads With Seed Data

Before creating test data:

Expected:

- Seeded Coordly members display correctly.
- Linked seeded users show email.
- Unlinked members show `No login`.

### 53. Existing Events Pages Still Load

Visit:

- `/events`
- `/events/<seeded-event-id>`

Expected:

- Pages load.
- Registration status and attendance controls behave as before.

### 54. Existing Announcements Pages Still Load

Visit `/announcements`.

Expected:

- Page loads.
- Role-based announcement actions still behave as before.

### 55. Existing Reports Pages Still Load

Visit `/reports` as org admin and super admin.

Expected:

- Stats load.
- Organization scoping still works.

## Suggested Automated Test Coverage

Add API unit or e2e tests for:

- `POST /members` creates scoped member.
- Duplicate username returns conflict.
- `PATCH /members/:id` respects org scope.
- `DELETE /members/:id` respects org scope.
- `POST /members/invitations` rejects cross-org existing users.
- `POST /members/invitations` rejects existing linked users.
- `POST /members/invitations` queues mail job.
- `POST /members/invitations/:id/resend` rotates token hash.
- `DELETE /members/invitations/:id` sets `revokedAt`.
- `POST /members/invitations/accept` creates user/member/session.
- Accepting expired/revoked/accepted invite fails.
- Auth `MEMBER` cannot access member management endpoints.
- `ORG_ADMIN` cannot access another organization's members or invitations.

Add web tests for:

- Member page access denied for auth member.
- Create dialog validation.
- Invite dialog validation.
- Successful invite appears in pending table.
- Successful create appears in active table.
- Edit updates row.
- Delete removes row.
- Accept invite page handles success and error states.

## Cleanup After Manual Testing

For repeatable test runs, reset and reseed:

```bash
npx turbo run db:reset
npx turbo run db:seed
```

If you do not want a full reset, manually delete test records:

- Test `Member` rows with usernames starting with `manual-`, `invite-`, or `super-`.
- Test `User` rows with emails used only for invitations.
- Test `MemberInvitation` rows for those emails.

## Pass Criteria

The feature is ready when:

- All quality gates pass.
- Role access matrix behaves exactly as expected.
- CRUD works for org admins and super admins.
- Invitation send/resend/cancel/accept works.
- Invite acceptance creates exactly one user and one linked member.
- Single-org restrictions are enforced.
- `MemberRole.ADMIN` does not grant auth `ORG_ADMIN` or `SUPER_ADMIN`.
- Existing auth, events, announcements, and reports flows still work.
- No cross-tenant member or invitation access is possible.
