# Backend Contracts

## Current Integration Model

The frontend can use the backend for auth, teams, players, videos, matches, and clip collections. It also uses the real processing-job backend for analysis jobs (jobs, team sides, stats, shot chart, court positions, similar clips) and the player analysis stats endpoints. It uses mocks only for the legacy analysis sessions.

Service selection happens in `src/services/registry.ts`.

## Environment Variables

- `VITE_API_BASE_URL`: backend API base URL.
- `VITE_API_URL`: fallback supported by `src/services/api/http-client.ts`.
- `VITE_USE_MOCK_API=true`: use local mocks for auth, teams, players, videos, matches, and clip collections.

`.env.example` currently points `VITE_API_BASE_URL` to the deployed backend and documents the mock toggle.

## HTTP Client

`src/services/api/http-client.ts` defines:

- `API_BASE_URL`: from `VITE_API_BASE_URL`, then `VITE_API_URL`, then `http://localhost:8005`.
- `apiFetch`: fetch wrapper with JSON content-type handling (not set when the body is `FormData`, so the browser adds the multipart boundary), credentials, bearer token, and refresh-on-401 support.
- `apiJson`: JSON helper that throws parsed API errors and handles `204` responses.

## Auth Token Behavior

- Access token is read through `getStoredToken`.
- Authenticated requests send `Authorization: Bearer <token>`.
- On `401`, the client attempts `POST /auth/refresh` with `credentials: include`.
- A successful refresh stores the new access token and retries once.
- Failed refresh clears the stored token.

## Currently Real Or Mocked

Backend-capable services:

- Auth: `apiAuthService` or `mockAuthService`.
- Teams: `apiTeamService` or `mockTeamService`.
- Players: `apiPlayerService` or `mockPlayerService`.
- Videos: `apiVideoService` or `mockVideoService`.
- Clip collections: `apiClipCollectionService` or `mockClipCollectionService`.
- Matches: `apiMatchService` or `mockMatchService`.
- Player analysis stats: `apiPlayerAnalysisService` or `mockPlayerAnalysisService` (follows `VITE_USE_MOCK_API`).

Always real API (no mock):

- Analysis jobs: `analysisJobService`, `analysisJobTeamSideService`, `analysisJobStatsService`, `analysisJobShotChartService`, `analysisJobCourtPositionsService`, and `analysisJobSimilarService`.

Mock-only services:

- Analysis (legacy sessions): `mockAnalysisService`.

## Teams Backend Integration

`GET /teams`, `POST /teams`, and `PUT /teams/{id}` carry `is_own` (boolean, default false), mapped to `Team.isOwn` (a missing value is read as false). `GET /teams` returns own teams first. `POST` accepts an optional `is_own` (default false). `PUT` replaces the four identity fields and keeps the stored `is_own` when it is omitted or null, so the frontend sends `is_own` only when it is defined.

## Matches Backend Integration

Endpoints under `/matches` require bearer auth; ownership comes from the token. Client: `src/services/api/matches.client.ts` (pure mappers and error parsing) and `src/services/api/matches.api.ts`.

