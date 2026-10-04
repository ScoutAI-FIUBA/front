# Matches Current Spec

## Phase 2 product decision

- `/partidos` remains available as a compatibility route, but it is removed from primary navigation because its service is mock-only.
- The page identifies itself as an experimental planning tool and does not imply that its records are the source of automatic video analysis.
- No real matches backend or data relationship is invented in Phase 2.

## Status

Current behavior documentation.

## Route

- `/partidos`

## Files Involved

- `src/pages/matches/MatchesPage.tsx`
- `src/services/registry.ts`
- `src/services/contracts/matches.service.ts`
- `src/services/mock/matches.mock.ts`
- `src/services/contracts/teams.service.ts`
- `src/types/index.ts`
- `src/lib/utils.ts`

## Current Behavior

- Loads matches from `matchService.list()`.
- Loads teams from `teamService.list()`.
- Displays match cards with title, date, competition, and status.
- New match dialog collects title, home team, away team, and datetime.
- Creating a match requires home team, away team, and date.
- Roster dialog accepts comma-separated player IDs.
- Roster entries are saved as starters for the home team in the current mock-oriented UI.
- Toasts provide feedback for match creation and roster save.

## Service Selection

- `matchService` currently always uses `mockMatchService`.
- Team data comes from `teamService`, which can be API or mock depending on `VITE_USE_MOCK_API`.

## Non-Scope

- There is no real backend match API wired in the registry.
- Roster selection is not a full player picker in the current implementation.
- No new match features are requested here.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify list, create dialog, and roster dialog with mocks available.
