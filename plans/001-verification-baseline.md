# Plan 001: Restore a working verification baseline

## Status
- Priority: P1
- Effort: S
- Risk: LOW
- Depends on: none
- Category: dx
- Planned at: commit `0cfd4b6`, 2026-09-07

## Why this matters
`npm test` currently fails during Vitest startup with `spawn EPERM`, before any test executes. The package has no dedicated typecheck script, so launch verification is inconsistent.

## Current state
- `package.json:8-15` defines test scripts but no `typecheck`.
- `vitest.config.ts` is the startup path implicated by the `spawn EPERM` failure.
- Existing tests live under `tests/` and run with Vitest.

## Scope
In scope: `package.json`, `vitest.config.ts`, and minimal config needed to make Vitest run on this Windows workspace. Out of scope: application behavior, dependency upgrades, test rewrites.

## Steps
1. Reproduce with `npm test`; inspect `vitest.config.ts` for process-spawning plugins/options. Adjust only the offending startup path while preserving aliases, environment, and test globs. Verify `npm test` exits 0.
2. Add `"typecheck": "tsc --noEmit"` to `package.json`. Verify `npm run typecheck` exits 0.
3. Run `npm run build`; record unrelated Next/credential failures separately.

## Done criteria
- `npm test`, `npm run typecheck`, and `npm run build` exit 0.
- No application source files changed.
- `git status --short` contains only intended files.

## STOP conditions
- Fix requires installing packages or changing the lockfile.
- Proposed fix changes test semantics or excludes existing tests.

## Maintenance notes
Keep these scripts as the canonical launch gate; document any Windows-specific Vitest constraint.
