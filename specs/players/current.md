# Players Current Spec

## Status

Current behavior documentation.

## Routes

- `/jugadores`: secondary global player registry.
- `/jugadores/nuevo`: compatibility entry that opens the global create-player sheet.

## Files Involved

- `src/pages/players/PlayersPage.tsx`
- `src/pages/players/PlayerNewPage.tsx`
- `src/pages/players/PlayerFormFields.tsx`
- `src/pages/players/GlobalPlayerSheet.tsx`
- `src/pages/players/global-player-list.ts`
- `src/pages/players/player-form.ts`
- `src/services/registry.ts`
- `src/services/contracts/players.service.ts`
- `src/services/api/players.api.ts`
- `src/services/mock/players.mock.ts`
- `src/services/contracts/teams.service.ts`
- `src/types/index.ts`
- `src/lib/utils.ts`

## Current Behavior

- Players list loads players and teams in parallel without per-row requests.
- Players are ordered by surname and first name, independently from API order.
- Search covers first name, last name, and jersey number.
- Team filtering supports all players, unassigned players, and each real team.
- Compact rows prioritize jersey, name, position, team, and available measurements.
- Team names link to the canonical team roster when the player is assigned.
- Create and edit use one right-side global player sheet.
- Create supports a real team or no team through the optional `teamId` contract.
- Edit can keep the current team, assign an unassigned player, or move an assigned player with `teamService.addMember`.
- Assigned players cannot be unassigned because no backend operation exists.
- Profile updates and team moves execute only when needed; partial success remains visible and retryable without frontend rollback.
- Jersey number is optional text of one or two digits: inputs strip non-digits, and `0` and `00` are distinct values.
- Delete exists only as a secondary action inside edit and uses browser confirmation.
- Create player requires only first name and last name. Position, birth date, height, and weight are optional and
  empty controls are serialized as explicit `null` values; the frontend never invents profile data.
- Create and edit surfaces share the same player-field component and validation schema.
- Create and edit forms set today's local date as the maximum birth date and
  reject a future filled value before calling the player service.
- Editing is a full profile replacement, matching `PUT /players/{player_id}`: keeping an optional control empty
  preserves `null`, filling it adds the value, and clearing it sends `null`.
- Player lists and roster surfaces render an absent position as `Sin especificar` and omit absent measurements.
- Closing the `/jugadores/nuevo` compatibility sheet returns to `/jugadores`.
- Toasts provide success and error feedback.

## Service Selection

- Uses `apiPlayerService` by default.
- Uses `mockPlayerService` when `VITE_USE_MOCK_API=true`.
- Team data comes from `teamService`, which is API or mock depending on `VITE_USE_MOCK_API`.

## Positions

Current position codes are:

- `PG`
- `SG`
- `SF`
- `PF`
- `C`

## Non-Scope

- Player detail remains out of scope; no inert detail action is displayed.
- Team roster management remains canonical under `/equipos/:teamId`.
- The global registry does not display photos, age, status, stats, creator, or synthetic metadata.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify list, filters, create, edit, and delete flows with backend or mocks.
