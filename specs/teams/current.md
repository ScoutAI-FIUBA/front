# Teams Current Spec

## Status

Current behavior documentation.

## Route

- `/equipos`

## Files Involved

- `src/pages/teams/TeamsPage.tsx`
- `src/services/registry.ts`
- `src/services/contracts/teams.service.ts`
- `src/services/api/teams.api.ts`
- `src/services/mock/teams.mock.ts`
- `src/services/contracts/players.service.ts`
- `src/types/index.ts`

## Current Behavior

- Loads teams through `teamService.list()`.
- Loads players through `playerService.list()` for linking.
- Displays total teams and total linked player count.
- Filters teams by name using a local search input.
- Creates a team from a name.
- Automatically derives `shortName` from the first three uppercase characters of the entered name.
- Uses `Argentina` and `—` as default country/city values in the current create flow.
- Supports editing team name, short name, city, and country.
- Supports deleting a team after browser confirmation.
- Supports linking a selected player to a selected team.
- Shows toast feedback for create, update, delete, and link actions.

## Service Selection

- Uses `apiTeamService` by default.
- Uses `mockTeamService` when `VITE_USE_MOCK_API=true`.
- Player list comes from `playerService`, which is API or mock depending on `VITE_USE_MOCK_API`.

## Non-Scope

- No team detail route is currently documented.
- No new backend endpoint is requested here.
- No new UX flow is requested here.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify list, search, create, edit, delete, and link flows with backend or mocks.
