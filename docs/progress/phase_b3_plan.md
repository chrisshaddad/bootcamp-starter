# Phase B3 Implementation Plan — Member "My Bookings" Portal View

> **Feature B (Owner 2: Antigravity)**  
> **Status:** 🟡 Plan Ready for Review  
> **Date:** 2026-07-01  
> **Prerequisites:** Phase B0, B1, B2 ✅ Done; Phase A4 (Member Portal Shell) ✅ Done.

---

## 1. Overview & Objective

Phase B3 delivers the member-facing **"My Bookings"** portal view (`app/(member)/portal/bookings/page.tsx`) and its supporting backend endpoint (`GET /me/bookings`). This allows logged-in gym members (authenticated via magic link as role `MEMBER`) to view their upcoming and past scheduled class bookings, track session details (instructor, timing, status), and cancel upcoming bookings directly from their portal.

This plan adheres strictly to project rules (`AGENTS.md` and `.agents/AGENTS.md`), ensuring **contracts-first development**, **multi-tenant `gymId` isolation**, **comprehensive Swagger documentation**, **pagination and status filtering**, and **backend/frontend parity**.

---

## 2. Architecture & Data Flow

```
[Member Portal Web App: /portal/bookings]
        │
        ▼ (SWR hook: useMeBookings)
[GET /me/bookings?page=1&limit=25&status=BOOKED]
        │
        ▼ (Zod-validated contracts & query params)
[NestJS MePortalController (@Roles('MEMBER'), @ApiCookieAuth)]
        │
        ▼
[MePortalService.getBookings(userId, gymId, page, limit, status)]
        │
        ▼ (Prisma query: filtered by memberId + gymId)
[PostgreSQL Database: SessionBooking + GymSession + Instructor]
```

---

## 3. Step-by-Step Implementation Breakdown

### Step 1: Shared Contracts (`packages/contracts`)

We must create wire schemas in `@repo/contracts` before writing any backend or frontend code. Why? Because the existing `BookingResponse` schema in `booking.response.ts` was designed for admin session rosters and does not include session details (title, start/end time, instructor). For the member portal, session details are essential.

1. **Create `packages/contracts/src/me/me-booking.response.ts`**:
   - `meBookingSessionSchema`: defines nested session details (`id`, `title`, `description`, `startsAt`, `endsAt`, `capacity`, `status`, `instructor`).
   - `meBookingResponseSchema`: defines the full booking response (`id`, `gymId`, `sessionId`, `memberId`, `status`, `createdAt`, `updatedAt`, `session`).
   - `meBookingListResponseSchema`: defines the paginated response container (`bookings: meBookingResponseSchema[]`, `total: number`).
2. **Update Index Exports**:
   - Add `export * from './me-booking.response';` to `packages/contracts/src/me/index.ts`.
   - Verify `packages/contracts/src/index.ts` exports `./me`.
3. **Rebuild Contracts**:
   - Run `npx tsc -p packages/contracts` to ensure zero TypeScript errors across the workspace.

---

### Step 2: NestJS Backend API (`apps/api/src/me-portal`)

We extend the existing `MePortalModule` created in Phase A4.

1. **Update `me-portal.swagger.ts`**:
   - Define `meBookingSchema` as a shared Swagger JSON schema object for documentation reuse.
2. **Update `me-portal.service.ts`**:
   - Define `ME_BOOKING_SELECT` constant selecting fields matching `meBookingResponseSchema`.
   - Implement `async getBookings(userId: string, gymId: string, page: number, limit: number, status?: BookingStatus): Promise<MeBookingListResponse>`:
     - Resolve portal user to their `Member` record via existing `resolveMember(userId, gymId)`.
     - Query `prisma.sessionBooking.findMany` and `count` using pagination (`skip`, `take`) and sorting (`orderBy: { session: { startsAt: 'desc' } }`).
     - Enforce tenant isolation by strictly filtering `where: { memberId: member.id, gymId }`.
   - Implement `async cancelBooking(userId: string, gymId: string, bookingId: string): Promise<MeBookingResponse>`:
     - Guard checks: verify booking exists under caller's `memberId` + `gymId`, is not already `CANCELLED`, and `session.startsAt > new Date()` (cannot cancel past sessions).
     - Update booking status to `CANCELLED` and return updated record.
   - Add 1-line JSDoc comments to all public methods.
