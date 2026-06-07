# Bootcamp Starter — Walkthrough

A guided tour of this repo, written for the person teaching it. Read top-to-bottom in one sitting, or skip to whichever section matches the lesson you're about to give.

> Use this doc as a teaching outline, not a reference. Each section has a **What it is** / **Why it's here** / **What to teach** structure. The "teach" bullets are the points worth making aloud in front of the class.

---

## 0. Orientation — what this repo is

A generic full-stack starter on Turborepo. Multi-tenant auth (organizations + roles) is wired up; everything domain-specific is left blank for students to build.

What's pre-built:

- A working NestJS API on `:3001`
- A working Next.js web app on `:3000`
- A Prisma schema with `User`, `Organization`, `UserProfile`, `Password`, `Session`, `MagicLink`
- Magic-link + password authentication with cookie sessions
- Multi-tenant role model (`SUPER_ADMIN` / `ORG_ADMIN` / `MEMBER`)
- BullMQ-backed email sending via Mailpit for local dev
- Shared Zod contracts package between API and web
- A CI workflow (lint + typecheck + format check)
- A full Claude Code AI toolkit (commands, agents, skills, hooks, specs)

What students are expected to add:

- Their own domain models (projects, tasks, events, whatever their project is about)
- Their own pages and API endpoints
- Their own integration tests

The repo's job is to teach them the **patterns** for adding those things, not to hand them a finished product.

**What to teach:** the difference between a _starter_ and a _template_. A template has the answer; a starter has the question. We're giving them the question.

---

## 1. The stack

```
Turborepo (monorepo build orchestrator)
├── apps/
│   ├── api/   ← NestJS 11
│   └── web/   ← Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui
└── packages/
    ├── database/         ← Prisma 7 + PostgreSQL 18
    ├── contracts/        ← Zod schemas shared by api + web
    ├── eslint-config/    ← shared linting
    └── typescript-config/ ← shared tsconfig presets
```

External services (Docker):

- **PostgreSQL** on `:5433` — the database
- **Redis** on `:6380` — BullMQ job queue
- **Mailpit** on `:8025` (UI) / `:1025` (SMTP) — catches outbound email in dev so you don't need a real SMTP server

**Why Turborepo:** it lets two TypeScript apps share a single `package.json` install, share TypeScript and ESLint configs, and run tasks in parallel with caching. The pain it removes shows up immediately when students try to share types between their API and web — without a monorepo, they end up duplicating DTOs and watching them drift.

**Why NestJS** (vs Express / Fastify directly): it imposes structure (modules, services, dependency injection, decorators for auth/validation). Junior devs need that structure more than they need ultimate flexibility. The DI container teaches "depend on abstractions" without lecturing about it.

**Why Next.js App Router** (vs Pages Router): server components are the default, which is the right default. Students learn the boundary between server and client work first, not last.

**Why Prisma** (vs Drizzle / raw SQL): the migration story is on rails. `db:migrate` generates SQL, applies it, regenerates the client, in one command. The cost is that it's an extra abstraction layer; the benefit is that students can change the schema confidently in week 1.

**Why shadcn/ui** (vs Material / Ant): components are copied into the repo, not imported. Students can read them, modify them, learn from them. The shadcn MCP server (configured in `.vscode/mcp.json`) lets Claude add new components without students copy-pasting from docs.

**What to teach:** each tool was chosen against an alternative. Tell them the alternative. The lesson isn't "use Prisma," it's "this stack has constraints, and here's why we accepted them."

---

