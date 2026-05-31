# Backend Contracts

## Current Integration Model

The frontend can use the backend for auth, teams, and players. It uses mocks for matches, videos, and analysis.

Service selection happens in `src/services/registry.ts`.

## Environment Variables

- `VITE_API_BASE_URL`: backend API base URL.
- `VITE_API_URL`: fallback supported by `src/services/api/http-client.ts`.
- `VITE_USE_MOCK_API=true`: use local mocks for auth, teams, and players.

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

Mock-only services:

- Matches: `mockMatchService`.
- Videos: `mockVideoService`.
- Analysis: `mockAnalysisService`.

## Known Standalone Helper

`src/api.ts` exposes:

- `API_BASE_URL`: derived from `VITE_API_BASE_URL` with trailing slash removed.
- `fetchHealth()`: GET request to `/health`.

This helper is separate from `src/services/api/http-client.ts`.

## Contract Source Of Truth

- Frontend domain types are in `src/types/index.ts`.
- Service method shapes are in `src/services/contracts`.
- Backend response mapping lives in `src/services/api/mappers.ts`.
- Any backend contract change should update the relevant service contract, API implementation, mapper, and spec document together.
