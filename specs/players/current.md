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
- `src/pages/players/PlayerAnalysisStatsSheet.tsx`
- `src/pages/players/player-analysis-stats.ts`
- `src/services/registry.ts`
- `src/services/contracts/players.service.ts`
- `src/services/api/players.api.ts`
- `src/services/mock/players.mock.ts`
- `src/services/contracts/teams.service.ts`
- `src/services/contracts/player-analysis.service.ts`
- `src/services/api/player-analysis.client.ts`
- `src/services/api/player-analysis.api.ts`
- `src/services/mock/player-analysis.mock.ts`
- `tests/player-analysis-stats.test.ts`
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
- Create player requires first name, last name, position, birth date, valid height, and valid weight.
- Create and edit surfaces share the same player-field component and validation schema.
- Create and edit forms set today's local date as the maximum birth date and
  reject a future value before calling the player service.
- Closing the `/jugadores/nuevo` compatibility sheet returns to `/jugadores`.
- Toasts provide success and error feedback.
- Each player row has an icon button ("Ver estadísticas") that opens a read-only right-side sheet with the player's aggregated stats measured in analyzed videos. Data is fetched only when the sheet opens (no per-row requests) from `GET /players/{id}/analysis-stats` and `GET /players/{id}/shot-chart`.
- The stats sheet shows summary cards (analyzed videos, points, field goals, 2-pointers, 3-pointers, shots without result, time visible on screen, distance), a per-zone table, a read-only shot chart, a per-video list, and the list of stats not measured. It states that these are not official match statistics and that they may take a few minutes to update after roster changes.
- Percentages from `analysis-stats` are fractions (0..1); they are converted to a displayed percent only in `player-analysis-stats.ts`.
- The stats sheet has loading, error with retry, and empty (no analyzed videos) states; a shot chart failure does not hide the stats.

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
- The global registry list does not display photos, age, status, inline stats, creator, or synthetic metadata.
- Aggregated analysis stats are shown read-only only inside the sheet opened from the global players page; there is no player detail route.
- The team roster page (`/equipos/:teamId`) does not show player stats.
- Minutes played, rebounds, assists, steals, blocks, turnovers, and free throws are not measured and are not displayed as numbers.
- `GET /players/{id}/stats` (`players.stats`) and the sync status `player_stats_sync` are not consumed.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify list, filters, create, edit, and delete flows with backend or mocks.