## 2. The dev workflow — what each command does

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp packages/database/.env.example packages/database/.env
```

We commit `.env.example` files (safe, no secrets) and the student copies them locally. The `.env` files are gitignored. A hook (see §7) blocks Claude from ever writing to a real `.env`.

```bash
npm run services:init
```

`docker compose up -d`. Brings up Postgres, Redis, Mailpit. Note the non-default ports (5433, 6380) — chosen so they don't clash with whatever the student already has running.

```bash
npm install
```

Installs every workspace's dependencies into a single hoisted `node_modules/`. Notice the _absence_ of a `prepare` script — there's no Husky, no postinstall side effects.

```bash
npx turbo run db:migrate
```

First time: prompts for a migration name (use `init`). Generates the SQL migration in `packages/database/prisma/migrations/`, applies it, regenerates the Prisma client. Subsequent times: only generates a new migration if the schema changed.

```bash
npx turbo run db:seed
```

Optional. Runs the seeders in `packages/database/prisma/seeders/` to insert a super admin and a few sample organizations.

```bash
npm run dev
```

Turbo runs `dev` in both `apps/api` and `apps/web` in parallel. Watches both.

**What to teach:** every command in this workflow exists because of a specific pain. Walk through what would break without each one. "Why do we need `db:migrate` separately from `dev`?" — because the Prisma client is generated code, and if it's out of date your IDE lies to you about what fields exist.

---

## 3. Convention: shared Zod contracts

Look at `packages/contracts/src/auth/magic-link.request.ts`:

```ts
export const magicLinkRequestSchema = z.object({ email: z.email() });
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
```

The same file is imported by:

- The NestJS controller (validates incoming requests with `ZodValidationPipe`)
- The Next.js login form (validates form input with `zodResolver`)

One schema, two consumers, zero duplication.

**Why this matters:** every junior dev's first instinct is to define a `LoginRequest` interface in the frontend and another `LoginDto` class in the backend. Then they diverge. Then a bug ships. The contracts package makes divergence impossible — the type _is_ the validator, and they share both.

**What to teach:** "if it's on the wire, the shape lives in `packages/contracts`." Make this the project's first non-negotiable rule. The CLAUDE.md files reinforce it, the slash commands enforce it, the `code-reviewer` agent flags violations. Every layer in the AI toolkit points students back to this principle.

**Exercise:** ask a student to add a new endpoint without using contracts. They'll feel the pain of keeping two type definitions in sync the first time the schema changes.

---

## 4. Convention: multi-tenancy

Three roles in [`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma):

- `SUPER_ADMIN` — platform operator; not scoped to any org
- `ORG_ADMIN` — administers one organization
- `MEMBER` — regular user inside an organization

Every tenant-scoped table has an `organizationId` FK with an `@@index`. Every query that touches that table **must** filter by `organizationId`. The `nestjs-api-builder` agent calls this out explicitly: "Tenant-scoped queries always filter by `organizationId` — this is non-negotiable."

The auth flow:

1. User requests magic link → API generates token, BullMQ job sends email
2. User clicks link → API validates token, sets a session cookie (`bootcamp_starter_session`)
3. Every protected request → `AuthGuard` reads cookie, validates session, attaches `user` to the request
4. Controllers get the user via `@CurrentUser()` and filter by `user.organizationId`

**What to teach:** tenant leakage is the #1 security bug in multi-tenant SaaS, and it's almost always the same shape — a `findUnique({ where: { id } })` without an `organizationId` check. Show them the bug, then show them how the convention prevents it.

**Exercise:** write a deliberately buggy endpoint that omits the `organizationId` filter. Ask Claude (or the `code-reviewer` agent) to review it. It should catch the leak — the convention is documented in `apps/api/CLAUDE.md` and the agent reads it.

---

## 5. Convention: no local git hooks, CI only

There's no `.husky/`. No `prepare` script in `package.json`. No lint-staged. Why?

Local hooks fail mysteriously, slow commits down, and trigger a cascade of "why isn't my commit going through" Slack messages. The previous version of this repo had Husky and it was the single most common student blocker.

The replacement is `.github/workflows/ci.yml`:

```yaml
- npm ci
- npx turbo run db:generate
- npx tsc -p packages/contracts
- npx turbo run lint
- npx turbo run check-types
- npm run format:check
```

PRs to main run the gate. Locally, the student runs the same commands when they want a pre-push check.

**What to teach:** **enforce at the boundary, not at every keystroke.** Local hooks try to prevent bad code from being written; CI tries to prevent it from being merged. The second is enough. The first is theater.

**Counterpoint to teach:** the `post-write-format.sh` hook is a local hook (sort of) — Claude Code runs Prettier after every file write. The difference is it's invisible and never fails. That's the bar for a good local hook: silent, deterministic, no blocker.

---

## 6. The AI toolkit — overview

This is the most distinctive part of the repo. Six layers, each with a different purpose:

