# MediLink Patient Record Views

Branch: `medilink-login-theme-redesign`

Covers how a patient's record is viewed — by the patient themselves and by
staff/admin/professional — across two iterations: first a stacked single-page
layout, then a tabbed layout once the page got too dense. Also covers the
care-team professional-profile view and a searchable replacement for the
"assign a professional" dropdown.

## What changed, at a glance

| Area | Before | After |
| --- | --- | --- |
| Patient's own view | `/portal`, one page cramming Administrative + Clinical + Care Team + Records into a 2-column grid | `/my-health`, one page with **tabs**: Clinical, Care Team, Records, **Administrative** (last) |
| Staff/Admin/Professional patient view | `/patients/[id]`, same 4 sections stacked vertically in one column | Same 4 sections, now as tabs (Records tab hidden for Staff/Admin, who can't view clinical records) |
| Field-level layout | Administrative section's fields (Full Name, Email, Phone, …) in a 2-column grid | Single column — was the last "boxes side by side" spot once the section cards themselves were stacked |
| Long email display | Overflowed outside its box | Truncates with `…` and shows the full value on hover (`title` attribute) |
| Care team | Showed name/specialty/phone only | "View Profile" dialog per member: specialty, bio, phone, email — each with a copy-to-clipboard icon |
| Assign professional | Plain `<Select>` dropdown listing every professional, unfiltered | Debounced (300ms) search-as-you-type box, server-side filtered via `GET /users?search=` |

## Design decisions worth knowing

- **The route is `/my-health`, not `/portal`** — renamed for clarity ("portal" doesn't mean much to a patient). The old 3-sub-route structure (`/portal`, `/portal/care-team`, `/portal/records`) was later collapsed into a single page using a `Tabs` component instead, once Administrative and Clinical needed to split into their own tabs too — maintaining 5 separate route files for what's fundamentally one page's worth of content stopped making sense.
- **Administrative is deliberately the last tab**, on both the patient's own view and the staff-facing view — it's DOB/national ID/emergency contact, the least clinically-relevant-at-a-glance section, so it doesn't need to be first.
- **New shared `components/ui/tabs.tsx`** (Radix `@radix-ui/react-tabs`, newly added dependency) — used identically in both `/my-health` and `/patients/[id]` so the two views stay visually consistent.
- **The Administrative section's field grid went from 2 columns to 1** — once every *section* was already stacked vertically, the remaining "boxes side by side" complaint was actually about the individual fields within that one card.
- **Email truncation** was added to the `Field` component (Administrative section), the patient-detail page header, and the self-service profile page — all three places that render a raw email string in a width-constrained box.
- **Care-team `bio`/`email` reuse existing data** — `careTeamMemberSchema` gained these two fields, populated from data already joined in the patient's own detail response, rather than a new by-id lookup endpoint. A patient can only ever see professionals already on their own care team, so there's no new access-control surface to reason about.
- **The professional picker was actually two bugs, not one**: the visible complaint was "unusable with 200 doctors in a plain dropdown," but the dropdown was *also* silently truncated to the backend's default page size (no `search`/paging awareness at all) — so past that page size, professionals were invisible, not just hard to scroll to. The fix (debounced server-side search via the existing `search` query param on `GET /users`) solves both at once.

## QA steps

1. As a Patient, open `/my-health` — confirm 4 tabs (Clinical, Care Team, Records, Administrative), Administrative last, and switching tabs doesn't reload the page or lose scroll position awkwardly.
2. As Staff or Institution Admin, open a patient's detail page (`/patients/[id]`) — same tab order, but **no Records tab** (Staff/Admin can't view clinical records).
3. As a Professional or the Patient themselves, open the same patient detail page — Records tab **is** present.
4. On the Administrative tab, confirm fields (Full Name, Email, Phone, DOB, Gender, National ID, Address, Emergency Contact) are stacked one per row, not two-per-row.
5. Give a patient a long email address (or check the Friends seed data) and confirm it truncates with `…` in both the Administrative field and the patient-detail page header, and hovering shows the full address as a tooltip.
6. On a patient with an assigned professional, open Care Team → "View Profile" → confirm specialty, bio, phone, and email show, and clicking the copy icon next to email/phone copies it (toast confirms) and doesn't accidentally trigger anything else on the page.
7. As Staff or Admin, open "Assign" on a patient's Care Team tab — type a professional's name or specialty and confirm the results filter as you type instead of showing every professional at once; select one, confirm a "selected" chip appears with a "Change" option before you click Assign.
8. If you have (or can simulate) more professionals than the default page size, confirm searching finds ones that wouldn't have appeared in the old unfiltered dropdown.

## Still missing / follow-up

- No automated tests for the tab layout or the search-as-you-type professional picker — manual QA only, consistent with `apps/web` having no test framework today.
- The professional picker's search is debounced client-side but not paginated — if a search term still matches more than one backend page's worth of professionals, only the first page shows. Not expected to matter at current scale, but worth knowing if that changes.
