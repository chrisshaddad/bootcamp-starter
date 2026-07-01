### Description
- Implements **Phase B3: Member "My bookings" view (portal)** across `@repo/contracts`, `apps/api`, and `apps/web`.
- Adds `GET /me/bookings` and `PATCH /me/bookings/:id/cancel` endpoints in `MePortalModule` scoped securely by `memberId` + `gymId`.
- Applies dynamic sorting logic: upcoming (`BOOKED`) sessions sort in ascending order (nearest first), while past/cancelled sessions (`CHECKED_IN`, `CANCELLED`) sort descending.
- Incorporates NestJS Swagger decorators (`@ApiTags`, `@ApiCookieAuth`, `@ApiOperation`, `@ApiResponse`, `@ApiQuery`) and `ParseEnumPipe`/`ParseIntPipe` for query parameter validation.
- Builds the `/portal/bookings` web interface with status filtering tabs (`ALL`, `BOOKED`, `CHECKED_IN`, `CANCELLED`), cancellation modal dialogs, and dynamic empty states.
- Refactors the portal dashboard (`/portal`) to replace redundant Quick Links with an **Upcoming Bookings** schedule card for a balanced, symmetrical layout.

### Link to issue or ticket
- Closes Phase B3 of `docs/gym-management-plan.md`
- Updates `docs/progress/PROGRESS-B.md` and `docs/PROGRESS.md`

### Steps to QA
1. **Login as Member**: Go to `http://localhost:3000/login` and sign in with `sofia.rodriguez@example.com`, `liam.chen@example.com`, or `james.brown@example.com`.
2. **Verify Portal Dashboard**: Notice the **Active Subscriptions** card on the left and the new **Upcoming Bookings** card on the right, displaying your next scheduled class with matching vertical alignment.
3. **Navigate to My Bookings**: Click **"My Bookings"** in the sidebar or **"View all bookings →"** on the dashboard card.
4. **Test Filter Tabs**:
   - Click **Booked** to verify upcoming sessions are sorted nearest first.
   - Click **Checked In** or **Cancelled** to verify past sessions are sorted newest first.
5. **Test Session Cancellation**: On a `BOOKED` class, click **Cancel Booking**, confirm in the modal, and verify the status badge changes immediately to `Cancelled` and frees a spot on the schedule.
6. **Verify Tenant & Member Isolation**: Confirm that logging in as one member never reveals another member's or gym's bookings.

### Screenshots
*(Attach screenshots of `/portal` showing the new Upcoming Bookings card and `/portal/bookings` showing the status filter tabs)*
