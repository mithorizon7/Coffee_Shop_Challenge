# Full Site Production Readiness Audit Checklist

Source of truth checklist for a large/intense task.

Current security status (2026-10-22): superseded by
[the October security audit](security-audit-2026-10-22.md). Earlier sign-off and
scan results below are historical. Current production verification and build-tool
risk remain open; do not interpret March's checked gates as current approval.

## Metadata

- Created: 2026-03-06T15:41:45-05:00
- Last Updated: 2026-03-06T16:00:30-05:00
- Workspace: /Users/davedxn/Downloads/Coffee_Shop_Challenge
- Checklist Doc: /Users/davedxn/Downloads/Coffee_Shop_Challenge/docs/full-site-production-readiness-audit-production-checklist.md

## Scope

- [x] Q-000 [status:verified] Capture explicit scope, constraints, and success criteria.
  - Scope: end-to-end audit of frontend, backend, auth/session, data access, scenario loading, build/runtime configuration, and localization integrity.
  - Constraints: preserve intended gameplay behavior, avoid breaking API contracts, keep auth compatible with current deployment assumptions.
  - Success criteria: all critical/high findings fixed or accepted with rationale; full validation suite and build pass on final state.

## Sign-off Gate

- [x] G-001 [status:verified] All queued work, findings, fixes, and validations are complete.
- [x] G-002 [status:verified] All findings are resolved or marked `accepted_risk` with rationale and owner.
- [x] G-003 [status:verified] Required validation suite has been rerun on the final code state.
- [x] G-004 [status:verified] Residual risks and follow-ups are documented.

## Rerun Matrix

- [x] G-010 [status:verified] If code changes after any checked `V-*`, reset affected validation items to unchecked.
- [x] G-011 [status:verified] Final sign-off only after a full validation pass completed after the last code edit.

## Audit Queue

- [x] Q-001 [status:verified] Create checklist and baseline scope.
- [x] Q-002 [status:verified] Complete discovery/audit of impacted systems.
- [x] Q-003 [status:verified] Implement required changes.
- [x] Q-004 [status:verified] Expand or update automated checks where practical for this codebase.
- [x] Q-005 [status:verified] Run full validation suite.
- [x] Q-006 [status:verified] Final code-quality pass and sign-off review.

## Findings Log

- [x] F-001 [status:resolved] [P1] [confidence:0.93] Session-store TTL unit mismatch caused session persistence drift.
  - Evidence: `connect-pg-simple` `ttl` expected seconds but code passed milliseconds.
  - Owner: backend
  - Linked Fix: P-001
- [x] F-002 [status:resolved] [P1] [confidence:0.90] Authentication host handling trusted unvalidated hostnames and had weak callback construction.
  - Evidence: hostname validation/auth domain resolution did not consistently enforce allow-list semantics and safe URL construction.
  - Owner: backend
  - Linked Fix: P-002
- [x] F-003 [status:resolved] [P1] [confidence:0.88] API logging captured response bodies, increasing accidental data exposure risk.
  - Evidence: middleware intercepted `res.json` payload content for logging.
  - Owner: backend
  - Linked Fix: P-003
- [x] F-004 [status:resolved] [P1] [confidence:0.86] Progress completion accepted stale/race-prone replay attempts and lacked processing lock.
  - Evidence: duplicate requests could race before dedupe marker write.
  - Owner: backend
  - Linked Fix: P-004
- [x] F-005 [status:resolved] [P1] [confidence:0.85] Session update/progress-save integrity checks were insufficiently strict.
  - Evidence: missing cross-checks for scenario/difficulty/score/badge consistency at completion boundary.
  - Owner: backend
  - Linked Fix: P-005
- [x] F-006 [status:resolved] [P2] [confidence:0.90] Server security baseline lacked hardening headers and body size limits.
  - Evidence: no explicit hardening middleware for common response headers; default parser limits.
  - Owner: backend
  - Linked Fix: P-006
- [x] F-007 [status:resolved] [P2] [confidence:0.84] In-memory active sessions lacked an upper bound under sustained abuse.
  - Evidence: unbounded map growth risk in `HybridStorage` active session store.
  - Owner: backend
  - Linked Fix: P-007
- [x] F-008 [status:resolved] [P2] [confidence:0.81] Scenario file path lookup could throw when scenario directory was unreadable.
  - Evidence: `readdirSync` path traversal in helper without guarded fallback.
  - Owner: backend
  - Linked Fix: P-008
- [x] F-009 [status:resolved] [P2] [confidence:0.79] IPv6 localhost auth callback/logout URL formatting could generate invalid URLs.
  - Evidence: `http://::1/...` style construction without bracket encoding.
  - Owner: backend
  - Linked Fix: P-009
- [x] F-010 [status:resolved] [P2] [confidence:0.78] Authenticated completion endpoint trusted missing origin/referer context.
  - Evidence: missing-origin requests were accepted as trusted in CSRF guard logic.
  - Owner: backend
  - Linked Fix: P-010