3. **Update `me-portal.controller.ts`**:
   - Add `GET /me/bookings` decorated with `@Roles('MEMBER')`, `@ApiOperation`, `@ApiCookieAuth`, and `@ApiResponse(200, { schema: ... })`.
   - Use built-in NestJS query pipes: `@Query('page', new DefaultValuePipe(1), ParseIntPipe)` and `@Query('limit', new DefaultValuePipe(25), ParseIntPipe)`.
   - Add `PATCH /me/bookings/:id/cancel` for member cancellation (fulfilling backend/frontend parity).
   - Add 1-line JSDoc comments to all route handlers.

---

### Step 3: Next.js Member Portal UI (`apps/web`)

We build the portal page and wire it into the member navigation shell.

1. **Update SWR Hooks (`apps/web/hooks/use-me.ts`)**:
   - Export constant `MY_BOOKINGS_PAGE_SIZE = 25`.
   - Implement `useMeBookings(options: { page?: number; status?: BookingStatus })`:
     - Builds query URL `/me/bookings?page=X&limit=25&status=Y` and fetches paginated data.
   - Implement `useCancelMyBooking()` returning an async `cancelBooking(id)` helper that calls `apiPatch('/me/bookings/' + id + '/cancel')` and triggers SWR revalidation.
   - Add 1-line JSDoc comments to all exported functions.
2. **Update Sidebar Navigation (`apps/web/components/member-sidebar.tsx`)**:
   - Import `Calendar` icon from `lucide-react`.
   - Add `{ title: 'My Bookings', url: '/portal/bookings', icon: Calendar }` to `portalNavItems`.
3. **Create Page `apps/web/app/(member)/portal/bookings/page.tsx`**:
   - **Header**: "My Bookings" title and descriptive subtitle.
   - **Status Filter UI**: Follow project mandatory pattern (`ALL`, `BOOKED`, `CHECKED_IN`, `CANCELLED`).
     - Active button: `bg-primary-base text-white`.
     - Inactive buttons: `border-gray-200 text-gray-600 hover:border-primary-base hover:text-primary-base`.
   - **Bookings List**:
     - Render each booking as a clean card showing Session Title, Formatted Date/Time (using `date-fns`), Instructor Name, Duration, and Status Badge.
     - If `status === 'BOOKED'` and `session.startsAt > new Date()`, display a "Cancel Booking" button with confirmation action and error/success toast handling.
   - **Empty State**: Dynamic message reflecting active filter (e.g., "No cancelled bookings found" vs "No bookings found. Register for sessions from the schedule!").
   - **Pagination Controls**: Standard pagination layout (`Showing X–Y of Z`, Previous/Next buttons, Page X of Y) using `MY_BOOKINGS_PAGE_SIZE`.
   - Add 1-line JSDoc comments to component exports and helper functions.

---

### Step 4: Verification & Quality Gates

Before declaring work complete, we run all project quality checks:

1. **TypeScript Check**: `npx turbo run check-types` (must pass with 0 errors).
2. **Linting**: `npx turbo run lint` (must pass with 0 warnings/errors).
3. **Formatting**: `npm run format:check` (must pass clean).
4. **End-to-End Functional Verification**:
   - Verify login as a member (role `MEMBER`).
   - Confirm `/portal/bookings` renders bookings cleanly with accurate session and instructor details.
   - Test status filter tabs (`ALL`, `BOOKED`, `CHECKED_IN`, `CANCELLED`).
   - Test pagination controls.
   - Test cancellation flow for an upcoming booked session.
   - Verify multi-tenant isolation: confirm no bookings from other gyms appear.

---

### Step 5: Documentation & PR Hand-off

Once all quality gates pass:

1. Update `docs/progress/PROGRESS-B.md`: set B3 status to ✅ Done, record dev name (`Antigravity`), completion date, PR branch, and log design decisions.
2. Update `docs/PROGRESS.md` overview table: update Feature B row to `4 / 4` done (✅).
3. Prepare standard Git commit and branch (`feat/feature-b-phase-b3-my-bookings`), structured according to `.github/pull_request_template.md`.

---

## 4. Summary of Key Project Rules Applied

- ✅ **Contracts First**: Never inline request/response shapes in API or Web; always define in `@repo/contracts`.
- ✅ **Tenant Isolation**: Every database query filtered by `memberId` + `gymId`.
- ✅ **Pagination Pattern**: Named `MY_BOOKINGS_PAGE_SIZE = 25` constant exported from hook and used for URL params and UI range text.
- ✅ **Status Filter UI**: Mandatory filter tabs (`ALL` + status pills) with dynamic empty states.
- ✅ **Docstring Standards**: 1-line `/** ... */` JSDoc on all public service methods, controllers, pages, and hooks.
- ✅ **No Force Pushes / No `.env` Commits**: Standard additive commits only.
