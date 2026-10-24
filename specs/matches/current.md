# Matches Current Spec

> Status (2026-10-24): Matches (`Partidos`) is a real feature backed by the `/matches` backend. This release (phase 1) adds the list, the create form, the Excel/CSV box-score import with preview, and the box-score detail, with no backend change. The sections below are the acceptance criteria of this release. The pre-migration "Partido = video" behavior now lives under Videos; see `specs/video-reorganization/current.md` (Legacy compatibility).

## Product model

- A Match is a sporting game: home team, away team, date (`YYYY-MM-DD`), optional description, optional winner, and an optional box score.
- The box score comes from the federation spreadsheet and is shown with the source label `Planilla de estadísticas de la federación`.
- Matches and videos are not linked in this release; linking a match to several videos is planned for a later phase (a video belongs to at most one match; videos can be partial clips, so no totals comparison is planned). The later phase would show a `Videos del partido` list on the match page and a `Partido` link on the video page. This release adds no video link, no video picker, and no link wording in the UI. The link needs an additive backend migration that is not part of this release. Editing the date and description of a match (PATCH) is planned together with the link; the teams of a match stay fixed.
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
- Endpoints: `GET /matches?team_id=`, `POST /matches`, `GET /matches/{id}/stats` (match plus participants), `POST /matches/stats/import-preview` (multipart, nothing saved), `PUT /matches/{id}/stats` (full replace).
- The backend has no `PUT`/`DELETE /matches/{id}`: teams, date, and description cannot be edited and a match cannot be deleted. The import page states once: `Equipos, fecha y descripción todavía no se pueden editar.`
- Percentages (`pct`) come from the backend as 0..100 with one decimal (or `null` without attempts) and are never recomputed; they are formatted in `es-AR` with one decimal and a comma (`66,7%`), and `null` renders `—`.
- The saved body is the raw snake_case preview data (`stats`, `winner_team_id`, `participants`), unchanged. The frontend never sends camelCased stats back.
- The match date is formatted by splitting the `YYYY-MM-DD` string (`dd/mm/aaaa`), without `Date`, so there is no timezone shift.

## List (`/partidos`)

- `PageHeader` `Partidos` with the action `Nuevo partido`.
- Each row links to the detail and shows date, `{Local} vs {Visitante}`, the score when stats exist, a badge `Estadísticas cargadas` or `Sin estadísticas`, and a truncated description. A team that cannot be resolved shows `Equipo no disponible`.
- Loading, error with `Reintentar`, session expiry (as the Videos page), and the empty state `Todavía no cargaste partidos` are explicit.

## Create and import flow (`/partidos/nuevo`)

- Fields: home team (required, `Elegí el equipo local`), away team (required, different from home, `Elegí un equipo distinto al local`), date (`YYYY-MM-DD`, defaults to today, future dates allowed), description (optional, trimmed, max 2000 characters with a live counter, `Máximo 2000 caracteres`). Team options come from `teamService.list()` and the away list disables the home team. With fewer than two teams an empty state links to `/equipos`.
- Optional `Importar estadísticas (opcional)` dropzone (keyboard-focusable). Accepts `.xlsx` or `.csv` (case-insensitive), non-empty, at most 5 MiB (`El archivo supera 5 MB`); anything else is rejected before upload with `Elegí la planilla de la federación en .xlsx o .csv`. The chosen file shows name and size with `Quitar`.
- Without a file, `Crear partido` calls `POST /matches` and opens the detail.
- With a file, `Revisar estadísticas` calls the preview with both selected team ids. Nothing is created until the user confirms. The preview request is `multipart/form-data` with a 60-second timeout.
- The backend decides which table is HOME from the file and links players and computes the winner only when both team ids are sent, so both ids are always sent (the form ids when creating, the match ids when re-importing).
- `TEAM_MISMATCH`: one alert per entry, `Elegiste {equipo} como Local, pero en el archivo figura «{nombre}».`, with `Cambiar equipos` and `Importar igual` (repeats the preview with `allow_team_mismatch`).
- The preview shows competition/title, the scoreline and `Ganó {equipo}` or `Empate`, per team the name found in the file, players in the file and who played, whether it matches the selected team, linked players (file name to roster name), unlinked players with the reason, backend warnings under `Avisos`, one box-score table per team, a `Qué se va a guardar` summary (players who played, linked, winner), and `Ver los datos exactos` with the JSON to be saved.
- Players are linked only by jersey number: exactly one roster player of the selected team with that number. Unlinked reasons: no roster player with the number, more than one with the number, the file has no number, no team selected. Unlinked players are saved with the file name, without a roster link.
- `Guardar partido y estadísticas` performs `POST /matches` and then `PUT /matches/{id}/stats`. If the PUT fails, the created match id is kept: the toast `El partido se creó pero no se guardaron las estadísticas`, a retry that repeats only the PUT (never a second POST), and a link to the detail are shown.
- Buttons are disabled while a request is pending (single-flight).

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

- Error codes are mapped to Spanish copy; the backend message (English) is kept as a secondary `Detalle técnico`. Codes: `MATCH_NOT_FOUND`, `TEAM_NOT_FOUND`, `PLAYER_NOT_FOUND`, `INVALID_MATCH_TEAMS`, `INVALID_WINNER_TEAM`, `INVALID_STATS_FILE`, `STATS_FILE_TOO_LARGE`, `TEAM_MISMATCH`, `VALIDATION_ERROR`.
- Two backend error envelopes are handled: `{error:{code,message,details?}}` and FastAPI `{detail:[...]|string}` (mapped to `VALIDATION_ERROR`); plain-text errors keep a null code.
- A players export such as `celtics_roster_25_26.csv` is not a box score and yields `INVALID_STATS_FILE`.
- Backend warning strings are translated when they match a known pattern and shown verbatim otherwise.
- A 401 follows the shared refresh-once behavior.

## Mock behavior (`VITE_USE_MOCK_API=true`)

- `mockMatchService` keeps matches in memory (no seed data, independent from the legacy mock store): create validates that the teams differ, list is sorted by date descending, `getWithParticipants` throws `MATCH_NOT_FOUND`, `saveStats` stores what it receives.
- `previewStatsImport` always fails with `INVALID_STATS_FILE` and the message `La vista previa de la planilla necesita el backend real.` No numbers are invented.

## Non-scope

- No video link or video picker in this release (linking a match to several videos is planned for a later phase).
- No editing or deleting of a match (teams, date, description) and no manual stats entry.
- No roster endpoints; participants are saved only through the stats import.
- No pagination or filters beyond what the list needs; `GET /matches` returns every match with its stats.
- No backend change.

## Verification

- Tests cover the API client mappers and error envelopes, the multipart request (no JSON content type), the create form rules, file checks, reason/warning/error copy, the create-then-save recovery, the box-score formatters, the nav and route changes, and the `?tab=` redirect.
- Run the Node test suite, `npx tsc -b`, `npm run lint`, `npm run build`, and `git diff --check`.
