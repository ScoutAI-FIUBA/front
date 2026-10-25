# Matches Current Spec

> Status (2026-10-24): Matches (`Partidos`) is a real feature backed by the `/matches` backend. Phase 1 added the list, the create form, the Excel/CSV box-score import with preview, and the box-score detail. Phase 2 adds linking videos to a match and editing the date and description of a match; it needs the backend `PUT /videos/{id}/match` and `PATCH /matches/{id}` endpoints. The sections below are the acceptance criteria of this release. The pre-migration "Partido = video" behavior now lives under Videos; see `specs/video-reorganization/current.md` (Legacy compatibility).

## Product model

- A Match is a sporting game: home team, away team, date (`YYYY-MM-DD`), optional description, optional winner, and an optional box score.
- The box score comes from the federation spreadsheet and is shown with the source label `Planilla de estadísticas de la federación`.
- A match can have many videos and a video belongs to at most one match. Videos may be partial clips or the whole game, so nothing is compared or combined: no totals, no detected stats, no comparison between the video and the box score. The link is only a reference. The teams of a match never change.
- The legacy mock `Match`, `MatchStatus`, `MatchRoster`, and `GameEvent` types remain only for the legacy mock analysis sessions (`/analisis/:id`); they are marked `@deprecated` and Matches does not use them.

## Routes and navigation

- `/partidos`: match list.
- `/partidos/nuevo`: create a match, optionally importing statistics in the same flow.
- `/partidos/:matchId`: match detail with the box score.
- `/partidos/:matchId/estadisticas`: import (or replace) the statistics of an existing match.
- Primary navigation is `Inicio / Videos / Partidos / Equipos / Jugadores`. Inicio has no `Partidos` link; the entry is reachable from the shell only.
- Route builders are in `src/pages/partidos/match-routes.ts`. Pages live in `src/pages/partidos/`; `src/pages/matches/` is the Videos code (legacy folder name).
- `/partidos/:matchId` with a `?tab=` search param is a legacy video link: it redirects (`replace`) to `/videos/:videoId` preserving search and hash (see `specs/video-reorganization/current.md`). Without `tab`, the id is treated as a match id. An old `/partidos/:videoId` link without `tab` shows the not-found state with a secondary link to Videos.

## Backend integration

- Service: `matchService` (`contracts/matches.service.ts`) uses the real backend unless `VITE_USE_MOCK_API=true` (`api/matches.api.ts`, pure mapping and error parsing in `api/matches.client.ts`).
- Endpoints: `GET /matches?team_id=`, `POST /matches`, `GET /matches/{id}/stats` (match plus participants), `POST /matches/stats/import-preview` (multipart, nothing saved), `PUT /matches/{id}/stats` (full replace), `PATCH /matches/{id}` (date and description only), and `PUT /videos/{id}/match` (link or unlink a video).
- There is no `DELETE /matches/{id}` and the teams of a match can never change. The import page states once: `Los equipos todavía no se pueden editar.`
- Percentages (`pct`) come from the backend as 0..100 with one decimal (or `null` without attempts) and are never recomputed; they are formatted in `es-AR` with one decimal and a comma (`66,7%`), and `null` renders `—`.
- The saved body is the raw snake_case preview data (`stats`, `winner_team_id`, `participants`), unchanged. The frontend never sends camelCased stats back.
- The match date is formatted by splitting the `YYYY-MM-DD` string (`dd/mm/aaaa`), without `Date`, so there is no timezone shift.

## List (`/partidos`)

- `PageHeader` `Partidos` with the action `Nuevo partido`.
- Each row links to the detail and shows date, `{Local} vs {Visitante}`, the score when stats exist, a badge `Estadísticas cargadas` or `Sin estadísticas`, and a truncated description. A team that cannot be resolved shows `Equipo no disponible`.
- Loading, error with `Reintentar`, session expiry (as the Videos page), and the empty state `Todavía no cargaste partidos` are explicit.

## Create and import flow (`/partidos/nuevo`)

