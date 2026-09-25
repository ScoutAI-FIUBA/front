# Auth Current Spec

## Status

Current behavior documentation.

## Routes

- `/login`: login form.
- `/register`: registration form.
- Protected routes redirect unauthenticated users to `/login`.
- Authenticated users visiting `/login` are redirected to `/dashboard`.

## Files Involved

- `src/App.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/layout/ProtectedRoute.tsx`
- `src/components/auth/LoginCourtBackdrop.tsx`
- `src/pages/auth/LoginPage.tsx`
- `src/pages/auth/RegisterPage.tsx`
- `src/services/registry.ts`
- `src/services/contracts/auth.service.ts`
- `src/services/api/auth.api.ts`
- `src/services/mock/auth.mock.ts`
- `src/services/api/token.ts`

## Current Behavior

- `AuthProvider` restores an existing token on mount.
- If a token exists, the app asks `authService.getCurrentUser(stored)` for the current user.
- API requests use a 20-second timeout by default. Credential login opts into a
  60-second timeout because production authentication can occasionally take
  longer, without changing the timeout used by the rest of the application.
- Login timeout errors tell the user that the server is taking longer than
  usual and that the attempt can be retried; they do not expose backend URLs.
- Login calls `authService.login`, then stores user and token in context state.
- Login and Register allow each password field to toggle between masked and
  visible text locally without changing the submitted password value.
- Login keeps its existing form and promotional panel hierarchy while a local, decorative court SVG adds low-contrast basketball identity behind only the promotional content. The SVG is hidden from assistive technology and uses a simpler crop on narrow viewports.
- Login's promotional panel uses the existing blue `primary` identity tokens;
  it does not retain the previous hard-coded pink/burgundy background.
- Login keeps React hooks in a stable order while auth state restores, and submits the browser form values so password-manager autofill is honored even when React state has not received change events yet.
- Register calls `authService.register`, then stores user and token in context state.
- Logout calls `authService.logout`, clears user and token in context state, and navigates to `/login` from `AppShell`.
- `ProtectedRoute` shows `Cargando...` while auth state is loading.
- `ProtectedRoute` redirects unauthenticated users to `/login`.
- Access-token storage publishes changes to `AuthProvider`. When refresh fails
  after a protected request receives `401`, the client clears the token once,
  `AuthProvider` immediately clears its authenticated state, and protected
  routes redirect to `/login` without calling logout or starting a refresh loop.
- Global toasts are rendered by `Toaster` in `src/App.tsx`.

## Backend Session Contract

- Access token TTL: 15 minutes (`900` seconds).
- Refresh-session and refresh-cookie TTL: 7 days (`604800` seconds).
- Refresh tokens are single-use and rotate on every successful `/auth/refresh`.
- A session can no longer be refreshed when the cookie is missing, the refresh
  session is expired or revoked, reuse is detected, or its user is unavailable.
- Frontend timeout tolerance does not change these TTLs or address backend
  performance.

## Service Selection

- Uses `apiAuthService` by default.
- Uses `mockAuthService` when `VITE_USE_MOCK_API=true`.

## Validation

- Register checks password confirmation.
- Register requires password length of at least 8 characters.
- Login displays service errors as alert text.
- Register displays service errors as alert text.

## Non-Scope

- Password recovery is displayed but not implemented.
- Google login button is displayed disabled.
- No new auth features are requested by this spec.

## Verification

- Run the auth client tests for login timeout and refresh/session behavior.
- Run `npm run build` for type and production build validation.
- Run `npm run lint` for static checks.
- Manually verify login, register, protected redirect, and logout if a backend or mocks are available.
