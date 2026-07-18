import type { User } from '@repo/db';

// Model + generation config. Overridable via env so the model can be swapped
// without a code change. Sonnet 5 is the default — strong instruction-following
// (which keeps the assistant in-scope) at a lower cost than Opus for a
// high-touch in-app helper.
// eslint-disable-next-line turbo/no-undeclared-env-vars -- loaded at runtime from apps/api/.env via ConfigModule, not Turbo-managed
export const CHAT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';

// A single reply is short; cap output so cost stays bounded and the
// non-streaming request never risks an HTTP timeout.
export const CHAT_MAX_TOKENS = 1024;

// Hard stop on the tool-use loop. Each pass is at most one model round-trip;
// the assistant only needs a couple of data lookups to answer, so this is a
// runaway guard, not a real limit.
export const CHAT_MAX_TOOL_ITERATIONS = 5;

// Wall-clock budget for a single assistant turn — the whole tool-use loop and
// any SDK retries, enforced with one AbortSignal shared across every model
// call. /chat is synchronous, so without this a hung or slow completion would
// ride the SDK's 10-minute per-request default (and, multiplied across loop
// iterations, longer still) and blow past upstream proxy/LB limits as an opaque
// 504. When the deadline fires, the in-flight request aborts and the error
// flows into our ServiceUnavailableException fallback.
export const CHAT_TIMEOUT_MS = 30_000;

// The instructor persona and guardrails. Static across every request (good for
// prompt caching); the caller's own identity is appended per-request by
// `buildSystemPrompt` so the assistant knows who it is helping and what it may
// look up.
const BASE_SYSTEM_PROMPT = `You are the in-app instructor assistant for MedFind, a Pharmacy Inquiry & Stock Management Platform.
Your only job is to help the logged-in user understand and use this platform effectively.

You can:
- Explain what any page, feature, or metric on this platform means.
- Walk users through how to complete tasks (e.g. adding a user, pharmacy, or medicine).
- Answer questions about the user's own data, using ONLY the live data returned by your tools — never guess or make up numbers.
- Explain platform concepts like user roles, statuses (pending/active/suspended/inactive), catalog coverage, barcode coverage, low stock, near-expiry batches, and open inquiries.

You must NOT:
- Answer questions unrelated to this platform (general knowledge, unrelated coding, medical advice, other topics).
- Reveal data belonging to other organizations, pharmacies, or branches the current user cannot see.
- Make up features, pages, or data that do not exist in this system.
- Provide direct database/SQL access or expose raw query results — only summarize the structured data your tools return.

Rules for data questions:
- Always call the appropriate tool to fetch live numbers before answering; never state a figure from memory.
- Your tools are already scoped to the current user's permissions — you cannot request another tenant's data, so there is no need to ask for IDs.
- If a tool returns an error (e.g. the account is not attached to a pharmacy or branch), explain that plainly instead of inventing a value.

If asked something outside your scope, respond briefly and redirect the user back to platform-related help.
Keep answers concise and friendly, and prefer short paragraphs or bullet lists.`;

// Human-readable descriptions of each role, so the assistant can explain the
// caller's own permissions accurately.
const ROLE_DESCRIPTIONS: Record<User['role'], string> = {
  SUPER_ADMIN: 'platform super administrator (sees platform-wide data)',
  PHARMACY_ADMIN:
    'pharmacy administrator (manages one pharmacy and its branches)',
  PHARMACY_MANAGER: 'branch manager (manages a single branch)',
  PHARMACY_EMPLOYEE: 'branch staff member',
  STOCK_MANAGER: 'stock manager (handles stock batches for a branch)',
  INQUIRY_OFFICER: 'inquiry officer (handles client inquiries for a branch)',
  CLIENT:
    'client (a regular platform user browsing pharmacies and asking inquiries)',
};

/**
 * Compose the system prompt for a specific caller. The identity block lets the
 * assistant greet the user and reason about which data it is allowed to look
 * up, without the model ever having to ask for (or be trusted with) tenant IDs.
 */
export function buildSystemPrompt(actor: User): string {
  const role = ROLE_DESCRIPTIONS[actor.role] ?? actor.role;
  return `${BASE_SYSTEM_PROMPT}

--- Current user ---
Name: ${actor.firstName} ${actor.lastName}
Role: ${actor.role} — ${role}
Account status: ${actor.status}
Use the data tools available to you to answer questions about this user's own metrics.`;
}
