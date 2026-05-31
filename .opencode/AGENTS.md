# OpenCode Agent Workflow

Use these rules for OpenCode-assisted work in this repository.

## Repository Safety

- This is an existing frontend app. Do not assume a blank project.
- Do not edit `src/` unless the user explicitly asks for code changes.
- Do not edit project configuration or dependencies unless explicitly requested.
- Never delete, move, or rename existing files without explicit approval.
- If a target file exists, read it and ask before overwriting.

## Required Reading

Before implementation work:

- `PROJECT_MAP.md`
- `AGENTS.md`
- Relevant `docs/*.md`
- Relevant `specs/<area>/current.md`

## Spec-Driven Flow

1. Identify the feature area.
2. Read the current spec.
3. Confirm whether the task is documentation-only or implementation.
4. For implementation, state the smallest safe change.
5. Modify only files required by the accepted scope.
6. Verify with `npm run lint` and `npm run build` when code changes are made.

## Documentation-Only Flow

- Documentation updates may touch `docs/`, `specs/`, `PROJECT_MAP.md`, `AGENTS.md`, and `.opencode/`.
- Documentation should reflect actual project behavior.
- Do not use docs to smuggle in unapproved feature requirements.
