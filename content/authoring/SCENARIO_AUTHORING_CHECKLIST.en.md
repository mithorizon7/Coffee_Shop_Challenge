# Scenario Authoring Checklist

Use this checklist before you add or change scenarios. It is the fastest way to avoid regressions and translation gaps.

## 1) Required structure
- [ ] `startSceneId` exists in `scenes`.
- [ ] Every `scene.id` is unique.
- [ ] Every `scene.nextSceneId` points to an existing scene.
- [ ] Every `choice.nextSceneId` points to an existing scene.

## 2) Networks (network_selection scenes)
- [ ] Every network has a valid choice path.
  - Preferred: set `network.actionId`, and add a `choice` with the same `actionId`.
  - Back-compat: if `network.actionId` is missing, the engine falls back to `connect_<network.id>`.
- [ ] If a network represents mobile data, set `network.isMobileData: true`.
- [ ] Avoid duplicate network IDs or duplicate choice action IDs in a scene.

## 3) Actions and choices
- [ ] Every `choice.actionId` is unique per scene.
- [ ] Action IDs are unique per scene.
- [ ] Choices should reference either:
  - an action in `scene.actions`, or
  - a network action (explicit `network.actionId` or `connect_<network.id>`).

## 4) Tasks and sensitivity
- [ ] `task_prompt` scenes include a `task` with `sensitivityLevel` set (`low`, `medium`, `high`, or `critical`).
- [ ] For **critical** tasks, a plain `proceed` is considered correct only if protected by VPN or mobile data.
  - If you allow `proceed` on critical tasks without protection, add consequences that reflect added risk.

## 5) Consequences and scoring
- [ ] Every consequence has a clear safety/risk outcome and a realistic explanation.
- [ ] Use `safetyPointsChange` and `riskPointsChange` to match the severity.
- [ ] Avoid absolute claims; use risk-reduction language instead (e.g., “significantly harder,” not “impossible”).

## 6) Translation requirements (EN + LV + RU)
Any user-facing text must be fully translated.
- [ ] For new copy, add `...Key` fields and create entries in:
  - `client/src/locales/en.json`
  - `client/src/locales/lv.json`
  - `client/src/locales/ru.json`
- [ ] If you add a new `titleKey`, `descriptionKey`, `labelKey`, etc., verify it exists in all locales.

## 7) Validation commands
Run these before you commit:
- [ ] `npm run validate:scenarios`
- [ ] `node scripts/i18n-validate.js`
- [ ] `npm run authoring:check` (helper suggestions)

## 8) Common mistakes to avoid
- [ ] Network exists but no matching choice.
- [ ] Typos in `nextSceneId` or `actionId`.
- [ ] Duplicate action IDs in the same scene.
- [ ] New copy added only in English (missing LV/RU).
- [ ] Risk language that implies certainty instead of reduction.
