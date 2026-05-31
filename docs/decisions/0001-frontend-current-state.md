# 0001 - Frontend Current State

## Status

Accepted as initial documentation snapshot.

## Context

The repository already contains a working ScoutAI frontend. The goal of this documentation pass is to prepare the project for spec-driven and agent-assisted work without modifying application code.

## Decision

Document the current architecture, project map, backend contract assumptions, specs by existing feature area, and OpenCode workflow guidance.

## Current Technical Baseline

- Vite, React, TypeScript, Tailwind CSS.
- Protected route architecture with `AuthContext`, `ProtectedRoute`, and `AppShell`.
- Domain pages for auth, dashboard, teams, players, matches, videos, and analysis.
- Services organized as contracts, API implementations, mock implementations, and registry.
- Backend-capable services for auth, teams, and players.
- Mock-only services for matches, videos, and analysis.

## Consequences

- Future agents should read specs before changing behavior.
- Specs should describe current behavior first, then proposed changes separately.
- Application code remains untouched by this setup.
- Documentation can evolve independently from feature implementation.
