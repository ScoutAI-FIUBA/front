# Backend Contract Alignment Spec

## Status

Draft.

## Area

Frontend/backend integration for auth, teams, players, and currently mocked domains.

## Current Behavior

- The backend currently exposes real HTTP routes for health, auth, teams, and players.
- The frontend uses real API services for auth, teams, and players unless `VITE_USE_MOCK_API=true`.
- The frontend keeps matches, videos, and analysis on mock services because the backend has no matching routes or feature contracts yet.
- Backend video-related support is only partial infrastructure through storage helpers; it is not a public videos feature contract.
- Backend AI support is generic infrastructure and does not define public analysis routes.

## Goal

Document the integration gaps found between `front/` and `back/` so future implementation work can be small, explicit, and coordinated with backend contract decisions.

## Summary Of Desynchronizations

- `POST /auth/logout` is authenticated on the backend, but `apiAuthService.logout` calls it with auth disabled, so no Bearer token is sent.
- `DELETE /auth/me` exists in the backend but is not represented in the frontend auth service contract.
- Frontend registration/user models include `fullName`, but the backend only accepts and returns email/password-derived user data plus role and email verification state.
- Frontend team types include optional `league`, `category`, `season`, and `logoUrl`, but the backend team contract only persists `name`, `short_name`, `city`, `country`, and `created_at`.
- Frontend player types include optional `jerseyNumber`, `photoUrl`, `status`, and `createdAt`, but the backend player contract does not accept or return those fields.
- Frontend player DTOs make `heightCm` and `weightKg` optional, while the backend requires `height_cm` and `weight_kg`.
- Some frontend service methods are client-side conveniences rather than backend routes: `team.getById`, `team.search`, `player.getById`, and `player.getTeamName`.
- Matches, videos, and analysis have frontend contracts and mocks, but no backend routes to integrate with yet.

## Classification

### Safe Frontend Changes

- Send auth on `POST /auth/logout` by removing the frontend override that disables authentication for that call.
- Document `DELETE /auth/me` in the frontend auth spec and backend contract notes, even if no UI is implemented yet.
- Align player DTO typing and UI validation around whether `heightCm` and `weightKg` are required by the backend contract.
- Keep client-side helper methods documented as list/filter fallbacks when no dedicated backend endpoint exists.

### Decisions Requiring Backend Or Team Agreement

- Decide whether user `fullName` becomes a backend field or remains frontend-only local profile metadata.
- Decide whether team fields like `league`, `category`, `season`, and `logoUrl` should be added to backend persistence and API responses.
- Decide whether player fields like `jerseyNumber`, `photoUrl`, `status`, and `createdAt` should be added to backend persistence and API responses.
- Decide whether backend should expose direct read/search endpoints such as `GET /teams/{team_id}`, `GET /players/{player_id}`, or search query parameters.
- Decide the final backend contracts for matches, videos, and analysis before replacing mocks.

### Mock-Only Areas

- Matches remain mock-only in the frontend.
- Videos remain mock-only in the frontend.
- Analysis remains mock-only in the frontend.
- No frontend API implementation should be added for these areas until backend routes, payloads, response shapes, auth requirements, and error behavior are defined.

## First Recommended Increment

The first increment should be limited to low-risk contract alignment and documentation.

1. Fix logout to send auth.
2. Document `DELETE /auth/me` as an available backend endpoint without adding UI behavior by default.
3. Review required player fields for `heightCm` and `weightKg`, then align frontend DTOs, forms, and service payload assumptions with the agreed backend contract.

## Scope

- Auth logout request behavior.
- Documentation for account deletion endpoint availability.
- Player height and weight required-field contract review.
- Spec and contract documentation updates related to the above.

## Non-Scope

- Implementing matches, videos, or analysis backend integration.
- Adding backend routes from the frontend repo.
- Adding UI for account deletion unless separately specified.
- Adding new team or player fields without backend/team agreement.
- Replacing client-side helper methods with new backend endpoints before those endpoints exist.

## Acceptance Criteria

- The spec clearly lists all known frontend/backend desynchronizations from the audit.
- The spec separates safe frontend-only changes from items that require backend or team decisions.
- The spec explicitly states that matches, videos, and analysis remain mock-only.
- A future logout implementation sends `Authorization: Bearer <token>` to `POST /auth/logout` when a token exists.
- `DELETE /auth/me` is documented as a backend endpoint and not silently treated as unavailable.
- The required/optional status of player `heightCm` and `weightKg` is decided before changing validation or DTOs.
- Future implementation touches only the files listed in this spec unless a new decision expands scope.

## Verification Plan

- Review this spec against `back/README.md` and `back/src/interfaces/http/routes` before implementation.
- Review frontend service calls in `src/services/api/auth.api.ts`, `src/services/api/players.api.ts`, and `src/services/api/mappers.ts` before implementation.
- After future implementation, run `npm run lint`.
- After future implementation, run `npm run build`.
- Manually verify logout against a backend session and confirm the request includes the Bearer token.
- Manually verify player create/edit still sends `height_cm` and `weight_kg` in the shape expected by backend.
- Do not verify matches, videos, or analysis against backend until real backend contracts exist.

## Future Implementation Files

The following files would be candidates for a future implementation, depending on the approved scope:

- `src/services/api/auth.api.ts` - send auth on logout and optionally expose account deletion if approved.
- `src/services/contracts/auth.service.ts` - add an account deletion method only if frontend behavior is requested.
- `src/contexts/AuthContext.tsx` - wire account deletion only if UI behavior is requested.
- `src/pages/auth/LoginPage.tsx` - no expected change for first increment; listed only if auth UX copy changes.
- `src/pages/auth/RegisterPage.tsx` - no expected change for first increment; listed only if user profile fields are redefined.
- `src/services/contracts/players.service.ts` - align `heightCm` and `weightKg` optionality after decision.
- `src/services/api/players.api.ts` - align payload assumptions after player field decision.
- `src/services/api/mappers.ts` - adjust user/player/team mapping only after backend contract decisions.
- `src/pages/players/PlayerNewPage.tsx` - align create validation if height/weight contract changes.
- `src/pages/players/PlayersPage.tsx` - align edit validation if height/weight contract changes.
- `src/types/index.ts` - align domain fields only after backend/team decisions.
- `specs/auth/current.md` - document logout behavior and backend account deletion endpoint availability.
- `specs/players/current.md` - document player required field behavior after decision.
- `docs/backend-contracts.md` - update backend contract notes after implementation.

## Risks Or Notes

- Treating frontend-only fields as backend-backed can create misleading UI assumptions.
- Making optional player fields required in TypeScript may require UI form updates and fixture/mock updates.
- Account deletion is destructive; documenting the endpoint is safe, but exposing UI requires a separate product decision.
- Matches, videos, and analysis should not be partially integrated until backend contracts are stable.
