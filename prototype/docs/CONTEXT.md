# Margin

Margin is a multi-tenant B2B web app that helps a small business understand and improve its
profitability: it records what the business sells and what it spends, turns that into profitability
metrics computed in code, and surfaces AI insights tied to those numbers. This document is the shared
glossary for the **frontend prototype**. It is a glossary only — no implementation details (those live
in [SPEC.md](./SPEC.md)).

## Language

### Tenancy & people

**Organization**:
A single business that owns all of its own data — Items, Sales, Expenses, Expense Categories, and
Members. The unit of tenancy: every record belongs to exactly one Organization.
_Avoid_: Company, Account, Tenant, Workspace, Business.

**User**:
An authenticated person, identified by email. One human is one User across the whole platform. A User
becomes a **Member** when attached to an Organization.
_Avoid_: Account, Profile.

**Member**:
A User in the context of one Organization. The same User can be a Member of several Organizations, with
a possibly different Role in each.
_Avoid_: Employee, Staff, Seat.

**Role**:
A Member's permission level within one Organization — either **Admin** or **Member-role**. (Super Admin
is a platform-level role that lives outside any Organization and is **not surfaced in the prototype**.)
_Avoid_: Permission, Access level, Tier.

**Admin**:
The Role with full control of an Organization: manage Members and their Roles, create/edit Items,
Expense Categories and Expenses, and run AI analysis. The User who creates an Organization becomes its
first Admin.
_Avoid_: Owner, Manager, Super admin.

**Member-role**:
The default Role granted when a User joins an Organization. Read-only (can view dashboards and data, can
use the AI chat) until an Admin grants Admin. Written "Member role" in prose to disambiguate from
**Member** the person.
_Avoid_: Viewer, Guest, Read-only.

**Invite link**:
A shareable URL that lets a User join one specific Organization. Joining grants the Member role by
default, pending Admin assignment.
_Avoid_: Invitation code, Referral.

### Things sold

**Item**:
Anything the Organization sells. Every Item has a **type** — Product or Service. This is the canonical
term for "the thing that earns Revenue"; use it whenever the kind doesn't matter.
_Avoid_: Product (when you mean either), SKU, Offering, Line item, Good.

**Product**:
An Item whose type is a physical good (a bike, an inner tube). Carries a unit cost.

**Service**:
An Item whose type is labor/time (a tune-up, a wheel build). Distinguished from a Product only by its
type; its margin is computed the same way.

**Sale**:
A recorded transaction of one Item (with a quantity) at a point in time, producing Revenue. In the
prototype, Sales are **seeded mock data** that power the dashboard and AI; manual entry is out of scope.
_Avoid_: Order, Transaction, Purchase, Receipt.

### Spending

**Expense**:
A single recorded cost the Organization incurs, classified under exactly one Expense Category.
_Avoid_: Cost, Spend, Bill, Outgoing.

**Expense Category**:
A user-defined bucket that groups Expenses (Rent, Supplies, Marketing, Payroll). An Admin creates these.
_Avoid_: Tag, Type, Label, Bucket.

**Recurrence**:
A property marking an Expense as repeating on a cadence (e.g. monthly rent) rather than one-off.
_Avoid_: Subscription, Schedule, Repeat.

### Profitability (all figures computed in code, never by the AI)

**Revenue**:
Total money from Sales over a period.
_Avoid_: Income, Turnover, Sales (as a number).

**Gross Margin**:
Revenue minus the direct cost of the Items sold, expressed as both an amount and a percentage.
_Avoid_: Markup.

**Net Margin**:
Revenue minus all costs (direct Item cost + Expenses), as an amount and a percentage.
_Avoid_: Profit (ambiguous), Bottom line.

**Contribution Margin**:
For one Item, its Revenue minus its direct cost — how much each Item contributes toward covering
Expenses. Used to rank best/worst Items.
_Avoid_: Unit profit, Markup.

**Break-even**:
The Revenue level at which Net Margin is exactly zero — total Expenses are precisely covered.
_Avoid_: Threshold, Cutoff.

### AI

**Insight**:
A single AI-produced observation tied to a specific computed figure, carrying a suggested **action** and
a **caveat**. The model never does arithmetic — it interprets figures computed in code and its reply is
validated against a schema before display.
_Avoid_: Recommendation (alone), Tip, Advice.

**AI Action**:
A preset question the user picks in the AI chat. Each Action maps to specific computed figures:
_least-selling Item_, _top performer_, _recommend from sales_, _recommend from expenses_.
_Avoid_: Prompt, Command, Query.

## Flagged ambiguities

- **"Member" is overloaded.** It means both (a) any User attached to an Organization and (b) the default
  Role. Resolution: **Member** = the person; **Member role** (two words) = the default permission level.
  Never write "Member" alone when you mean the role.
- **"Super admin" from the original site map ≠ Super Admin role.** The site map called the Organization
  creator the "super admin for this administration." In Margin's model that person is the Organization's
  first **Admin**. The platform-level **Super Admin** role exists in the data model but is not shown in
  the prototype.
- **"Product" vs "Item".** The proposal said "products"; Margin sells both Products and Services, so the
  umbrella term is **Item**. Reserve "Product" for the physical-good type.

## Example dialogue

> **Dev:** When someone clicks an invite link, do they pick their role?
> **Owner:** No. They join as the Member role — read-only. An Admin promotes them later.
> **Dev:** And the person who made the Organization?
> **Owner:** That's the Organization's first Admin. We don't show the platform Super Admin anywhere.
> **Dev:** The dashboard ranks "worst products" — products only, or services too?
> **Owner:** Both. They're all Items. Rank them by Contribution Margin; a tune-up is just a Service Item.
> **Dev:** Does the AI compute the ranking?
> **Owner:** Never. We compute Contribution Margin in code and hand the AI the finished figures. It only
> writes the Insight — the observation, the action, the caveat.