| Layer              | Lives in                           | Triggered by                          | Purpose                                          |
| ------------------ | ---------------------------------- | ------------------------------------- | ------------------------------------------------ |
| **Memory**         | `CLAUDE.md` (root + scoped)        | Auto-loaded on session start          | Convention, style, what-not-to-do                |
| **Specs**          | `specs/` + `/spec` command         | Human runs `/spec <feature>`          | Define done before writing code                  |
| **Slash commands** | `.claude/commands/`                | Human types `/<name>`                 | Intentional, repeatable workflows                |
| **Subagents**      | `.claude/agents/`                  | Delegated by main agent (or human)    | Stack-specific specialists                       |
| **Skills**         | `.claude/skills/<name>/SKILL.md`   | Auto-invoked when description matches | Multi-step workflows with progressive disclosure |
| **Hooks**          | `.claude/hooks/` + `settings.json` | Claude's lifecycle events             | Deterministic guardrails                         |

The next six sections explain each one in turn. The order is intentional: students should understand each layer's purpose _and_ the boundary between them before they start writing their own.

---

## 7. AI layer 1 — CLAUDE.md (memory)

Open the root [`CLAUDE.md`](../CLAUDE.md). It's short. ~80 lines. Conventions, monorepo layout, what NOT to do.

There are also four scoped CLAUDE.md files:

