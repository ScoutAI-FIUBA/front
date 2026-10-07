# Architecture

## Current State

This is an existing ScoutAI frontend built with Vite, React, TypeScript, and Tailwind CSS. The app is route-based, protected by an auth context, and organized around domain pages for scouting workflows.

## Entry Points

- `src/main.tsx` mounts the React app and wraps it in `BrowserRouter`.
- `src/App.tsx` defines routes, auth provider, protected layout, redirects, and global toaster.
- `src/index.css` loads Tailwind layers and defines base CSS variables.

## Routing Model

Public routes:

- `/login`
- `/register`

Protected routes under `ProtectedRoute` and `AppShell`:

- `/dashboard`
- `/equipos`
- `/equipos/:teamId`
- `/jugadores`
- `/jugadores/nuevo`
- `/partidos`
- `/videos`
- `/videos/subir`
- `/videos/:videoId/colecciones`
- `/videos/:videoId/colecciones/:collectionId`
- `/analisis`
- `/analisis/nuevo`
- `/analisis/:id`

Redirects:

- `/` redirects to `/login`.
- `*` redirects to `/dashboard`.

## Layout

- `src/components/layout/ProtectedRoute.tsx` gates protected pages based on auth state.
- `src/components/layout/AppShell.tsx` provides persistent desktop navigation and an overlay drawer on narrow screens.
- The shell includes the section header, search field, primary analysis action, authenticated-user summary, and logout action.
- Protected page content uses a responsive padded container and does not reserve sidebar width on mobile.

## Domain Areas

- Auth: login, registration, session restore, logout.
- Dashboard: aggregate stats, recent activity, latest players.
- Teams: list/create/edit/delete teams and link players to teams.
- Players: list/filter/create/edit/delete players.
- Matches: create matches and define rosters using mock data.
- Videos: list/filter/upload videos and enter their private clip collections.
- Clip collections: create/list collections, register existing clip URLs, play clips, and delete clip metadata.
- Analysis: create mock manual analyses, list sessions, and view analysis detail with events and detected players.

## Services

Services are separated into contracts, API clients, mocks, and a registry.

```text
src/services/contracts/   interface definitions
src/services/api/         backend HTTP clients and mappers
src/services/mock/        local mock implementations
src/services/registry.ts  service selection point
```

`src/services/registry.ts` currently selects:

- Auth: backend API or mock via `VITE_USE_MOCK_API`.
- Teams: backend API or mock via `VITE_USE_MOCK_API`.
- Players: backend API or mock via `VITE_USE_MOCK_API`.
- Clip collections: backend API or mock via `VITE_USE_MOCK_API`.
- Matches: mock only.
- Videos: backend API or mock via `VITE_USE_MOCK_API`.
- Analysis: mock only.

## Styling

- Tailwind scans `index.html` and `src/**/*.{js,ts,jsx,tsx}`.
- Theme colors are configured in `tailwind.config.js` and CSS variables in `src/index.css`.
- UI components are local shadcn-style wrappers in `src/components/ui`.

## Constraints For Future Work

- Preserve the existing app behavior unless a spec explicitly asks to change it.
- Keep backend/mock service boundaries explicit.
- Keep specs synchronized with implemented behavior.
- Avoid broad refactors unless they are required by a spec and approved.
