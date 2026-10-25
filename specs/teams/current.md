# Teams Current Spec

## Status

Current behavior documentation.

## Routes

- `/equipos`
- `/equipos/:teamId`

## Files Involved

- `src/pages/teams/TeamsPage.tsx`
- `src/pages/teams/TeamDetailPage.tsx`
- `src/pages/teams/TeamFormDialog.tsx`
- `src/pages/teams/TeamRosterPlayerSheet.tsx`
- `src/pages/teams/team-roster.ts`
- `src/pages/players/PlayerFormFields.tsx`
- `src/pages/players/player-form.ts`
- `src/pages/videos/video-team-navigation.ts`
- `src/services/registry.ts`
- `src/services/contracts/teams.service.ts`
- `src/services/api/teams.api.ts`
- `src/services/mock/teams.mock.ts`
- `src/services/contracts/players.service.ts`
- `src/types/index.ts`

## Current Behavior

- `/equipos` is a simple team index. It shows real identity and location data,
  and links each team to its canonical roster at `/equipos/:teamId`.
- Player counts are derived from one player-list request. Counts are omitted if
  that secondary request fails; the team list remains usable.
- Team create and edit share a short dialog with name, short name, city,
  country, and the checkbox `Es mi equipo` (`isOwn`; checked by default on create,
  the stored value on edit). Delete remains secondary and requires confirmation.
- `/equipos/:teamId` loads team identity and roster in parallel using
  `teamService.getById()` and `playerService.filterByTeam()`.
- The roster prioritizes jersey number, name, position, and physical measurements.
- Player create and edit happen in a right-side sheet so team and roster context
  stay visible. Create supports `Guardar` and `Guardar y agregar otro`.
- Existing players can be searched and assigned. Assigning a player who belongs
  to another team explicitly warns that the player will move.
- There is no remove-from-team action because the backend does not expose one.
- Deleting a player is only available inside edit as `Eliminar jugador del sistema`.
- Duplicate jersey numbers are allowed but produce an inline form warning, a
  discreet roster indicator on every affected player, and a warning that automatic
  analysis-to-roster linking by jersey will be ambiguous.

## Acceptance Criteria

- A team is either own (`Mi equipo`) or a rival; own teams are not the only ones
  allowed: videos and analysis stay available for all teams. Existing teams start
  as rivals. One or many teams can be own.
- Every team list or picker shows own teams first (stable order otherwise) with a
  `Mi equipo` badge. Lookup maps and the video list of a match are not reordered.
- `/equipos` has a segmented filter `Mis equipos` / `Rivales` / `Todos`, combined
  with the search. The default is `Mis equipos` when any team is own, otherwise
  `Todos`; it is set once after the first load and not reset on reloads. With no own
  teams marked, the filter shows `No tenés equipos marcados como propios. Editá un
  equipo y marcá 'Es mi equipo'.`
- Teams created from the Equipos form default to own; teams created inline from
  the match, import, or analysis flows default to rival (`isOwn: false`).
- Team UI uses only `name`, `shortName`, `city`, `country`, and `isOwn` as productive data.
- `Ver plantel` is the primary team action; video links and synthetic KPIs are not
  presented on the team index.
- Loading, error, empty, no-results, and retry states exist for the team index and
  roster without turning an optional count failure into a page failure.
- Player forms require the real backend fields. Jersey number stays optional text
  of one or two digits, so `0` and `00` remain distinct as defined by the backend.
- Duplicate jersey warnings never block, renumber, or claim a backend constraint.
- `/jugadores` and `/jugadores/nuevo` remain available as compatibility surfaces.

## Service Selection

- Uses `apiTeamService` by default.
- Uses `mockTeamService` when `VITE_USE_MOCK_API=true`.
- Player list comes from `playerService`, which is API or mock depending on `VITE_USE_MOCK_API`.

## Non-Scope

- No new backend endpoint is requested here.
- No remove-from-team behavior is simulated.
- The global `/jugadores` information architecture is deferred to R6-B.
- Report, mobile, and backend changes are excluded.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify list, search, create, edit, delete, and link flows with backend or mocks.
