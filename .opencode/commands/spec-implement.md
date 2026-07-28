# Spec Implement Command

Implement an approved spec safely.

## Prompt

You are implementing an approved ScoutAI frontend spec.

Before editing, read:

- `AGENTS.md`
- `PROJECT_MAP.md`
- Relevant `docs/*.md`
- Relevant `specs/<area>/current.md`
- The approved implementation spec, if different from `current.md`

Workflow:

1. Inspect `git status` and preserve unrelated user changes.
2. Identify the smallest set of files needed.
3. Update the relevant spec before changing application behavior.
4. Avoid unrelated refactors.
5. Preserve existing app structure and style.
6. Keep real API and mock implementations aligned when the service supports both.
7. Do not add dependencies unless explicitly approved.
8. Do not modify config files unless the spec explicitly requires it.
9. After editing, run `npm run lint` and `npm run build` when feasible.
10. Synchronize `PROJECT_MAP.md` or `docs/` when routes, architecture, or backend boundaries changed.
11. Summarize files changed and verification results.

Safety:

- Stop and ask if existing user changes conflict with the implementation.
- Never delete or move files unless explicitly requested.
- Keep specs and docs synchronized if behavior changes.
