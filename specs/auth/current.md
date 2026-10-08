# Auth Current Spec

## Status

Current behavior documentation.

## Routes

- `/login`: login form.
- `/register`: registration form.
- `/recuperar-password`: request a password-reset email.
- `/restablecer-password`: set a new password from the emailed token.
- `/verificar-email`: confirm an emailed verification token.
- `/cuenta`: authenticated profile, password change, and verification.
- Protected routes redirect unauthenticated users to `/login`.
- Authenticated users visiting `/login` return to a preserved internal deep
  link when one exists, otherwise they are redirected to the canonical Inicio route `/`.

## Files Involved

- `src/App.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/layout/ProtectedRoute.tsx`
- `src/components/auth/LoginCourtBackdrop.tsx`
- `src/components/auth/AuthShell.tsx`
- `src/components/auth/AuthPasswordField.tsx`
- `src/pages/auth/LoginPage.tsx`
- `src/pages/auth/RegisterPage.tsx`
- `src/pages/auth/ForgotPasswordPage.tsx`
- `src/pages/auth/ResetPasswordPage.tsx`
- `src/pages/auth/VerifyEmailPage.tsx`
- `src/pages/auth/AccountPage.tsx`
- `src/components/auth/GoogleSignInButton.tsx`
- `src/services/registry.ts`
- `src/services/contracts/auth.service.ts`
- `src/services/api/auth.api.ts`
- `src/services/mock/auth.mock.ts`
- `src/services/api/token.ts`

## Current Behavior

- The login brand panel uses the ScoutAI name without the temporary `ScoutAI MVP` footer copy.

- Protected data pages distinguish an unrecoverable HTTP 401 from a network failure. Refreshable expiry remains silent through the shared HTTP retry; failed refresh clears auth and pages avoid showing a misleading connection-error alert before the protected-route redirect.

- `AuthProvider` restores the session on mount even when the access token is not
  present in `sessionStorage`: the API client first attempts the HttpOnly refresh
  session and, after a successful rotation, verifies the user through `/auth/me`.
- A definitive refresh or `/auth/me` authentication failure clears the access
  token. Timeout, network, and `5xx` failures preserve the session material and
  expose a retryable restoration state instead of treating the user as logged out.
- API requests use a 20-second timeout by default. Credential login opts into a
  60-second timeout because production authentication can occasionally take
  longer, without changing the timeout used by the rest of the application.
- Login maps invalid credentials, timeout, network, and server failures to
  product-facing copy. It never exposes raw backend messages or backend URLs.
- Login calls `authService.login`, then stores user and token in context state.
- Login and Register allow each password field to toggle between masked and
  visible text locally without changing the submitted password value.
- Login, Register, password recovery, password reset, email verification, and
  session restoration share the dark ScoutAI auth shell and existing product
  tokens. Login and Register use its two-zone desktop composition; transactional
  recovery states use a compact centered panel.
- The court SVG is the main sports language in the visual zone and a quiet
  ambient texture in compact flows. It is decorative and hidden from assistive
  technology.
- Auth headings use the existing Barlow Condensed display treatment, while form
  controls reuse the product primitives and dark surfaces.
- Login and Register contain no promotional metrics, feature lists, fictional
  organizations, or unsupported claims. Register has no synthetic legal footer.
- Login keeps React hooks in a stable order while auth state restores, and submits the browser form values so password-manager autofill is honored even when React state has not received change events yet.
- Register calls `authService.register`, then stores user and token in context state.
- Logout calls `authService.logout`, clears user and token in context state, and navigates to `/login` from `AppShell`.
- `ProtectedRoute` shows an explicit session-restoration state while auth is
  loading and adds neutral delayed-wait copy after eight seconds.
- A transient restoration failure keeps the original route in place and offers
  a retry. A definitively unauthenticated user is redirected to `/login` with
  the original path, query, and hash in router state.
- Successful credential or Google login returns to that internal deep link;
  direct login without one continues to `/`.
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

- Register sends `full_name` to the backend; `/auth/me` and login return it.
- Password recovery is implemented: login links to `/recuperar-password`, which
  always reports success, and `/restablecer-password` redeems the emailed token.
- `/cuenta` edits the display name, changes the password, and can resend the
  verification email. It uses the same dark ScoutAI product surfaces as the
  protected shell, with a quiet utility hierarchy for Profile and Security;
  success and error feedback remain local, dark, and readable. Login is still
  allowed when the email is unverified.
- Email verification guards the single-use token against React StrictMode's
  repeated development effect before calling the backend.
- Google login uses Google Identity Services when `VITE_GOOGLE_CLIENT_ID` is set
  and posts the ID token to `/auth/oauth/google`. Without the client id the
  button stays disabled.

## Non-Scope

- Forced email verification before login.
- Account deletion UI (backend `DELETE /auth/me` already exists).

## Verification

- Run the auth client tests for login timeout and refresh/session behavior.
- Run the account-route integration checks for recovery, verification, account,
  AppShell navigation, Google configuration, and the single-use token guard.
- Run `npm run build` for type and production build validation.
- Run `npm run lint` for static checks.
- Manually verify login, register, protected redirect, and logout if a backend or mocks are available.
