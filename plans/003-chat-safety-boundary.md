# Plan 003: Harden chat trust boundaries and safety handling

## Status
- Priority: P1
- Effort: M
- Risk: MED
- Depends on: plans/001-verification-baseline.md
- Category: security
- Planned at: commit `0cfd4b6`, 2026-09-07

## Why this matters
`app/api/chat/route.ts` validates message roles/content but accepts any object as `grounding`, then passes it to the model. The product exposes AI chat and needs a deterministic self-harm response before launch.

## Current state
- `app/api/chat/route.ts:31-40` has only a message type predicate.
- `app/api/chat/route.ts:58-70` accepts unchecked grounding and truncates only message text.
- `lib/llm/grounding.ts` defines the intended context shape and bounds.

## Scope
In scope: `app/api/chat/route.ts`, a small Zod schema/helper matching `GroundingContext`, and focused `tests/chat.route.test.ts` additions. Out of scope: moderation vendors, chat storage, provider changes, clinical claims.

## Steps
1. Define and enforce a Zod request schema for messages and every grounding field, with bounded lengths/counts. Preserve the existing safe bad-request response. Test malformed/oversized payloads.
2. Add a deterministic pre-model screen for clear self-harm/suicide intent. Return supportive text encouraging emergency/crisis resources and a trusted person, with no methods/instructions; do not call `streamChat`.
3. Verify ordinary streaming, quota fallback, abort/error behavior, and new safety cases.

## Done criteria
- Grounding is validated/bounded before model invocation.
- Self-harm intent receives safe text and no model call.
- Existing chat behavior remains passing; `npm test` and `npm run typecheck` pass.

## STOP conditions
- Exact `GroundingContext` cannot be represented without changing the client/server contract.
- Classifier requires external moderation/storage; do not add implicitly.

## Maintenance notes
The phrase screen is a conservative first layer, not complete moderation. Revisit for new locales or regulated use cases.