- [`apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) — NestJS conventions
- [`apps/web/CLAUDE.md`](../apps/web/CLAUDE.md) — Next.js + shadcn conventions
- [`packages/database/CLAUDE.md`](../packages/database/CLAUDE.md) — Prisma conventions
- [`packages/contracts/CLAUDE.md`](../packages/contracts/CLAUDE.md) — Zod conventions

Claude auto-loads the relevant one based on the directory it's working in. The root file is always loaded; the scoped ones load when files in that directory are touched.

**What it is:** project memory. It's the thing Claude reads first to know what "good code in this repo" means.

**Why it's here:** without it, Claude defaults to generic best practices ("use camelCase, add tests"). With it, Claude knows the specific rules: Zod schemas come from `@repo/contracts`, tenant queries filter by `organizationId`, shadcn primitives aren't hand-edited.

**What to teach:**

- CLAUDE.md is _not_ documentation. It's instructions for the AI. The audience is Claude, not a human reader (though humans benefit from reading it too).
- Keep it short. If you find yourself appending sections after every feature, you're using it wrong — that content belongs in a separate doc, an ADR, or a slash command. The CLAUDE.md should stay stable.
- The "What NOT to do" section is more valuable than the "What to do" section. Negative space is what Claude needs help with — positive guidance is often inferrable from the code itself.

**Exercise:** add a fictional bad pattern to the codebase (e.g., a controller with inline DTO definitions). Ask Claude to add a similar feature. It should produce _correct_ code despite the bad example, _because_ CLAUDE.md explicitly forbids the pattern. This demonstrates how instructions override examples.

---

## 8. AI layer 2 — Specs (the contract before code)

Look at [`specs/README.md`](../specs/README.md) and [`specs/TEMPLATE.md`](../specs/TEMPLATE.md).

A spec is a 30–80 line document that defines a feature **before** anyone writes code. Six sections: problem, goals, non-goals, acceptance criteria, design sketch, open questions.

The workflow:

1. Student runs `/spec projects` → Claude walks them through the template via Q&A
2. Spec lands at `specs/projects.md`
3. Student optionally runs `/spec-review specs/projects.md` → Claude flags gaps
4. Student runs `/new-feature-module projects` → the slash command checks for the spec and uses it as the source of truth

**What it is:** the single highest-leverage practice this repo teaches. Most junior failures with AI come from the same root: jumping to code without deciding what "done" looks like. Specs force the decision.

**Why it's here:** AI is best at _execution_, worst at _intent_. When a student types "build me a projects feature" and immediately gets code, they've outsourced the part of the job that's actually theirs. The spec is where they think; the slash command is where Claude works.

**What to teach:**

- A spec is a **contract** with two parties: the student writing the code now, and the student debugging it in six weeks. The "acceptance criteria" section is the contract — if you can't write criteria a teammate could verify without asking you, you don't understand the feature yet.
- The "non-goals" section is where the magic lives. _"It will not support nested projects in v1"_ — written down, this saves a week. Unwritten, it becomes a 3am argument.
- The "open questions" section is the inverse of the "design sketch" section. Design is what you've decided; open questions are what you've punted. Naming the punts is more valuable than overdesigning the decisions.

**Exercise:** have a student build a feature WITHOUT a spec. Time them. Have another student spec the same feature first, then build. Compare the diff (the spec'd version is usually smaller and cleaner) and the time (the spec'd version is usually faster overall, despite the up-front cost).

---

## 9. AI layer 3 — Slash commands

Open `.claude/commands/`. There are 12 commands:

```
spec.md                    # NEW: draft a spec via Q&A
spec-review.md             # NEW: review a spec for gaps
new-api-endpoint.md
new-feature-module.md      # vertical slice: model + contracts + API + page
new-prisma-model.md
new-zod-schema.md
new-dashboard-page.md
new-swr-hook.md
add-background-job.md
write-tests.md
refactor-code.md
security-review.md
```

Each file is a markdown document with frontmatter:

```yaml
---
description: One-line summary shown in the slash menu
argument-hint: <feature-slug>
allowed-tools: Read, Edit, Write, Bash, Grep
---
```

Below the frontmatter is the actual prompt that runs when the user types `/<name> <arg>`.

**What it is:** intentional, human-triggered workflows. The human knows what they want; the command makes Claude execute it consistently.

**Why it's here:** writing the same prompt every time you start a new feature is tedious and error-prone. Encoding the prompt as a command means everyone in the bootcamp gets the same scaffold — the standardization is the lesson.

**What to teach:**

- Slash commands are the **right** place to encode workflows. Hooks fire automatically and have no judgment; CLAUDE.md is passive guidance; slash commands sit in the middle: human-triggered, but with the workflow baked in.
- `allowed-tools` is a security and focus mechanism. A `/security-review` command shouldn't be able to write files. A `/refactor-code` command shouldn't be allowed to delete migrations. Limit the tool surface to the minimum.
- The first instruction in every command should be "read CLAUDE.md / the relevant scoped CLAUDE.md." This is how the layers compose — commands inherit conventions automatically.

**Exercise:** have a student modify one of the existing commands (e.g., add a step to `/new-feature-module` that also creates a `__tests__/` folder). Then run it. The change takes effect immediately — no reload, no install.

---

## 10. AI layer 4 — Subagents

Open `.claude/agents/`. Seven agents:

```
nestjs-api-builder.md
prisma-modeler.md
nextjs-page-builder.md
zod-contract-author.md
bullmq-job-author.md
code-reviewer.md
project-tour-guide.md     ← runs on Haiku, not Sonnet
```

Each agent has a frontmatter (name, description, tools, model) and a system prompt body. When the main Claude conversation hits work that matches the agent's description, it can delegate via the Agent tool. The subagent runs in an isolated context with its own tool allowlist.

**What it is:** specialized helpers. Each one has a narrower scope than the main agent and a more focused system prompt.

**Why it's here:** two reasons.

1. **Context isolation.** When the main conversation delegates "build a Prisma model" to `prisma-modeler`, all the schema-design reasoning happens in the subagent's context, not the main one. The main conversation stays clean for the higher-level work.
2. **Specialization.** A subagent prompt can include domain-specific guidance ("Prisma client lives at `src/generated/prisma`, you never `new PrismaClient()`") that would bloat the main CLAUDE.md.

**What to teach:**

- The `code-reviewer` agent has _no write tools_. It can only Read, Grep, Glob, Bash. This is by design — read-only specialists are safer and more focused. Use the same pattern for any review-style agent.
- Agent description matters more than the body. The main agent picks an agent based on the description. "Authors NestJS modules end-to-end in `apps/api/`" is better than "helps with backend code."
- Boundaries: `prisma-modeler` should not edit Next.js pages. `nextjs-page-builder` should not write migrations. The system prompts say so explicitly. Without those boundaries, agents drift into each other's territory and you lose the specialization.
- **Model selection is a decision, not a setting.** The `project-tour-guide` agent runs on Haiku because onboarding is read-only Q&A — summarize, point at docs, answer "where does X live?". A frontier model is overkill. The cost dimension matters in production, and instincts about it are best built early. Compare: a single Haiku token costs ~1/15th of a Sonnet token; a tour-guide session with 30 questions adds up fast on Sonnet and barely registers on Haiku.

**Exercise 1:** ask the main Claude conversation to "add a Project model with Prisma." It should delegate to `prisma-modeler` automatically. Ask the same question with the agent disabled — Claude does it itself, slower, with less domain-specific detail.

**Exercise 2:** ask the `project-tour-guide` agent "what does this repo do?" Then ask it to write a new file. It will refuse — by design, it has no Write or Edit tools. Show students the frontmatter that enforces this. Discuss why splitting "explainer" and "coder" into separate agents is safer than relying on prompting alone.

---

## 11. AI layer 5 — Skills (with progressive disclosure)

Open `.claude/skills/`:

```
add-shadcn-component/SKILL.md
bootstrap-feature/
  SKILL.md
  references/
    01-prisma.md
    02-migration.md
    03-contracts.md
    04-api.md
    05-web.md
    06-verify.md
reset-db/SKILL.md
run-dev/SKILL.md
run-migrations/SKILL.md
seed-db/SKILL.md
```

Skills are auto-invoked when their description matches what the user is asking for. The router reads only the frontmatter, not the body.

The **`bootstrap-feature`** skill demonstrates _progressive disclosure_:

- [`SKILL.md`](../.claude/skills/bootstrap-feature/SKILL.md) is short (~30 lines). It lists 7 phases and links to a reference file per phase.
- Each `references/0X-*.md` is loaded only when its phase begins. If the human says "actually, just do the Prisma part," Claude only reads `01-prisma.md` and `02-migration.md` — never the others.
- Without progressive disclosure, the full skill would be ~400 lines, all loaded every time the skill triggers. With it, ~30 lines on trigger, ~80 lines per phase as needed.

**What it is:** multi-step workflows that Claude executes when invoked. Like slash commands, but Claude decides when to invoke based on the description, and they can be longer because they use progressive disclosure to manage context.

**Why it's here:** some workflows are too big for a single prompt and too autonomous to require a slash command. "Build a complete feature" is a good example — it's invoked situationally, but it has a defined shape.

**What to teach:**

- The `description` field is the entire routing logic. Write it as a _when-to-use_ sentence, not a _what-it-does_ sentence. Compare:
  - ❌ "Bootstrap a feature end-to-end"
  - ✅ "Build a complete tenant-scoped feature module end-to-end (Prisma → contracts → API → web). Use when the user wants a whole new resource with DB + API + UI, not just one layer."
- Progressive disclosure is the most important pattern in skill design. Without it, every skill bloats the context unnecessarily. The discipline: the top-level SKILL.md is a _table of contents_, not the content.
- Each reference file should end with a checklist. Claude works better when it can mark items off explicitly than when it tries to remember "am I done with this phase?"

**Exercise:** have a student add a new skill — e.g., `add-page` or `add-cron-job` — using progressive disclosure. They'll have to make the architectural decision: what belongs in SKILL.md vs what belongs in references? That decision _is_ the lesson.

---

## 12. AI layer 6 — Hooks (deterministic guardrails)

Open `.claude/hooks/`:

```
pre-write-guard.sh       # PreToolUse: blocks .env / lockfile / migration writes
post-write-format.sh     # PostToolUse: runs Prettier after every Write/Edit
warn-main-branch.sh      # UserPromptSubmit: reminds you to branch off main
stop-summary.sh          # Stop: prints uncommitted file count
```

Wired into `.claude/settings.json`. Each hook is a shell script with a tiny contract:

- **stdin** → JSON describing the tool call
- **stdout** → injected into Claude's context (good for soft reminders)
- **stderr + exit 2** → block the tool call and show the message to Claude
- **exit 0** → allow

That's the whole API.

Try it now: ask Claude to write to `apps/api/.env`. The pre-write hook will block with a clear message. Ask Claude to write to a `.ts` file — the post-write hook will silently Prettier-format it.

**What it is:** deterministic enforcement. Things that _must_ be true regardless of what the prompt says.

**Why it's here:** the lesson is **guardrails > hopeful prompting**. You can write "please don't edit `.env` files" in CLAUDE.md and Claude will mostly comply. But "mostly" is not a security strategy. A hook makes the rule impossible to violate.

**What to teach:**

- The decision matrix:
  - Use a **hook** when the rule must hold regardless of intent. No `.env` writes. Always format. Branch warnings.
  - Use a **slash command** when the human invokes the workflow intentionally. `/new-feature-module`, `/spec`.
  - Use **CLAUDE.md** for conventions Claude applies when relevant. Style guides, architecture, what-not-to-do.
- A hook that always allows is a hook that doesn't exist. If you can't articulate the rule, delete it.
- Keep hooks fast (<100ms). They run on every matching tool call. Heavy work belongs in a slash command.
- Hooks are **inspectable shell scripts**, not magic. Read them. This is part of the curriculum — they show students that AI safety isn't a black box.

**Exercise:** ask students to add their own hook. Suggestions:

1. A `PreToolUse` on Bash that blocks `rm -rf /` or `git push --force`.
2. A `Stop` hook that runs the test suite if any `*.spec.ts` file changed.
3. A `UserPromptSubmit` hook that injects the current branch + sprint number into context.

Each of these is 5–20 lines of shell. Doable in one sitting.

---

## 13. Bonus: MCP servers (capability extensions)

Open `.vscode/mcp.json`:

```json
{
  "servers": {
    "shadcn": { "command": "npx", "args": ["-y", "shadcn@latest", "mcp"] }
  }
}
```

One MCP server: shadcn. It lets Claude (through the IDE integration) directly call the shadcn CLI to install components — `add a Dialog primitive` → MCP installs it → ready to import.

**What it is:** the Model Context Protocol — a way to give Claude new capabilities by running a tool server. MCP servers can expose tools (like "install a shadcn component") or resources (like "the current database schema").

**Why it's here:** to demonstrate the pattern with one concrete, useful example. Without the MCP, students would copy shadcn install commands from docs into a terminal and tell Claude "I installed Dialog, now use it." With the MCP, Claude does it directly.

**What to teach:**

- MCP is the _plug_ for Claude's capabilities. The slash commands, hooks, agents, and skills work entirely within Claude Code's existing tools (Read, Write, Bash, etc.). MCP is what lets you add genuinely new capabilities — a Postgres MCP gives Claude direct DB query access, a Playwright MCP lets it drive a browser.
- Like all the AI layers, MCPs come with a tradeoff: each one is more setup for the student, more surface for things to go wrong. Pick MCPs that pay off immediately and obviously. shadcn does; many don't.
- Suggested MCPs to teach with, in priority order: shadcn (shipped), Postgres (lets Claude query the dev DB), Chrome DevTools (lets Claude verify UI changes in a real browser), GitHub (for PR workflows).

---

## 14. Putting it together — a worked example

Imagine a student wants to add a "Projects" feature to their app. The end-to-end flow, using everything in this repo:

```
Day 0 — branch
  $ git checkout -b feat/projects
  [warn-main-branch hook stops reminding once you're off main]

Day 1 — spec
  > /spec projects
  Claude walks through the template via Q&A.
  Result: specs/projects.md
  > /spec-review specs/projects.md
  Claude flags two missing non-goals. Student updates the spec.

Day 2 — implement
  > /new-feature-module projects
  Command checks for specs/projects.md (found).
  Delegates to prisma-modeler → schema change.
  Tells student: "Run `npx turbo run db:migrate --name add_project_model`"
  Student runs it. Confirms.
  Delegates to zod-contract-author → packages/contracts/src/projects/.
  Delegates to nestjs-api-builder → apps/api/src/projects/.
  Delegates to nextjs-page-builder → apps/web/app/(authenticated)/projects/.
  [post-write-format hook formats every file as it lands]
  Runs check-types + lint + format:check. Reports success.

Day 3 — verify
  > Use the verify skill to test the projects page in a browser
  Claude drives the browser, creates a project, confirms it lists, screenshots.

Day 4 — review
  Student opens a PR. CI runs.
  > Use the code-reviewer agent on this branch
  Agent reads the diff, checks against every CLAUDE.md, flags one tenant
  leakage in projects.service.ts. Student fixes.

Day 5 — merge
  CI green. Merge.
  Student marks specs/projects.md Status: shipped.
```

Five days of working, one feature shipped, every AI layer doing its job. Walk students through this example before they start their own feature.

---

## 15. Teaching exercises (graded)

### Easy (week 1)

- Read every CLAUDE.md. Write a one-paragraph summary of "what this repo values" without looking at the code.
- Run `/spec` for a feature you'd want to build. Don't implement it. Just write the spec and trade with a classmate for review.
- Modify the `warn-main-branch.sh` hook to also warn when the branch name contains "test", "tmp", or "wip".

### Medium (week 2–3)

- Add a `Project` feature using the full slash command + skill workflow. Submit the spec + the PR.
- Write a new slash command. Suggestion: `/new-cron-job` that scaffolds a node-cron-style scheduled task in the API.
- Write a new subagent. Suggestion: `auth-pattern-checker` that reviews diffs for missing `@UseGuards` decorators.

### Hard (week 4+)

- Add a new MCP server to `.vscode/mcp.json`. Suggestion: a Postgres MCP so Claude can query the dev DB. Document the install steps and the security implications.
- Replace the `bootstrap-feature` skill with a version that runs in **parallel** — generate contracts, API, and web in three subagents concurrently, then merge. (Tricky: how do you sync the merge?)
- Write a hook that catches a specific anti-pattern your class keeps tripping on. Bonus points if the hook explains _why_ the pattern is bad in its rejection message.

---

## 16. Anti-patterns (what NOT to teach)

Things that look like AI best practices but aren't:

1. **Auto-updating CLAUDE.md after every feature.** CLAUDE.md is _convention_, not changelog. Auto-appending turns it into noise. If a convention actually changes, that's an ADR — separate doc, written by a human.

2. **Adding a hook for every rule.** Hooks are for things that must hold regardless of intent. Soft preferences ("prefer named exports") belong in CLAUDE.md. If you can't articulate the deterministic rule a hook enforces, delete the hook.

3. **Letting Claude run migrations directly.** Prisma's `db:migrate` is interactive. It hangs inside a Claude tool call. Every command/skill in this repo says: _"Tell the user to run the migration; you don't run it."_ This is the right pattern for any interactive command — `npm init`, `prisma migrate`, `git rebase -i`.

4. **Specs that read like requirements docs.** A spec is 30–80 lines. If yours is 300, you're not specifying, you're designing. Specs answer "what's done?" not "how do we build it?"

5. **Slash commands without `allowed-tools`.** A command that can use every tool is a command that can do anything. Limit the tools to the minimum that gets the job done. `/security-review` should be read-only. `/refactor` shouldn't be able to delete migrations.

6. **Subagents with overlapping descriptions.** If `prisma-modeler` and `database-helper` both claim "designs Prisma models," the main agent picks randomly. Each agent's description must carve out distinct territory.

7. **Hand-editing files in `apps/web/components/ui/`.** They come from shadcn. They get updated by the shadcn CLI / MCP. Hand-edits are lost on the next update.

8. **Defining DTOs in `apps/api` or `apps/web`.** If it's on the wire, it lives in `packages/contracts`. Always. This is the single rule that, when broken, causes the most production bugs.

---

## 17. Where to go from here

This repo is a foundation, not a finish line. Things you might add to make it richer for your specific cohort:

- **ADRs.** Architecture Decision Records under `docs/decisions/`, numbered (`0001-magic-link-auth.md`). Capture the "why" behind decisions. Add a `/adr` slash command.
- **A Postgres MCP server.** Lets Claude query the dev DB directly. High concrete value, demonstrates MCP.
- **A Playwright or Chrome DevTools MCP.** Pairs with the built-in `verify` skill. Teaches "AI verifies its own work."
- **A `/debug` skill** with progressive disclosure: triage → logs → env → DB → ports → network. Replaces flailing-prompt debugging with structured diagnosis.
- **Output styles** that enforce "show the plan in one paragraph, then act." Teaches code-review habits.
- **A status line** in `.claude/settings.json` that shows branch + dirty state + last command. Teaches situational awareness.

Pick one per cohort. Resist the urge to add five at once — each one is more surface area for the class to debug.

---

## Quick reference card

When teaching, this is the one slide you want:

```
┌─────────────────────────────────────────────────────────┐
│  When to reach for what                                 │
├─────────────────────────────────────────────────────────┤
│  Convention or style?         →  CLAUDE.md              │
│  Hard rule, no exceptions?    →  Hook                   │
│  Workflow I invoke?           →  Slash command          │
│  Specialist helper?           →  Subagent               │
│  Multi-step + Claude-driven?  →  Skill                  │
│  New capability for Claude?   →  MCP server             │
│  Decide what "done" means?    →  Spec                   │
└─────────────────────────────────────────────────────────┘
```

Print this. Tape it next to the projector. Refer to it in every lesson.
