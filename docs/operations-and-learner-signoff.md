# Operations and learner sign-off

## Release and rollback

1. Merge only after CI passes type/scenario checks, security and PostgreSQL regressions, dependency audit, lint, format, translations, smoke and production build.
2. Synchronize the exact merged source into Replit, preserving workspace history, secrets and production data. Use the checksum-verified runtime wrapper for build and start.
3. Review the publishing schema preview. Never select **Copy your development database to production database** for an ordinary release. Stop on destructive or unexplained schema changes.
4. Publish, then compare `/api/health` release identity with the reviewed commit. Verify the rendered site, authentication, learner completion/save, progress after reload, logout and educator denial for a learner account. A successful build alone is not release verification.
5. To roll back code, select a known reviewed source commit, check compatibility with the current database, build and explicitly publish. Do not reset production data as part of code rollback. Record the resulting live release identity.

## Recovery and monitoring

- October 26 production settings: point-in-time recovery **on, seven days**; scheduled daily backups enabled with **seven-day retention**. No scheduled snapshot existed at enablement. Verify the first successful scheduled snapshot after the provider's next daily run; configuration is not proof a snapshot completed.
- Production database settings contain recovery controls. **Restore database** changes live data: do not use it as a drill. Require a reviewed recovery point, maintenance window, protected current backup and explicit approval before a production restore.
- For a safe drill, use a separate isolated destination and least-privilege access. Keep exports encrypted/access-restricted, outside Git and public artifacts. Validate owner/session state, completed progress, rate limits, indexes and primary-key constraints. Disable outbound integrations in the restored app. Remove disposable copies after verification.
- An October 26 local export/import drill passed for three synthetic application tables, including active state/ownership, completed progress, limits and primary-key integrity. It did not read production data and does not certify historical production PITR. A provider-supported restore-to-separate-target drill remains an administrator verification step.
- Monitoring alerts are enabled. Uptime email notifications and blocking of critical scan findings are enabled for the next publication. Keep **Auto-fix off** so monitoring cannot silently alter the reviewed source or incur autonomous repair usage.
- Check account notification delivery preferences and a controlled test notification. Do not deliberately take the production service down to test email. Never claim delivery solely because a toggle is enabled.
- On an alert, check database-aware health, release identity and deployment/API logs. Do not paste learner data, session capabilities, credentials or tokens into tickets. Escalate a sustained outage; avoid repeated publication or restore attempts without a diagnosis.

## Short novice pilot

Engineering browser checks do not replace observation of non-technical learners. Ask two or three new users, with consent, to use the published site without coaching. Record aggregate observations rather than names or screen recordings by default.

| Task                                            | Success evidence                                                              | Repair trigger                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Explain the purpose and choose a starting point | Learner identifies public Wi-Fi judgment and starts beginner guidance unaided | Cannot find the first action or mistakes the simulator for real Wi-Fi configuration |
| Make a decision and interpret feedback          | Learner can explain why a choice was safer or riskier                         | Random clicking, missed feedback or inability to identify the next action           |
| Try another practice network                    | Learner finds a recoverable retry and sees exploration progress               | Assumes the activity is stuck or loses track of the task                            |
| Move from practice to final run                 | Learner distinguishes exploration from the scored attempt                     | Expects practice choices to count as a saved final result                           |
| Finish and find saved progress                  | Learner signs in, finishes, verifies the save and finds it after reload       | Thinks unsaved practice is durable or cannot recover a save/load error              |
| Rediscover help                                 | Learner can reopen guidance without restarting                                | Help only works on the first visit                                                  |

Record time to first explained decision, unassisted completion, wrong turns, help use and recovery. Ask what they believe the next step is at natural pauses; do not teach the answer during the baseline. Prioritize unclear labels and feedback over adding more tutorial overlays. Repeat the same tasks after repairs. Check keyboard use, zoom/narrow screens, and the learner's preferred language. Human comprehension and professional Latvian/Russian translation review remain human sign-offs, not automated claims.