- `POST /matches` with `home_team_id`, `away_team_id`, `match_date` (`YYYY-MM-DD`), optional `description` (max 2000) returns `201 {match}`. Errors: `422 INVALID_MATCH_TEAMS`, `404 TEAM_NOT_FOUND`.
- `GET /matches?team_id=` returns `{matches[]}` sorted by date descending, with the full stats of each match and no pagination.
- `GET /matches/{id}/stats` returns `{match, participants[]}`. A non-UUID id returns a FastAPI `422 {detail:[...]}`, not 404.
- `POST /matches/stats/import-preview` (multipart: `file` up to 5 MiB, `home_team_id`, `away_team_id`, optional `allow_team_mismatch`) returns `winner_team_id`, `participants[]`, `stats` (`source` `cabb_excel`, `schema_version` 1, `title`, `competition`, `teams.HOME/AWAY`, `players[]`), and `report` (`teams[]`, `linked_players[]`, `unlinked_players[]` with `reason`, `warnings[]`). Nothing is saved. The file decides which table is HOME; players are linked and the winner is computed only when both team ids are sent. `winner_team_id` is null on a tie. Errors: `422 INVALID_STATS_FILE`, `422 TEAM_MISMATCH` (`details.teams[]`), `422 INVALID_MATCH_TEAMS`, `413 STATS_FILE_TOO_LARGE`, `404 TEAM_NOT_FOUND`.
- `PUT /matches/{id}/stats` with `stats`, `winner_team_id`, `participants[]` is a full replace in one transaction (omitted winner or participants are cleared) and does not re-check `TEAM_MISMATCH`. Errors: `422 INVALID_WINNER_TEAM`, `404 PLAYER_NOT_FOUND`, `404 MATCH_NOT_FOUND`. The frontend sends the raw snake_case preview data unchanged.
- `PATCH /matches/{id}` with any subset of `match_date` (`YYYY-MM-DD`, not null) and `description` (max 2000, `null` clears); omitted keys stay unchanged and unknown fields (such as teams) are `422`. Returns `200 {match}`; `404 MATCH_NOT_FOUND`. The frontend sends only the provided keys.
- `PUT /videos/{video_id}/match` with `{team_id, match_id}` (both required; `match_id: null` unlinks; linking again overwrites) returns `200 {video}`. Errors: `404 TEAM_NOT_FOUND`, `404 VIDEO_NOT_FOUND` (also a wrong team or a deleted video), `404 MATCH_NOT_FOUND`, `422 VIDEO_TEAM_NOT_IN_MATCH` (the video's team is neither home nor away), FastAPI `422 {detail:[...]}` for a bad UUID or a missing field. Every video object carries `match_id` (string or null); the frontend maps it to `Video.linkedMatchId`. Videos can be partial clips, so no totals are compared.
- The backend has no `DELETE /matches/{id}` and no roster endpoints; the teams of a match never change.
- Player link is by jersey number only. `participants` holds only players who played; players with 0 minutes exist only in `stats.players` with `played: false`.
- The preview request uses a 60-second timeout instead of the 20-second default.

Two error envelopes exist: `{"error":{"code","message","details"?}}` and FastAPI `{"detail":[...]|"..."}` (mapped to `VALIDATION_ERROR` only for status 422; other statuses such as 404/405 keep a null code). Messages and warnings are English strings, so the frontend maps codes to Spanish copy and keeps the backend message as a secondary technical detail.

Percentage convention: the match preview and stored stats use `pct` as 0..100 with one decimal, or `null` without attempts. The frontend displays it as is and never recomputes it.

## Videos Backend Integration

Backend videos endpoints exist under `/videos` and require bearer auth. The frontend API service uses team-scoped multipart upload semantics:

- `POST /videos/upload/init` with `team_id`, `title`, optional `description`, optional `content_type`, and `part_count`.
- `POST /videos/{video_id}/upload/complete` with `team_id`, `upload_id`, optional media metadata, and uploaded part ETags.
- `POST /videos/{video_id}/upload/abort` with `team_id` and `upload_id`.
- `GET /videos?team_id=<uuid>&status=<optional>`.
- `GET /videos/{video_id}?team_id=<uuid>`.
- `PATCH /videos/{video_id}`.
- `DELETE /videos/{video_id}?team_id=<uuid>`.

Current limits:

- Backend video upload is team-scoped; it is no longer tied to a frontend `matchId`.
- Backend statuses are mapped to frontend statuses: `READY -> uploaded`, `PENDING_UPLOAD -> processing`, `FAILED -> failed`.
- `requestAnalysis(videoId)` is only available in mock mode because the backend does not expose analysis request endpoints yet.
- `storage_key` is internal object metadata and is not used as a browser URL.
- For a ready video, `apiVideoService.getById` calls `GET /videos/{video_id}?team_id=...` and maps the returned `presigned_playback_url` to the frontend `storageUrl`.
- The same detail response may include nullable `presigned_thumbnail_url`; the frontend maps it to `thumbnailUrl` and uses it as the native video poster. It is a fresh signed URL with the backend's current 3600-second lifetime, not a public stable URL.
- `GET /videos?team_id=...` deliberately does not include a thumbnail field. After rendering that base catalog, Partidos progressively calls the existing detail endpoint with at most four concurrent requests. Signed poster URLs are cached in memory for 55 minutes; null and failed lookups keep the schematic fallback and are negatively cached for five minutes. No additional backend contract is required.
- Non-ready videos do not request a presigned playback URL.

## Clip Collections Backend Integration

Authenticated clip collection endpoints are scoped to an owned video:

- `POST /videos/{video_id}/collections`.
- `GET /videos/{video_id}/collections`.
- `GET /videos/{video_id}/collections/{collection_id}`.
- `POST /videos/{video_id}/collections/{collection_id}/clips`.
- `POST /videos/{video_id}/collections/{collection_id}/clips/batch`.
- `PATCH /videos/{video_id}/collections/{collection_id}/clips/{item_id}`.
- `POST /videos/{video_id}/collections/{collection_id}/clips/{item_id}/export`.
- `DELETE /videos/{video_id}/collections/{collection_id}/clips/{item_id}`.

The API service maps backend snake_case payloads to frontend camelCase types. Collection items are virtual ranges containing `id`, `start_ms`, `end_ms`, nullable `description`, and `position`; they do not contain per-clip file metadata. Create and batch payloads accept the optional `description` with a backend maximum of 200 characters, while legacy responses without the field normalize it to `null`.

Current limits:

- Range duration is limited to 30 seconds and validated against `video.duration_ms` when known.
- Playback uses the original video URL plus the item's temporal range.
- Export synchronously generates or reuses a physical clip and returns `download_url`.
- Collection update/delete and item reorder endpoints do not exist. The backend can update only an item's description through PATCH; frontend editing of existing descriptions is not included yet.

## Player Analysis Stats

Bearer auth, ownership from the token. Used by the stats sheet on `/jugadores`. Client: `src/services/api/player-analysis.client.ts`.

- `GET /players/{id}/analysis-stats`: `player_id`, `calc_version`, `games` (analyzed videos, not official games), `points`, `field_goals` / `two_point` / `three_point` (`made`, `attempted`, `pct`), `unresolved_attempts`, `seconds_on_screen` (visible time, not minutes played) and `distance_m` (both nullable), `by_zone` and `by_shot_type` (`made`, `attempted`, `unresolved_attempts`, `pct`), `videos[]` (per job: `job_id`, `video_id`, `video_title`, `jersey_number`, `seconds_on_screen`, `distance_m`, `points`, field goal / two point / three point made and attempted, `unresolved_attempts`), and `not_measured[]`. A player without analyzed videos returns 200 with zeros, nulls, empty collections, and the full `not_measured` list.
- `GET /players/{id}/shot-chart`: `player`, `calc_version`, `court` (28 x 15 m, hoops, three-point radius, corner three lateral), `shots[]`, and `coverage` (`shots_charted`, `made`, `missed`, `unresolved`, `videos`). Each shot has a unique `shot_key` (shot ids repeat across jobs), `x_m`, `y_m`, `result` (`made`, `missed`, `unknown`), `shot_value` (2 or 3, worth by location, not points scored), `zone`, `shot_type`, `distance_m`, `timestamp_seconds`, `outcome_confidence`, and `needs_review`. The frontend uses `result`, not the boolean `made`, which is false for both missed and unknown shots. `y_m = 15` is the sideline nearest the camera and positions are not flipped per team, so the court side may not match the attacked hoop.

Percentage conventions differ by endpoint and must not be mixed:

- `analysis-stats` `pct`: fraction 0..1 or `null` when there are no attempts. The client keeps the fraction; conversion to a percent happens only when formatting for display.
- `players.stats` (the `stats` field of every `GET /players` item; canonical shape `games_played`, `points.total`, `field_goals.made_total` / `attempted_total` / `percentage`, etc.): integers; `percentage` is an integer 0..100 that is 0 when there are no attempts, so the frontend never displays it. The list row reads only `games_played`, `points.total`, and `field_goals.made_total` / `attempted_total` and computes the percent from made/attempted. Older backends may omit `stats`; a missing or malformed value maps to no summary ("Sin análisis").
- `GET /players/{id}/stats` (not consumed by the frontend): same shape.
- Match stats (import preview and stored box score, consumed by Matches): `pct` is 0..100 with one decimal, or `null` without attempts; shown as is, never recomputed. `name_score` and `roster_score` in the preview report are 0..1.

`PUT /jobs/{job_id}/our-team` now returns `{ job, player_stats_sync }` (the `job` object is unchanged). `analysis-job-team-sides.client.ts` reads only `job` and ignores `player_stats_sync`.

## Known Standalone Helper

`src/api.ts` exposes:

- `API_BASE_URL`: derived from `VITE_API_BASE_URL` with trailing slash removed.
- `fetchHealth()`: GET request to `/health`.

This helper is separate from `src/services/api/http-client.ts`.

## Contract Source Of Truth

- Frontend domain types are in `src/types/index.ts`.
- Service method shapes are in `src/services/contracts`.
- Backend response mapping lives in `src/services/api/mappers.ts` and feature-specific API service mappers.
- Any backend contract change should update the relevant service contract, API implementation, mapper, and spec document together.
