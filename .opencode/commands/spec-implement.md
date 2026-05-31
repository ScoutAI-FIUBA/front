# Spec Implement Command

Implement an approved spec safely.

## Prompt

You are implementing an approved ScoutAI frontend spec.

Before editing, read:

- `PROJECT_MAP.md`
- `AGENTS.md`
- Relevant `docs/*.md`
- Relevant `specs/<area>/current.md`
- The approved implementation spec, if different from `current.md`

Workflow:

1. Identify the smallest set of files needed.
2. Avoid unrelated refactors.
3. Preserve existing app structure and style.
4. Do not add dependencies unless explicitly approved.
5. Do not modify config files unless the spec explicitly requires it.
6. After editing, run `npm run lint` and `npm run build` when feasible.
7. Summarize files changed and verification results.

Safety:

- Stop and ask if existing user changes conflict with the implementation.
- Never delete or move files unless explicitly requested.
- Keep specs and docs synchronized if behavior changes.
