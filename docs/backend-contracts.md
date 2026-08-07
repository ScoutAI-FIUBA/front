# Backend Contracts

## Current Integration Model

The frontend can use the backend for auth, teams, players, videos, and clip collections. It uses mocks for matches and analysis.

Service selection happens in `src/services/registry.ts`.

## Environment Variables

- `VITE_API_BASE_URL`: backend API base URL.
- `VITE_API_URL`: fallback supported by `src/services/api/http-client.ts`.
- `VITE_USE_MOCK_API=true`: use local mocks for auth, teams, players, videos, and clip collections.

`.env.example` currently points `VITE_API_BASE_URL` to the deployed backend and documents the mock toggle.

## HTTP Client

`src/services/api/http-client.ts` defines:

- `API_BASE_URL`: from `VITE_API_BASE_URL`, then `VITE_API_URL`, then `http://localhost:8005`.
- `apiFetch`: fetch wrapper with JSON content-type handling, credentials, bearer token, and refresh-on-401 support.
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

Mock-only services:

- Matches: `mockMatchService`.
- Analysis: `mockAnalysisService`.

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
- Non-ready videos do not request a presigned playback URL.

## Clip Collections Backend Integration

Authenticated clip collection endpoints are scoped to an owned video:

- `POST /videos/{video_id}/collections`.
- `GET /videos/{video_id}/collections`.
- `GET /videos/{video_id}/collections/{collection_id}`.
- `POST /videos/{video_id}/collections/{collection_id}/clips`.
- `POST /videos/{video_id}/collections/{collection_id}/clips/batch`.
- `POST /videos/{video_id}/collections/{collection_id}/clips/{item_id}/export`.
- `DELETE /videos/{video_id}/collections/{collection_id}/clips/{item_id}`.

The API service maps backend snake_case payloads to frontend camelCase types. Collection items are virtual ranges containing `id`, `start_ms`, `end_ms`, and `position`; they no longer contain per-clip file metadata.

Current limits:

- Range duration is limited to 30 seconds and validated against `video.duration_ms` when known.
- Playback uses the original video URL plus the item's temporal range.
- Export synchronously generates or reuses a physical clip and returns `download_url`.
- Collection update/delete and item update/reorder endpoints do not exist.
- Manual-analysis labels are not part of this contract.

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
