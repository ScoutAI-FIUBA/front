# OpenCode Agent Workflow

Use these rules for OpenCode-assisted work in this repository.

## Repository Safety

- This is an existing frontend app. Do not assume a blank project.
- Do not edit `src/` unless the user explicitly asks for code changes.
- Do not edit project configuration or dependencies unless explicitly requested.
- Never delete, move, or rename existing files without explicit approval.
- If a target file exists, read it and ask before overwriting.

## Required Reading

At the beginning of a task:

- `AGENTS.md`
- `PROJECT_MAP.md`
- Relevant `docs/*.md`
- Relevant `specs/<area>/current.md`

Do not rely on conversation history when these files can provide the current state.

## Persistent Project Memory

Treat these repository files as the shared memory between OpenCode, Codex, and human contributors:

- `AGENTS.md`: repository rules and safe workflow.
- `PROJECT_MAP.md`: concise architecture, routes, and service boundaries.
- `docs/architecture.md`: current structural overview.
- `docs/frontend-map.md`: file ownership and responsibilities.
- `docs/backend-contracts.md`: implemented backend capabilities and known gaps.
- `specs/<area>/current.md`: current user-visible behavior and non-scope for one feature area.

When implemented behavior changes, update the relevant current spec and any affected map or contract document in the same change. Record only verified behavior; do not use memory files for guesses, plans presented as completed work, secrets, or temporary debugging notes.

## Current Service Boundaries

- Auth, teams, players, videos, and clip collections can use the backend or mocks through `VITE_USE_MOCK_API`.
- Matches and analysis remain mock-only.
- Clip collections persist metadata for already available clip files.
- Generating clips from analysis time ranges and uploading those generated files are not implemented.

## Spec-Driven Flow

1. Identify the feature area.
2. Read the current spec.
3. Compare the spec with the actual source and current backend contract.
4. Confirm whether the task is documentation-only or implementation.
5. For implementation, state the smallest safe change.
6. Update the spec before changing behavior.
7. Modify only files required by the accepted scope.
8. Verify with `npm run lint` and `npm run build` when code changes are made.
9. Synchronize memory documents with the verified result.

## Documentation-Only Flow

- Documentation updates may touch `docs/`, `specs/`, `PROJECT_MAP.md`, `AGENTS.md`, and `.opencode/`.
- Documentation should reflect actual project behavior.
- Do not use docs to smuggle in unapproved feature requirements.
