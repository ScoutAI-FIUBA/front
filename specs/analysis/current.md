# Analysis Current Spec

## Status

Current behavior documentation.

## Routes

- `/analisis`: analysis sessions list.
- `/analisis/nuevo`: manual analysis playground for demo use.
- `/analisis/:id`: analysis detail page.

## Files Involved

- `src/pages/analysis/AnalysisPage.tsx`
- `src/pages/analysis/AnalysisNewPage.tsx`
- `src/pages/analysis/AnalysisDetailPage.tsx`
- `src/services/registry.ts`
- `src/services/contracts/analysis.service.ts`
- `src/services/mock/analysis.mock.ts`
- `src/services/contracts/videos.service.ts`
- `src/services/mock/videos.mock.ts`
- `src/services/contracts/teams.service.ts`
- `src/services/contracts/players.service.ts`
- `src/types/index.ts`

## Current Behavior

- Analysis list loads sessions through `analysisService.listSessions()`.
- Analysis list exposes a `Nuevo análisis` action.
- Each session displays session code, status, progress, frame count, and a detail link.
- New analysis page creates a local demo analysis around one uploaded video.
- New analysis page collects analysis name, required local team, optional visitor team, related players, and one video file.
- New analysis page presents those setup controls in one compact configuration rail on desktop rather than as a sequential form.
- On narrow screens, the same configuration rail stacks its controls inside one divided surface.
- Player selection opens from a compact control with the current selected-player count.
- The video player and timeline are the dominant workspace surface, with clip creation and organization in a dedicated tool panel.
- Draft/local persistence status is displayed in the workspace header.
- New analysis page previews the selected video locally before upload.
- New analysis page supports selecting a video through the file picker or by dragging a video file onto the upload area.
- New analysis page lets the user stage manual clips by selecting a visual range on a single-track video timeline and assigning a label.
- New analysis page rejects zero-duration clips: the end time must be greater than the start time.
- New analysis page generates a lightweight thumbnail strip locally from the selected video; thumbnails are not uploaded or persisted.
- Clicking the timeline seeks the video, while dragging either range handle updates the clip start or end time.
- Timeline range handles support keyboard adjustment and keep the range inside the video duration without allowing the handles to cross.
- Start and end fields remain available for precise manual adjustments and stay synchronized with the visual range.
- New analysis page shows the current video position, selected range, and range duration on the timeline before the clip is saved.
- New analysis page displays selected related players as compact chips.
- Staged clips can be clicked to seek the video to the clip start; playback pauses when it reaches the clip end when autoplay succeeds.
- Manual clips remain local to the page until `Guardar análisis` is pressed.
- `Guardar análisis` uploads the video through `videoService.upload()` and then calls mock `analysisService.saveManualAnalysis()` to simulate analysis persistence.
- The mock save creates an analysis session and game events from staged clips so the existing detail page can show the saved labels as detected events.
- The mock save stores snapshots of the selected local and visitor teams before creating the synthetic match, so detail rendering works when teams came from the backend service instead of the mock store.
- Optional visitor team remains empty when the user does not select one; the mock does not invent a rival team for manual analyses.
- Detail page reads `id` from the route.
- Detail page first tries `analysisService.getBySessionId(id)`.
- If no session detail is found, it tries to resolve the id as a video id through `videoService.getById(id)` and then loads analysis by match id.
- Detail page displays a loading message while no detail is available.
- Detail page displays session progress, match/video information, detected players, and detected events.
- Detail page shows the saved manual analysis video and clips when the local video URL is still available in the current browser session; otherwise it falls back to the existing placeholder.
- Events render labels and metadata such as quarter, minute, player number, and XP when present.

## Service Selection

- `analysisService` currently always uses `mockAnalysisService`.
- `videoService` uses the configured video implementation from the registry.
- Manual analysis save remains mock/local because the backend does not expose analysis or clip endpoints yet.

## Non-Scope

- There is no real backend analysis API wired in the registry.
- There is no real backend clip persistence.
- The new analysis playground is a sprint/demo flow, not the final backend contract.
- Persisted backend clip playback is not implemented; manual clip playback relies on metadata and the browser-accessible video URL.
- Export button is displayed but no export implementation is documented here.
- Similar-play search, player tracking, statistics integration, and prompt-driven agents are future scope.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify analysis list and detail loading with mock data.
