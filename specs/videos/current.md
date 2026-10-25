# Videos Current Spec

> Current override (2026-10-18): `/videos` now uses the existing visual card library previously published at `/partidos`, augmented with the team/material/analysis filters, direct playback, clips, and per-video job history documented below. `/videos/:videoId` is canonical; visible `Reporte` language is now `Análisis IA` while the `tab=reporte` query value remains stable. Full acceptance criteria are in `specs/video-reorganization/current.md`.

## Status

ScoutAI v2 Phase 2 material library.

## Routes

- `/videos`: canonical global/team-filtered video library.
- `/videos/subir`: canonical product entry for uploading a video.
- `/videos/:videoId`: canonical video detail.
- `/partidos`, `/partidos/nuevo`, and `/partidos/:videoId`: temporary compatibility redirects.
- `/videos/:videoId/colecciones`: preserved clips/collections route.

## Current Behavior

- Videos is the source-material library; automatic jobs are discoverable primarily from `/analisis` and Inicio.
- Every item uses source title, team, upload date or description, and verifiable material/analysis state.
- Ready videos keep direct playback. Opening `Ver video` requests fresh detail and a fresh playback URL, with local loading, error, retry, unavailable, and close states.
- `Nuevo análisis` links to `/analisis/nuevo?team_id=...&video_id=...`.
- The latest known ProcessingJob controls the primary analysis action: no job uses `Nuevo análisis`; `QUEUED`/`RUNNING` use `Ver progreso`; `DONE` uses `Ver análisis`; and `FAILED` uses `Ver detalle`. Every known job action uses its refresh-safe team-scoped workspace URL.
- Reanalysis remains available from the existing per-video history when the latest known job is terminal; it does not displace continuation of that known job as the primary library action.
- Clips and per-video analysis history remain secondary actions.
- Desktop uses one compact row-based library from the `lg` application breakpoint onward, with or without filters; mobile uses touch-friendly cards without horizontal scrolling.
- Mobile cards place playback and analysis continuation first. Clips and per-video history remain visible in a quieter secondary action row without repeating the material badge and status value.

## Status Semantics And Filters

- Video/material state is separate from analysis state.
- Verifiable material states are presented as `Listo`, `Preparando archivo`, and `Error`.
- Verifiable analysis states are presented as `Sin análisis`, `En cola`, `En proceso`, `Completado`, and `Fallido`; unavailable histories use `No verificado`.
- A job-history request failure produces `No verificado`; it is never misclassified as `Sin análisis`.
- Team, video state, and analysis state are independent URL-backed filters.
- Filtered empty and true empty states have different copy and actions.

## Upload Context

- The canonical desktop experience is a three-step `Nuevo video` flow: existing team selection, video file selection, and confirmation. It changes presentation and navigation language without changing the upload payload or starting analysis automatically.
- `team_id` preselects a valid team.
- `return_to` is allow-listed to `/videos`, `/analisis/nuevo`, or `/partidos`; external or unsupported targets are rejected.
- Upload success updates the shared catalogue with the returned video and opens `/videos/:videoId?tab=reporte`; contextual return paths remain available for cancel/back behavior and legacy entry compatibility.
- Drag-and-drop has real drag/drop handlers and accepts one video file; picker and drop share the same validation.
- Submission is single-flight and controls are disabled while the upload is pending.
- Team load errors retry inline through `teamService.list()` and an empty team list remains an explicit state rather than offering unsupported inline team creation.

## Errors And Authentication

- Catalogue partial failures leave the material library usable and mark analysis state as unverified.
- Network failure with no catalogue shows a retryable connection state.
- A protected 401 attempts refresh once. Failed refresh clears the token and redirects through ProtectedRoute instead of rendering a connection error.

## Backend Alignment

- Videos use the configured video service; automatic jobs always use the real ProcessingJob boundary.
- Backend `READY`, `PENDING_UPLOAD`, and `FAILED` map to ready, preparing, and failed material states.
- Every backend video response includes nullable `match_id`; the frontend preserves it as nullable `matchId`
  without adding match-linking behavior to the current video flows.
- Automatic job states remain `QUEUED`, `RUNNING`, `DONE`, and `FAILED`.
- The backend still lacks a global jobs endpoint, so the shared frontend catalogue composes per-video histories with bounded concurrency and partial results.

## Files

- `src/pages/videos/VideosPage.tsx`
- `src/pages/videos/VideoUploadPage.tsx`
- `src/pages/videos/VideoPlaybackDialog.tsx`
- `src/pages/videos/VideoAnalysisJobs.tsx`
- `src/pages/videos/video-library-filters.ts`
- `src/pages/videos/video-upload-navigation.ts`
- `src/pages/analysis/use-analysis-job-catalog.ts`

## Non-Scope

- Adaptive streaming/transcoding.
- Collection editor redesign, clip downloads, or persisted manual labels.
- Inventing analysis state when a history endpoint failed.

## Verification

- Tests cover material/analysis separation, unknown history, latest job selection, contextual upload/return, drag/drop, direct playback, and auth expiry.
- Full frontend suite: 170/170 passing.
- `npm run build` passes with the known Vite chunk-size warning.
- `npm run lint` reports 0 errors and the two pre-existing Fast Refresh warnings.
- Visual QA covers the global library and running filter in the same compact 1440 × 900 desktop table, plus simplified 390 × 844 cards; Phase 2 also covered playback loading/error/retry.
