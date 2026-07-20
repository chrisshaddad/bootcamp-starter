# Feature H — AI Chat / RAG System — Progress

**Owner:** Antigravity (original branch) / Claude (this repo's integration)  
**Status:** ✅ Done in this repo — backend as-is, UI rebuilt fresh  
**Done:** 4 / 4

> Plan: [`../enhancement-plan.md`](../enhancement-plan.md) · Overview: [`PROGRESS.md`](../PROGRESS.md)

> **Partially applied in this repo.** Imported for reference from `gym-enhancements-contrast-chat` (a teammate's branch). The backend (ChatService, ChatModule, contracts) was brought in essentially as-is — no new npm dependencies, self-contained retrieval + optional-LLM logic. The **UI was rebuilt from scratch** (`components/chat-widget.tsx`, `hooks/use-chat.ts`) to match this repo's existing design tokens instead of copying the source branch's styling, per explicit instruction not to import its UI/colors. Also fixed an XSS gap: the original widget rendered the assistant's reply via `dangerouslySetInnerHTML` without escaping HTML first — since the reply can come from an LLM, this rebuild escapes `&`/`<`/`>` before applying markdown-lite formatting. `formatChatReply` also gained `#`/`##`/`###` heading support (rendered as bold) after live testing showed replies with markdown headings printing the literal `###` — the source branch's formatter had the same gap, it just hadn't been hit yet.

## Phases

| Phase | Title                      | Status | Dev         | Date       | Note                                                                                                                                                           |
| ----- | -------------------------- | ------ | ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H0    | Contracts & API Foundation | ✅     | Antigravity | 2026-07-18 | Chat contracts, ChatService with structured context injection + LLM integration + rule-based fallback, full Swagger docs                                       |
| H1    | Chat UI — Floating Widget  | ✅     | Antigravity | 2026-07-18 | Hook and ChatWidget created, integrated into layout                                                                                                            |
| H2    | Smart Suggestions & Polish | ✅     | Antigravity | 2026-07-18 | Suggestion chips, markdown rendering, char counter, error state styling                                                                                        |
| H3    | Member Portal Chat         | ✅     | Antigravity | 2026-07-20 | Member-scoped context in ChatService (personal active subscriptions, upcoming bookings, check-in history, bookable classes) + verified widget in member layout |

## Decisions & deviations

_(none yet)_
