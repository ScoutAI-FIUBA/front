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
- `/dashboard`: protected dashboard.
- `/equipos`: teams page.
- `/jugadores`: players list page.
- `/jugadores/nuevo`: create player page.
- `/partidos`: matches page.
- `/videos`: videos list page.
- `/videos/subir`: video upload page.
- `/analisis`: analysis sessions page.
- `/analisis/:id`: analysis detail page.
- `/`: redirects to `/login`.
- `*`: redirects to `/dashboard`.

## Services

- Contracts live in `src/services/contracts`.
- API clients live in `src/services/api`.
- Mock services live in `src/services/mock`.
- `src/services/registry.ts` selects real or mock services.
- `authService`, `teamService`, `playerService`, and `videoService` use the backend unless `VITE_USE_MOCK_API=true`.
- `matchService` and `analysisService` currently use mocks.

## Mocks

- Mock persistence/data lives in `src/mocks`.
- Mock services cover auth, teams, players, matches, videos, and analysis.
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
