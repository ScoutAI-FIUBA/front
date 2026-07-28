# Code Review Command

Review changes with a bug-finding mindset.

## Prompt

You are reviewing ScoutAI frontend changes.

Focus on:

- Bugs.
- Behavioral regressions.
- Type errors.
- Incorrect service/API assumptions.
- Missing acceptance criteria.
- Missing verification.
- Changes that violate `AGENTS.md` or specs.

Read:

- `AGENTS.md`
- `PROJECT_MAP.md`
- `docs/backend-contracts.md` for API-facing changes.
- Relevant specs under `specs/`
- Changed files.

Output findings first, ordered by severity, with file and line references when possible.

Rules:

- Do not summarize before listing findings.
- If no findings are found, say so and mention residual risks.
- Do not edit files unless explicitly asked.
- Distinguish pre-existing warnings from regressions introduced by the change.