- Fields: home team (required, `Elegí el equipo local`), away team (required, different from home, `Elegí un equipo distinto al local`), date (`YYYY-MM-DD`, defaults to today, future dates allowed), description (optional, trimmed, max 2000 characters with a live counter, `Máximo 2000 caracteres`). Team options come from `teamService.list()` and the away list disables the home team. With fewer than two teams the form still opens, because each side offers `Crear equipo nuevo` (see below).
- Optional `Importar estadísticas (opcional)` dropzone (keyboard-focusable). Accepts `.xlsx` or `.csv` (case-insensitive), non-empty, at most 5 MiB (`El archivo supera 5 MB`); anything else is rejected before upload with `Elegí la planilla de la federación en .xlsx o .csv`. The chosen file shows name and size with `Quitar`.
- Without a file, `Crear partido` calls `POST /matches` and opens the detail.
- With a file, `Revisar estadísticas` calls the preview with both selected team ids. Nothing is created until the user confirms. The preview request is `multipart/form-data` with a 60-second timeout.
- The backend decides which table is HOME from the file and links players and computes the winner only when both team ids are sent, so both ids are always sent (the form ids when creating, the match ids when re-importing).
- `TEAM_MISMATCH`: one alert per entry, `Elegiste {equipo} como Local, pero en el archivo figura «{nombre}».`, with `Cambiar equipos` and `Importar igual` (repeats the preview with `allow_team_mismatch`).
- The preview shows competition/title, the scoreline and `Ganó {equipo}` or `Empate`, per team the name found in the file, players in the file and who played, whether it matches the selected team, linked players (file name to roster name), unlinked players with the reason, backend warnings under `Avisos`, one box-score table per team, a `Qué se va a guardar` summary (players who played, linked, winner). The raw JSON to be saved is never shown.
- Players are linked only by jersey number: exactly one roster player of the selected team with that number. Unlinked reasons: no roster player with the number, more than one with the number, the file has no number, no team selected. Unlinked players are saved with the file name, without a roster link.
- `Guardar partido y estadísticas` performs `POST /matches` and then `PUT /matches/{id}/stats`. If the PUT fails, the created match id is kept: the toast `El partido se creó pero no se guardaron las estadísticas`, a retry that repeats only the PUT (never a second POST), and a link to the detail are shown.
- Buttons are disabled while a request is pending (single-flight).

## Picking or creating the teams (`/partidos/nuevo`)

- The preview endpoint also works without team ids (`home_team_id` and `away_team_id` are optional in the multipart body). When a file is chosen the page first reads it that way (nothing is saved) only to learn the team names of the file (`report.teams[].excel_name`, falling back to `stats.teams.{HOME,AWAY}.name`).
- Each side then suggests the closest existing team (`teamService.list()`), shown as `Parece ser {equipo}` with `Usarlo` to confirm; the select stays available to pick another one. Nothing is selected automatically. If nothing is close enough the side says `En la planilla figura «{nombre}»` and offers `Crear equipo nuevo`.
- Matching is pure logic in `src/pages/partidos/team-suggestion.ts`: names are lowercased, stripped of accents and punctuation, generic words (club, c.a., cd, asociación, deportivo, básquet…) are dropped, and token overlap is scored. It is deliberately conservative: a wrong suggestion is worse than none. Names that differ only in a number or a single letter (`Sub 17` vs `Sub 19`, `Equipo A` vs `Equipo B`) never match. Two near-equal candidates give no suggestion. The same team is never suggested for both sides.
- `Crear equipo nuevo` (both sides, also without a file) opens a dialog with the name prefilled from the file and editable. A team is only created on an explicit click. If the typed name is similar to an existing team the dialog shows `Ya existe {equipo}, ¿es el mismo?` with `Usar {equipo}` and requires a second deliberate action, `Crear igual`, to create it. Single-flight; the new team is added to the lists and selected for that side.
- The backend requires `name`, `short_name`, `city` and `country` to create a team. The quick-create dialog asks for the name, the city (empty, required) and the country (prefilled `Argentina`, editable); `shortName` is the first 3 letters of the name in capitals (as the Equipos form does). The button stays disabled until all three are filled. Everything can be edited later in Equipos.
- `TEAM_MISMATCH` and `Importar igual` keep working and use the current form values. The re-import page (`/partidos/:matchId/estadisticas`) is unchanged: the teams of an existing match are fixed.
- With `VITE_USE_MOCK_API=true` the file read fails like the preview (`La vista previa de la planilla necesita el backend real.`), no suggestions appear, and creating a team works in memory.

