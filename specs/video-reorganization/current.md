# Video Reorganization Current Spec

## Product role

- `/videos` is the canonical ScoutAI library for uploaded audiovisual material.
- Each card represents a `Video`, its required team context, and its latest known `ProcessingJob`; it is not presented as a sporting Match.
- The canonical library keeps the existing visual card and progressive-thumbnail presentation from `/partidos` while preserving the old `VideosPage` capabilities: URL-backed team/material/analysis filters, direct playback, clips, and per-video job history.

## Canonical routes

- `/videos`: video library.
- `/videos/subir`: three-step video upload.
- `/videos/:videoId`: video detail.
- `/videos/:videoId?tab=video|reporte|clips`: refresh-safe detail tabs. The compatibility query value remains `reporte`, while the visible product label is `Análisis IA`.
- `/videos/:videoId?tab=reporte&seccion=resumen|tiros|movimiento|similares`: refresh-safe AI result sections.
- Existing collection routes remain `/videos/:videoId/colecciones` and `/videos/:videoId/colecciones/:collectionId`.

## Legacy compatibility

- Only `/partidos/:id?tab=...` (a search with a `tab` param, which every app-made old video link carried) is a temporary redirect-only route to `/videos/:videoId`. It preserves the original search params and hash (`isLegacyVideoDetailSearch` in `src/pages/videos/legacy-video-routes.ts`).
- `/partidos` and `/partidos/nuevo` no longer redirect: they belong to Matches (`specs/matches/current.md`). Old bookmarks to them open Matches, and an old `/partidos/:videoId` without `tab` shows the Matches not-found state with a link to Videos.
- New video links do not target `/partidos`.
- Before the Matches release, the "Partido" shown in the library and detail was composed in the frontend from a real `Video`, its latest `ProcessingJob`, and its team; the backend `Match` entity was not used. That behavior (library, detail tabs, Reporte sections, clips, upload) is the Videos behavior documented in this spec and in `specs/videos/current.md`, and its URL contract moved from `/partidos/:videoId` to `/videos/:videoId`.

## Library behavior

- The card grid, posters, court fallback, composed status, bounded poster loading, user isolation, and polling remain unchanged.
- The visible language uses Videos: `Subir video`, `Analizar video`, and `Análisis IA`.
- Quick composed-state filters remain available.
- Team, material-state, and analysis-state filters remain URL-backed and may be combined with the quick filter.
- A ready video can be played directly through the existing signed-playback dialog.
- Clips and per-video job history remain secondary card actions.
- Job-history failures remain neutral and never become `Sin análisis`.

## Upload behavior

- Upload keeps the three steps `01 Equipo`, `02 Archivo`, and `03 Confirmar`.
- Team selection remains mandatory and `team_id` preselection remains validated against the loaded teams.
- Multipart upload, validation, single-flight submission, catalogue upsert, and failure handling do not change.
- Creating a team from upload context returns to `/videos/subir?team_id=...`.
- Successful upload navigates to `/videos/:videoId?tab=reporte`.

## Video detail and AI analysis

- The existing detail implementation remains responsible for signed playback, material preparation polling, latest-job polling, job creation, recovery, and completed result presentation.
- Visible tabs are `Video`, `Análisis IA`, and `Clips`.
- Existing result services, detected-side confirmation, shots, movement, similar analyses, and technical job detail are unchanged.
- No backend contract or pipeline behavior changes.

## Clips and collections

- Existing collections are neither migrated nor recreated.
- The manual editor keeps playback by range, export, deletion, and the 30-second limit.
- Collection links return to the canonical video detail.
- A ready video's `Video` tab exposes a visible `Guardar clip` action next to the existing player. It links to `/videos/:videoId/colecciones` and never depends on a ProcessingJob or completed AI analysis.
- The collection index remains the single selection boundary: when collections exist the user chooses one; when none exist it offers `Crear primera colección` through the existing creation dialog.
- `Guardar clip` does not embed or duplicate the editor, create automatic/default collections, migrate existing collections, or change clip persistence contracts.

## Home and navigation

- Primary navigation is `Inicio / Videos / Partidos / Equipos / Jugadores` (`Partidos` is the Matches feature, added after this reorganization).
- Inicio presents the priority and recent items as videos and links only to canonical video routes.
- Auth copy may describe videos and analysis but authentication behavior and protected-route restoration remain unchanged.

## Non-scope

- Real Match pages, the `/matches` integration, and the Excel/CSV import are specified in `specs/matches/current.md`, not here.
- A video may link to one match (see `specs/matches/current.md`); no stats are combined or compared.
- No visual redesign, dependency change, file move, or backend change.

## Verification

- Cover canonical and legacy navigation, preservation of search/hash, filters, direct playback, job history, upload and team-return navigation, analysis creation/polling/results, and collection editing.
- Run affected tests, the complete test suite, `npm run lint`, `npm run build`, and `git diff --check`.
