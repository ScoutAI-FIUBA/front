# Agent Guidelines

This repository is an existing frontend application. Treat the current app as the source of truth and avoid speculative rewrites.

## Hard Rules

- Do not modify `src/` unless the user explicitly asks for an implementation change.
- Do not modify `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js`, or `eslint.config.js` unless explicitly requested.
- Do not add dependencies without explicit approval.
- Do not move, rename, or delete existing files unless explicitly requested.
- If a file already exists, read it first and ask before overwriting.
- Prefer documentation/spec changes before application changes when preparing work.

## Current Project Context

- App name: ScoutAI frontend.
- Stack: Vite, React, TypeScript, Tailwind CSS.
- Routing: `react-router-dom` with routes defined in `src/App.tsx`.
- Services: contracts, real API clients, and mock implementations under `src/services`.
- Auth, teams, players, and videos can use the real backend or mocks via `VITE_USE_MOCK_API`.
- Matches and analysis currently use mocks.

## Safe Workflow

1. Read `PROJECT_MAP.md` before making changes.
2. Read the relevant `specs/<area>/current.md` before editing a feature.
3. Update or create a spec before changing behavior.
4. Keep changes minimal and localized.
5. Run available verification commands when code changes are requested.

## Verification Commands

- `npm run lint`
- `npm run build`
- `npm run dev`

Use `npm run dev` only for local manual testing. Use `npm run lint` and `npm run build` for implementation verification when dependencies are installed.
