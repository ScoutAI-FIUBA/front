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
- Creates a team from a name and city.
- Automatically derives `shortName` from the first three uppercase characters of the entered name.
- Uses `Argentina` as the default country in the current create flow.
- Requires both name and city before submitting a new team.
- Supports editing team name, short name, city, and country.
- Supports deleting a team after browser confirmation.
- Supports linking a selected player to a selected team.
- Shows toast feedback for create, update, delete, and link actions.

## Acceptance Criteria

- The create-team dialog includes a city field.
- Creating a team sends the entered city through `teamService.create()` instead of a placeholder value.
- Blank name or city values do not submit the form and show validation feedback.
- After a successful creation, both create fields are cleared and the team list is reloaded.

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
