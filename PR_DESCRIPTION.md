## feat: Show event announcements on event detail pages

### Description

- Adds an optional `eventId` filter to announcement list contracts, API queries, and the web announcement hook.
- Shows event-specific announcements on the personalized `/events/[id]` page using the shared `AnnouncementList` layout.
- Places registered attendees before announcements on the event detail page.

### Link to issue or ticket

N/A

### Steps to QA

- Run `npx turbo run check-types --filter=api --filter=web`.
- Open `/events/[id]` for an event with announcements and verify attendees appear before announcements.
- Confirm the announcements section only shows announcements for the current event.

### Screenshots

Not included.