- [x] F-011 [status:resolved] [P1] [confidence:0.94] Session PATCH accepted client-authored state jumps that were structurally valid but not legal gameplay transitions.
  - Evidence: client could forge score, badges, completion flags, or jump to arbitrary valid scene IDs within a scenario because the server only validated shape and membership, not state progression.
  - Owner: backend
  - Linked Fix: P-011
- [x] F-012 [status:resolved] [P1] [confidence:0.92] Client session sync/save flow could race progress completion ahead of session persistence and allow local/server divergence.
  - Evidence: `syncSession` was fire-and-forget, completion saving could run before session PATCH finished, and learner actions stayed clickable while persistence was in flight.
  - Owner: frontend
  - Linked Fix: P-012
- [x] F-013 [status:resolved] [P2] [confidence:0.85] Completed progress save lacked a robust retry/idempotency path after transient failures.
  - Evidence: repeated completion-save attempts could fail after the first write and completed runs had no retry path if the client lost the response.
  - Owner: full-stack
  - Linked Fix: P-013
- [x] F-014 [status:resolved] [P3] [confidence:0.80] Progress page fallback scenario title formatting used an escaped word-boundary regex and failed to title-case correctly.
  - Evidence: `.replace(/\\b\\w/g, ...)` matched the literal sequence instead of word boundaries.
  - Owner: frontend
  - Linked Fix: P-014
- [x] F-015 [status:resolved] [P3] [confidence:0.78] Home-page session start helper retained an unused direct scene-jump mutation path that widened the client mutation surface.
  - Evidence: `startScenarioSession` accepted `startAtSceneId` and attempted a client-driven scene jump PATCH that no current flow used.
  - Owner: frontend
  - Linked Fix: P-014

## Fix Log

- [x] P-001 [status:resolved] Corrected auth session TTL units and cookie/session consistency in `server/replit_integrations/auth/replitAuth.ts`.
  - Addresses: F-001
  - Evidence: constants split into seconds/ms and wired to the right options.
- [x] P-002 [status:resolved] Added strict auth-domain resolution, host validation, allow-list checks, and bounded strategy registration.
  - Addresses: F-002
  - Evidence: `resolveAuthDomain`, `getAllowedDomains`, `MAX_REGISTERED_STRATEGIES`.
- [x] P-003 [status:resolved] Removed response payload capture from request logging and kept metadata-only API logs.
  - Addresses: F-003
  - Evidence: `server/index.ts` logging middleware.
- [x] P-004 [status:resolved] Added in-flight completion lock set and deterministic cleanup to prevent duplicate completion writes.
  - Addresses: F-004
  - Evidence: `processingProgressSessionIds` + `try/finally` lock lifecycle in `server/routes.ts`.
- [x] P-005 [status:resolved] Enforced completion-time integrity checks against active session ownership/state.
  - Addresses: F-005
  - Evidence: scenario/difficulty/score/badge/completion cross-checks in `POST /api/progress/complete`.
- [x] P-006 [status:resolved] Added baseline security headers, disabled `x-powered-by`, body parser size limits, and safer production 500 responses.
  - Addresses: F-006
  - Evidence: `server/index.ts` middleware/error handler updates.
- [x] P-007 [status:resolved] Added active in-memory session cap and stale/oldest cleanup behavior.
  - Addresses: F-007
  - Evidence: `MAX_ACTIVE_GAME_SESSIONS` handling in `server/storage.ts`.
- [x] P-008 [status:resolved] Hardened scenario-path helper to fail safely when content directory is missing/unreadable.
  - Addresses: F-008
  - Evidence: guarded `readdirSync` in `server/scenarioLoader.ts`.
- [x] P-009 [status:resolved] Added host formatting for IPv6 URL generation and protocol consistency in callback/logout URL construction.
  - Addresses: F-009
  - Evidence: `formatHostForUrl` usage in `server/replit_integrations/auth/replitAuth.ts`.
- [x] P-010 [status:resolved] Tightened trusted-origin checks to require matching Origin or Referer host for authenticated completion writes.
  - Addresses: F-010
  - Evidence: `isTrustedRequestOrigin` host-matching logic in `server/routes.ts`.
- [x] P-011 [status:resolved] Moved gameplay transition logic into shared code and enforced server-side legal session progression plus bounded rollback history.
  - Addresses: F-011
  - Evidence: `shared/gameEngine.ts`, `resolveSessionUpdate`, forward-candidate derivation, and snapshot history handling in `server/routes.ts`.
- [x] P-012 [status:resolved] Reworked client session persistence to await server acknowledgement, roll back on failure, and lock in-session controls while sync/save work is pending.
  - Addresses: F-012
  - Evidence: awaited `syncSession`, guarded handlers, disabled action surfaces, and completion/save ordering in `client/src/components/GameContainer.tsx`, `TaskPromptCard.tsx`, and `ConsequenceScreen.tsx`.