## Videos of a match (`/partidos/:matchId`)

- Section `Videos del partido` (`MatchVideosSection`) with the note `Pueden ser clips o el partido completo.` It loads `videoService.filterByTeam` for the home and the away team in parallel and lists the videos whose `linkedMatchId` is the match (title, team name, upload date, `Abrir video` to `/videos/:id`, `Desvincular`). It shows no totals, no detected stats and no comparison.
- Rules: one match, many videos; a video, at most one match. Only videos of the home or the away team can be linked (`VIDEO_TEAM_NOT_IN_MATCH`: `Ese video es de un equipo que no juega este partido.`). Failed videos are not offered.
- `Vincular video` opens a dialog with a select grouped by team. A video already linked to this match is shown as `Ya está vinculado a este partido` (disabled). A video linked to ANOTHER match is labelled `Ya está vinculado a otro partido`; choosing it shows a checkbox `Se va a mover a este partido` that must be ticked before the button (`Mover y vincular`) is enabled, because the backend overwrites the previous link.
- `Desvincular` sends `match_id: null`, is single-flight, and shows the toast `Video desvinculado`; linking shows `Video vinculado`.
- States: loading (`Cargando videos…`), empty (`Todavía no vinculaste videos a este partido`), error with `Reintentar` (`No pudimos cargar los videos`), and neither team has videos (`Ninguno de los equipos tiene videos todavía`, link `Subir un video` to `/videos/subir`).
- The video page (`/videos/:id`) header shows `Partido: {Local} vs {Visitante} · dd/mm/aaaa` linking to `/partidos/:id` when the video is linked, or `Ver partido vinculado` if the match cannot be loaded. Nothing else on the video page changes.
- Every video from the backend carries `match_id`; the frontend field is `Video.linkedMatchId: string | null`. The legacy `Video.matchId` (legacy mock analysis) is untouched.

## Editing date and description

- `Editar fecha y descripción` on the detail opens a dialog with the date (`YYYY-MM-DD`) and the description (max 2000 characters with a counter), the same rules as the create form. The teams are shown read-only with `Para cambiar los equipos creá un partido nuevo.`
- Saving sends `PATCH /matches/{id}` with only the changed keys (an empty description is sent as `null` to clear it) and refreshes the header. Buttons are disabled while saving (single-flight).

## Re-import (`/partidos/:matchId/estadisticas`)

- Loads the match, uses its team ids, and offers the same dropzone, mismatch handling, and preview.
- Overwrite semantics: `PUT /matches/{id}/stats` is a full replace in one transaction (omitted winner or participants are cleared) and does not re-check `TEAM_MISMATCH`; the preview is the only guard and always the source of the saved payload. If the match already has stats, a confirmation dialog states `Esto reemplaza las estadísticas guardadas de este partido. No se puede deshacer.`
- After saving, the app navigates to the detail with a toast.

## Detail (`/partidos/:matchId`)

