# Specs

Specs document current behavior and proposed changes before implementation.

## Current Specs

- `auth/current.md`
- `teams/current.md`
- `players/current.md`
- `matches/current.md`
- `videos/current.md`
- `analysis/current.md`
- `clip-collections/current.md`

These files describe the behavior that already exists in the app. They are not requests for new features.

## How To Use Specs

1. Read `PROJECT_MAP.md`.
2. Read the relevant `specs/<area>/current.md`.
3. If behavior must change, create a new spec or update the relevant current spec with a clearly marked proposed section.
4. Do not implement until the desired behavior and acceptance criteria are clear.
5. After implementation, update specs if actual behavior changed.

## Spec Quality Checklist

- States current behavior accurately.
- Identifies involved routes, pages, services, and types.
- Defines scope and non-scope.
- Includes acceptance criteria.
- Includes verification steps.
- Avoids hidden feature requests inside current-state documents.
