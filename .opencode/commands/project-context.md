# Project Context Command

Reconstruct the current ScoutAI frontend context from repository memory.

## Prompt

You are starting or resuming work on the ScoutAI frontend.

Read:

- `AGENTS.md`
- `PROJECT_MAP.md`
- `docs/architecture.md`
- `docs/frontend-map.md`
- `docs/backend-contracts.md`
- `specs/README.md`
- The relevant `specs/<area>/current.md` when the user mentions a feature area
- `git status --short`
- The latest relevant git commits

Return a concise context snapshot containing:

- Current stack and architecture.
- Relevant routes, pages, services, mocks, and types.
- Which capabilities use the backend and which remain mocked.
- The current behavior and non-scope of the requested feature.
- Dirty working-tree files that must be preserved.
- The smallest safe next step.

Rules:

- Do not edit files.
- Prefer repository evidence over remembered conversation.
- Clearly label assumptions and stale or conflicting documentation.
- Never expose secrets or print environment variable values.
