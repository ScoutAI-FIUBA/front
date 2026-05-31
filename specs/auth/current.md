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
- Login calls `authService.login`, then stores user and token in context state.
- Register calls `authService.register`, then stores user and token in context state.
- Logout calls `authService.logout`, clears user and token in context state, and navigates to `/login` from `AppShell`.
- `ProtectedRoute` shows `Cargando...` while auth state is loading.
- `ProtectedRoute` redirects unauthenticated users to `/login`.
- Global toasts are rendered by `Toaster` in `src/App.tsx`.

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

- Run `npm run build` for type and production build validation.
- Run `npm run lint` for static checks.
- Manually verify login, register, protected redirect, and logout if a backend or mocks are available.
