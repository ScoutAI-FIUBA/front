# Frontend Map

## Root Files

- `package.json`: npm scripts and dependencies.
- `vite.config.ts`: Vite React plugin and `@` alias to `src`.
- `tsconfig.json`: project references.
- `tsconfig.app.json`: strict app TypeScript configuration and path alias.
- `tsconfig.node.json`: strict Vite config TypeScript configuration.
- `tailwind.config.js`: Tailwind content, theme extension, dark mode setting.
- `postcss.config.js`: Tailwind and Autoprefixer plugins.
- `eslint.config.js`: ESLint flat config for TypeScript and React hooks.
- `.env.example`: backend URL and mock API toggle examples.
- `README.md`: current install, screens, services, and scripts overview.

## `src` Root

- `src/main.tsx`: React root creation and router wrapper.
- `src/App.tsx`: route tree, auth provider, protected shell, toaster.
- `src/index.css`: Tailwind layers and global CSS variables.
- `src/App.css`: app stylesheet retained from project structure.
- `src/api.ts`: standalone health API helper using `VITE_API_BASE_URL`.
- `src/vite-env.d.ts`: Vite environment types.

## Components

- `src/components/layout/AppShell.tsx`: responsive protected app shell, desktop sidebar, mobile drawer, header, user summary, and logout.
- `src/components/layout/ProtectedRoute.tsx`: protected route gate.
- `src/components/ui/*.tsx`: local UI primitives such as button, card, input, dialog, select, badge, avatar, alert, progress, label, separator.

## Contexts

- `src/contexts/AuthContext.tsx`: auth state, login, register, logout, session restore, `useAuth` hook.

## Pages

- `src/pages/auth/LoginPage.tsx`: login form and redirect after authentication.
- `src/pages/auth/RegisterPage.tsx`: registration form and password validation.
- `src/pages/dashboard/DashboardPage.tsx`: state-aware Inicio with saved manual-analysis work.
- `src/pages/teams/TeamsPage.tsx`: teams management and player linking.
- `src/pages/players/PlayersPage.tsx`: players table, filters, edit/delete dialog flows.
- `src/pages/players/PlayerNewPage.tsx`: create player form.
- `src/pages/matches/MatchesPage.tsx`: match creation and roster input.
- `src/pages/videos/VideosPage.tsx`: videos list, filtering, analysis request.
- `src/pages/videos/VideoUploadPage.tsx`: video upload form using the selected API or mock service.
- `src/pages/videos/VideoCollectionsPage.tsx`: collections list and create flow for one video.
- `src/pages/videos/VideoCollectionDetailPage.tsx`: clip playback, metadata creation, and deletion.
- `src/pages/analysis/AnalysisSetup.tsx`: progressive material selection, validation, upload, inline team creation, and ready state.
- `src/pages/analysis/AnalysisNewPage.tsx`: Setup/workspace orchestration and local time-range clips.
- `src/pages/analysis/AnalysisPage.tsx`: analysis sessions list.
- `src/pages/analysis/AnalysisDetailPage.tsx`: analysis detail, video preview placeholder, events, detected players.

## Services

- `src/services/registry.ts`: chooses API or mock services.
- `src/services/contracts/*.ts`: TypeScript service interfaces.
- `src/services/api/http-client.ts`: fetch wrapper, auth token, refresh handling, JSON parsing.
- `src/services/api/auth.api.ts`: real auth API service.
- `src/services/api/teams.api.ts`: real teams API service.
- `src/services/api/players.api.ts`: real players API service.
- `src/services/api/videos.api.ts`: multipart video upload, video listing, and presigned playback URL retrieval for ready videos.
- `src/services/api/clip-collections.api.ts`: clip collection and item metadata API.
- `src/services/api/mappers.ts`: backend/frontend mapping helpers.
- `src/services/api/token.ts`: token storage helpers.
- `src/services/api/errors.ts`: API error parsing.
- `src/services/mock/*.ts`: mock service implementations.

## Mocks And Types

- `src/mocks/store.ts`: mock store management.
- `src/mocks/seed.ts`: seed data.
- `src/mocks/delays.ts`: mock delay helpers.
- `src/types/index.ts`: domain types for users, teams, players, matches, videos, clip collections, events, analysis, dashboard, and mock store.

## Utilities

- `src/lib/utils.ts`: class merging helper, initials, age calculation, and date formatting.