- Header: date, teams, score, winner or tie (the winner is null on a tie), description, competition. Source line: `Fuente: planilla de estadísticas de la federación`.
- One accessible table per team (native `<table>` with caption, `scope="col"`, player name as row header; columns # / Jugador / Min / Pts / 2P / %2P / 3P / %3P / TL / %TL / RO / RD / RT / Ast / Rec / Pér / Tap / Fal / Val / +/-), a totals footer (or `El archivo no trae totales del equipo` with only the points), a marker for players linked to the roster, and a `No jugaron:` line for players with 0 minutes. The wrapper scrolls horizontally and is keyboard-focusable.
- Stats formats: none shows `Este partido todavía no tiene estadísticas` with the import action; unknown shows `Estas estadísticas tienen un formato que esta versión no sabe mostrar`. The action reads `Importar estadísticas` or `Reemplazar estadísticas`.
- Not found (`MATCH_NOT_FOUND` or a validation error for a non-UUID id): `No encontramos este partido`, with the secondary link `¿Era un enlace viejo a un video? Abrilo en Videos`.
- Roster names come from `playerService.filterByTeam` for both teams; a failure there is tolerated.
- Match pages contain no estimated or detected numbers and no `Análisis IA` content.

## Errors

- Error codes are mapped to Spanish copy; the backend message (English) is kept as a secondary `Detalle técnico`. Codes: `MATCH_NOT_FOUND`, `TEAM_NOT_FOUND`, `PLAYER_NOT_FOUND`, `VIDEO_NOT_FOUND`, `VIDEO_TEAM_NOT_IN_MATCH`, `INVALID_MATCH_TEAMS`, `INVALID_WINNER_TEAM`, `INVALID_STATS_FILE`, `STATS_FILE_TOO_LARGE`, `TEAM_MISMATCH`, `VALIDATION_ERROR`.
- Two backend error envelopes are handled: `{error:{code,message,details?}}` and FastAPI `{detail:[...]|string}`. A FastAPI `detail` body is `VALIDATION_ERROR` only for status 422; any other status (for example `404 {"detail":"Not Found"}` or `405 {"detail":"Method Not Allowed"}`) keeps a null code with the detail text as the message. Plain-text errors keep a null code.
- An error with a null code shows the generic title `No pudimos completar la operación`, a Spanish description, and the backend message as `Detalle técnico`; the load and preview screens keep it retryable. If the preview request fails with a null-code 404 or 405 (a backend without the import route), the copy is `El servidor todavía no tiene la importación de planillas.`
- Choosing an invalid file while another file is selected removes the selected file and says so, so a rejected choice never submits the previous file. `Importar igual` re-validates the form and previews with the current form values, not the values captured when the mismatch arrived.
- Counts use correct singular and plural (`1 jugador que jugó`, `1 vinculado`). A page that is unmounted when a request finishes does not navigate or show a toast. A failure to load teams in the list does not fail the list (`Equipo no disponible`).
- A players export such as `celtics_roster_25_26.csv` is not a box score and yields `INVALID_STATS_FILE`.
- Backend warning strings are translated when they match a known pattern and shown verbatim otherwise.
- A 401 follows the shared refresh-once behavior.

## Mock behavior (`VITE_USE_MOCK_API=true`)

- `mockMatchService` keeps matches in memory (no seed data, independent from the legacy mock store): create validates that the teams differ, list is sorted by date descending, `getWithParticipants` throws `MATCH_NOT_FOUND`, `saveStats` stores what it receives.
- Mock video links live in memory and are lost on reload, while mock videos persist in localStorage; a dangling link shows `Ver partido vinculado` on the video page.
- `previewStatsImport` always fails with `INVALID_STATS_FILE` and the message `La vista previa de la planilla necesita el backend real.` No numbers are invented.

## Non-scope

- No combining of video and match numbers (no totals, no comparison, no detected stats on match pages).
- No deleting of a match, no changing its teams, and no manual stats entry.
- No roster endpoints; participants are saved only through the stats import.
- No pagination or filters beyond what the list needs; `GET /matches` returns every match with its stats.
- This repo makes no backend change; the link and the edit need the backend PR (back#33).

## Verification

- Tests cover the API client mappers and error envelopes, the multipart request (no JSON content type), the create form rules, file checks, reason/warning/error copy, the create-then-save recovery, the box-score formatters, the nav and route changes, and the `?tab=` redirect.
- Run the Node test suite, `npx tsc -b`, `npm run lint`, `npm run build`, and `git diff --check`.
