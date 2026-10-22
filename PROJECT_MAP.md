# Project Map

## Overview

ScoutAI Frontend is an existing sports scouting platform. It manages auth, teams, players, matches, videos, and analysis sessions.

## Stack

- Runtime/build: Vite 6.
- UI: React 18 with TypeScript.
- Routing: `react-router-dom` 7.
- Styling: Tailwind CSS 3 with project theme tokens in `src/index.css` and `tailwind.config.js`.
- UI primitives: local shadcn-style components plus Radix UI packages.
- Icons/toasts: `lucide-react`, `sonner`.
- Utilities: `clsx`, `tailwind-merge`, `class-variance-authority`.
- Linting: ESLint 9 with TypeScript, React Hooks, and React Refresh rules.

## Commands

- `npm run dev`: start Vite dev server.
- `npm run build`: run TypeScript build mode and Vite production build.
- `npm run lint`: run ESLint.
- `npm run preview`: preview the production build.

## Main Structure

```text
src/
  App.tsx
  main.tsx
  index.css
  api.ts
  components/
    layout/
    ui/
  contexts/
  lib/
  mocks/
  pages/
  services/
    api/
    contracts/
    mock/
    registry.ts
  types/
```

## Routes

- `/login`: login page.
- `/register`: registration page.
- `/recuperar-password`: request password reset.
- `/restablecer-password`: set a new password from email token.
- `/verificar-email`: confirm email verification token.
- `/cuenta`: account profile and password.
- `/`: protected canonical Inicio continuation surface.
- `/dashboard`: compatibility alias that redirects to `/`.
- `/equipos`: teams index.
- `/equipos/:teamId`: canonical team identity and roster management.
- `/jugadores`: secondary global player registry with team and unassigned filters.
- `/jugadores/nuevo`: compatibility entry that opens the same global create-player sheet.
- `/videos`: canonical video library, with cards, filters, playback, analysis status, clips, and job history.
- `/videos/subir`: canonical three-step video upload page.
- `/videos/:videoId?tab=video|reporte|clips`: canonical product detail over a video, its latest processing job, and clip collections. `reporte` remains the compatibility query value for the visible `Análisis IA` tab.
- `/videos/:videoId/colecciones`: clip collections for a video.
- `/videos/:videoId/colecciones/:collectionId`: clip collection detail.
- `/partidos`, `/partidos/nuevo`, `/partidos/:videoId`: temporary compatibility redirects to their canonical Video routes, preserving search and hash.
- `/analisis`: analysis sessions page.
- `/analisis/:id`: analysis detail page.
- `/analisis/jobs/:jobId?team_id=...`: real processing-job detail without match/session assumptions.
- `*`: redirects to the canonical Inicio route `/`.

## Services

- Contracts live in `src/services/contracts`.
- API clients live in `src/services/api`.
- Mock services live in `src/services/mock`.
- `src/services/registry.ts` selects real or mock services.
- `authService`, `teamService`, `playerService`, `videoService`, and `clipCollectionService` use the backend unless `VITE_USE_MOCK_API=true`.
- The legacy `matchService` and `analysisService` currently use mocks; no real Match page consumes `matchService`.
- `playerAnalysisService` (`contracts/player-analysis.service.ts`, `api/player-analysis.client.ts` for request paths and mappers, `api/player-analysis.api.ts`, `mock/player-analysis.mock.ts` with the backend's empty shape) provides aggregated player stats and shot chart; it follows `VITE_USE_MOCK_API`.
- `src/pages/players/PlayerAnalysisStatsSheet.tsx`: read-only player stats sheet opened from `/jugadores`; `src/pages/players/player-analysis-stats.ts` holds its pure formatting and adapter helpers (covered by `tests/player-analysis-stats.test.ts`).
- `analysisJobService`, `analysisJobTeamSideService`, `analysisJobStatsService`, `analysisJobShotChartService`, `analysisJobCourtPositionsService`, and `analysisJobSimilarService` always use the real processing-job backend.

## Mocks

- Mock persistence/data lives in `src/mocks`.
- Mock services cover auth, teams, players, matches, videos, analysis, and clip collections.
- Matches and analysis remain mocked until backend support exists.

## Environment

- `VITE_API_BASE_URL`: backend API URL.
- `VITE_USE_MOCK_API=true`: use local mocks for auth, teams, players, and videos.

## Documentation And Specs

- `docs/architecture.md`: architecture snapshot.
- `docs/frontend-map.md`: frontend file map.
- `docs/backend-contracts.md`: current backend/API contract notes.
- `specs/*/current.md`: current behavior by area.
- `.opencode/`: OpenCode workflow guidance, commands, and agents.
