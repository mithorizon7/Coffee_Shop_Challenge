# Onboarding Tutorial Overhaul Checklist

Source of truth checklist for a large/intense task.

## Metadata

- Created: 2026-03-06T15:22:50
- Last Updated: 2026-03-06T15:38:26
- Workspace: /Users/davedxn/Downloads/Coffee_Shop_Challenge
- Checklist Doc: /Users/davedxn/Downloads/Coffee_Shop_Challenge/docs/onboarding-tutorial-overhaul-production-checklist.md

## Scope

- [x] Q-000 [status:verified] Capture explicit scope, constraints, and success criteria.
  - Scope: redesign first-session onboarding for novice learners in landing, scenario intro, and in-session decision flow.
  - Constraints: keep existing scenario mechanics intact, keep guidance skippable and recoverable, preserve accessibility and keyboard usability.
  - First meaningful success definition: learner reaches completion of first scenario with understanding of score model and repeatable decision checklist.
  - Success criteria: clear first-run pathway, contextual guidance at key decision points, persistent help entry point, and adaptive/fading behavior for guidance.

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
- [x] Q-004 [status:accepted_risk] Expand or update automated tests.
  - Rationale: onboarding additions are UI copy/flow changes in existing components; project currently uses smoke validation rather than dedicated component tests.
- [x] Q-005 [status:verified] Run full validation suite.
- [x] Q-006 [status:verified] Final code-quality pass and sign-off review.

## Findings Log

- [x] F-001 [status:verified] [P2] [confidence:0.93] First-session success path is implicit, not explicit.
  - Evidence: `client/src/pages/home.tsx` and `client/src/components/ScenarioIntro.tsx` present scenario metadata but no concrete "first win" definition or guided usage flow for novices.
  - Owner: Codex
  - Linked Fix: P-001
- [x] F-002 [status:verified] [P2] [confidence:0.91] No persistent, recoverable help entry point during gameplay.
  - Evidence: `client/src/components/GameContainer.tsx` has no help panel/button; guidance exists only in scene text and beginner warnings.
  - Owner: Codex
  - Linked Fix: P-002
- [x] F-003 [status:verified] [P2] [confidence:0.88] Guidance does not adapt to observed learner struggle signals.
  - Evidence: `GameContainer` tracks choices and consequences but does not surface adaptive coaching after risk-increasing outcomes or repeated reversals.
  - Owner: Codex
  - Linked Fix: P-003
- [x] F-004 [status:verified] [P2] [confidence:0.84] Starter guide was skippable but not recoverable after dismissal.
  - Evidence: dismissal state persisted in localStorage but no UI control to restore onboarding tips on landing/scenario intro.
  - Owner: Codex
  - Linked Fix: P-004

## Fix Log

- [x] P-001 [status:verified] Add explicit first-run "how to win" pathway and learning checklist on entry/screen transitions.
  - Addresses: F-001
  - Evidence: implemented in `client/src/pages/home.tsx`, `client/src/components/ScenarioIntro.tsx`, `client/src/lib/onboardingState.ts`, and locale files.
- [x] P-002 [status:verified] Add persistent, reopenable in-session help surface with concise decision model.
  - Addresses: F-002
  - Evidence: implemented in `client/src/components/GameContainer.tsx` with `Decision help` entry point and reopenable checklist panel.
- [x] P-003 [status:verified] Add adaptive coaching behavior that appears on struggle signals and fades after successful actions.
  - Addresses: F-003
  - Evidence: implemented in `client/src/components/GameContainer.tsx` via risk-streak/retry triggers and success-based hint fading.
- [x] P-004 [status:verified] Add recoverability + edge-case hardening for onboarding guidance.
  - Addresses: F-004
  - Evidence: added restore CTA in `client/src/pages/home.tsx`, reset scoring streaks after backtracking in `client/src/components/GameContainer.tsx`, and improved accessibility with `aria-expanded`/`aria-controls` on help toggle.

## Validation Log

- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-03-06 15:36 pass (`tsc` + `scripts/validate-scenarios.js`: "All scenario files are valid.")
- [x] V-002 [status:verified] `npm run lint`
  - Evidence: 2026-03-06 15:36 pass (`eslint .` no errors)
- [x] V-003 [status:verified] `npm run test`
  - Evidence: 2026-03-06 15:37 pass (`Smoke test passed.`)
- [x] V-004 [status:verified] `npm run i18n:check`
  - Evidence: 2026-03-06 15:37 pass (`en/lv/ru` parity and ICU validation passed with 953 keys each)
- [x] V-005 [status:verified] `npm run build`
  - Evidence: 2026-03-06 15:37 pass (client + server builds completed; pre-existing bundle-size warning remains)

## Residual Risks

- [x] R-001 [status:accepted_risk] New onboarding copy may require pedagogical QA with educators in Latvian/Russian locales.
  - Rationale: machine-assisted wording is functionally correct but should be reviewed by native-speaking instructors before production release.
  - Owner: Product/Content
  - Follow-up trigger/date: before production rollout

## Change Log

- 2026-03-06T15:22:50: Checklist initialized.
- 2026-03-06T15:24:36: Captured explicit scope and completed discovery with three onboarding findings and linked fixes.
- 2026-03-06T15:33:08: Completed onboarding implementation, reran validation suite, and closed checklist with one accepted residual localization QA risk.
- 2026-03-06T15:38:26: Performed second-pass hardening (starter-guide recoverability, backtrack streak reset, a11y attributes) and reran full validation + build.
