# Spec Review Command

Review a spec before implementation.

## Prompt

You are reviewing a ScoutAI frontend spec for safe implementation.

Read:

- `AGENTS.md`
- `PROJECT_MAP.md`
- The requested spec file under `specs/`
- Relevant docs under `docs/`

Return:

- Whether the spec describes current behavior, proposed behavior, or both.
- Missing acceptance criteria.
- Ambiguous or risky requirements.
- Files likely to be affected.
- Verification commands or manual checks needed.
- Any mismatch between the spec, source code, and documented backend contract.

Rules:

- Do not edit files during review unless explicitly asked.
- Do not propose dependency additions unless unavoidable.
- Flag any request that would touch `src/`, config, or dependencies.