- [x] P-013 [status:resolved] Made completion saving idempotent on the server and added bounded automatic retry on the client for transient save failures.
  - Addresses: F-013
  - Evidence: `completedProgressBySessionId` cache in `server/routes.ts` and retry scheduling in `client/src/components/GameContainer.tsx`.
- [x] P-014 [status:resolved] Removed the stale direct scene-jump helper and corrected the progress-page fallback formatter.
  - Addresses: F-014, F-015
  - Evidence: `client/src/pages/home.tsx` and `client/src/pages/progress.tsx`.

## Validation Log

- [x] V-001 [status:pass] `npm run check`
  - Evidence: 2026-03-06 15:59 - pass (`tsc` + scenario validation)
- [x] V-002 [status:pass] `npm run lint`
  - Evidence: 2026-03-06 15:59 - pass
- [x] V-003 [status:pass] `npm run test`
  - Evidence: 2026-03-06 16:00 - pass (`Smoke test passed.`)
- [x] V-004 [status:pass] `npm run i18n:check`
  - Evidence: 2026-03-06 16:00 - pass (953 keys each locale)
- [x] V-005 [status:pass] `npm run build`
  - Evidence: 2026-03-06 16:00 - pass (client+server build successful)
- [x] V-006 [status:pass] `npm audit --omit=dev --audit-level=moderate`
  - Evidence: 2026-03-06 16:00 - pass (`found 0 vulnerabilities`)
- [x] V-007 [status:observed] `npm audit --audit-level=moderate`
  - Evidence: 2026-03-06 16:00 - 5 moderate vulnerabilities in dev-only toolchain path (`vite`/`drizzle-kit` -> `esbuild` advisory).
- [x] V-008 [status:pass] `npm run i18n:check`
  - Evidence: 2026-03-10 11:10 - pass (1004 keys each locale)
- [x] V-009 [status:pass] `npm run check`
  - Evidence: 2026-03-10 11:16 - pass (`tsc` + scenario validation)
- [x] V-010 [status:pass] `npm run lint`
  - Evidence: 2026-03-10 11:16 - pass
- [x] V-011 [status:pass] `npm run test`
  - Evidence: 2026-03-10 11:16 - pass (`Smoke test passed.`)
- [x] V-012 [status:pass] `npm run build`
  - Evidence: 2026-03-10 11:16 - pass (client+server build successful; existing client chunk-size warning remains)
- [x] V-013 [status:pass] `npm audit --omit=dev --audit-level=moderate`
  - Evidence: 2026-03-10 11:22 - pass (`found 0 vulnerabilities`)
- [x] V-014 [status:pass] `npm run check`
  - Evidence: 2026-03-10 11:24 - pass (`tsc` + scenario validation)
- [x] V-015 [status:pass] `npm run lint`
  - Evidence: 2026-03-10 11:24 - pass
- [x] V-016 [status:pass] `npm run test`
  - Evidence: 2026-03-10 11:24 - pass (`Smoke test passed.`)
- [x] V-017 [status:pass] `npm run i18n:check`
  - Evidence: 2026-03-10 11:24 - pass (1004 keys each locale)
- [x] V-018 [status:pass] `npm run build`
  - Evidence: 2026-03-10 11:24 - pass (client+server build successful; existing client chunk-size warning remains)
- [x] V-019 [status:pass] `npm audit --omit=dev --audit-level=moderate`
  - Evidence: 2026-03-10 11:24 - pass (`found 0 vulnerabilities`)

## Residual Risks

- [x] R-001 [status:accepted_risk] Dev-only `esbuild` advisory remains in tooling dependency graph pending coordinated major upgrades.
  - Rationale: runtime/prod audit is clean; remaining advisory is in development/build tooling chain and requires breaking upgrades (`vite@7.x` and related compatibility work).
  - Owner: engineering
  - Follow-up trigger/date: schedule dependency upgrade track in next maintenance sprint; re-run full regression suite after toolchain bump.
- [x] R-002 [status:accepted_risk] Production bundle still emits chunk-size warning for large client chunk.
  - Rationale: functional correctness/security unaffected; optimization requires planned code-splitting work and route-level chunk strategy.
  - Owner: frontend
  - Follow-up trigger/date: performance optimization pass before next major feature release.

## Change Log

- 2026-03-06T15:41:45-05:00: Checklist initialized.
- 2026-03-06T16:00:30-05:00: Completed full audit pass; findings, fixes, validations, and residual risk sign-off recorded.
- 2026-03-10T10:52:00-04:00: Reopened checklist for post-hardening follow-up audit focused on session integrity, client sync flow, and regression cleanup.
- 2026-03-10T11:22:26-04:00: Completed follow-up audit pass; added transition-integrity enforcement, client sync/save hardening, idempotent completion save handling, and final validation rerun.
- 2026-03-10T11:24:24-04:00: Re-ran the full validation matrix after final lifecycle hardening cleanup and confirmed clean post-last-edit sign-off.
