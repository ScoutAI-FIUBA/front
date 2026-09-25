# Players Current Spec

## Status

Current behavior documentation.

## Routes

- `/jugadores`: players list and management.
- `/jugadores/nuevo`: create player form.

## Files Involved

- `src/pages/players/PlayersPage.tsx`
- `src/pages/players/PlayerNewPage.tsx`
- `src/services/registry.ts`
- `src/services/contracts/players.service.ts`
- `src/services/api/players.api.ts`
- `src/services/mock/players.mock.ts`
- `src/services/contracts/teams.service.ts`
- `src/types/index.ts`
- `src/lib/utils.ts`

## Current Behavior

- Players list loads players and teams in parallel.
- Each player row derives a display team name from `teamId` when possible.
- List can be filtered by player name and team.
- The page displays player name, position, age, jersey number, team name, and actions.
- Edit dialog allows updating first name, last name, birth date, position, jersey number, height, and weight.
- Jersey number is optional text of one or two digits: inputs strip non-digits, and `0` and `00` are distinct values.
- Delete action uses browser confirmation before calling the service.
- Player rows expose only functional actions: edit and delete.
- Create player page loads teams for optional association.
- Create player page calculates age from birth date for display.
- Create player requires first name, last name, position, birth date, valid height, and valid weight.
- Create and edit forms set today's local date as the maximum birth date and
  reject a future value before calling the player service.
- Create player navigates back to `/jugadores` after successful save.
- Toasts provide success and error feedback.

## Service Selection

- Uses `apiPlayerService` by default.
- Uses `mockPlayerService` when `VITE_USE_MOCK_API=true`.
- Team data comes from `teamService`, which is API or mock depending on `VITE_USE_MOCK_API`.

## Positions

Current position codes include:

- `DEL`
- `MC`
- `MCD`
- `DFC`
- `MED`
- `DEF`
- `EXT`
- `POR`

## Non-Scope

- Player detail remains out of scope; no inert detail action is displayed.
- Photo upload UI is displayed as optional placeholder in create flow.
- No new player feature is requested here.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify list, filters, create, edit, and delete flows with backend or mocks.
