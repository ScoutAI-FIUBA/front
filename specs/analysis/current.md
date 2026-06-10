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
- Analysis list exposes a `Nuevo analisis` action.
- Each session displays session code, status, progress, frame count, and a detail link.
- New analysis page creates a local demo analysis around one uploaded video.
- New analysis page collects analysis name, required local team, optional visitor team, related players, and one video file.
- New analysis page previews the selected video locally before upload.
- New analysis page lets the user stage manual clips by start time, end time, and label.
- Manual clips remain local to the page until `Guardar analisis` is pressed.
- `Guardar analisis` uploads the video through `videoService.upload()` and then calls mock `analysisService.saveManualAnalysis()` to simulate analysis persistence.
- The mock save creates an analysis session and game events from staged clips so the existing detail page can show the saved labels as detected events.
- Detail page reads `id` from the route.
- Detail page first tries `analysisService.getBySessionId(id)`.
- If no session detail is found, it tries to resolve the id as a video id through `videoService.getById(id)` and then loads analysis by match id.
- Detail page displays a loading message while no detail is available.
- Detail page displays session progress, video preview placeholder, match/video information, detected players, and detected events.
- Events render labels and metadata such as quarter, minute, player number, and XP when present.

## Service Selection

- `analysisService` currently always uses `mockAnalysisService`.
- `videoService` uses the configured video implementation from the registry.
- Manual analysis save remains mock/local because the backend does not expose analysis or clip endpoints yet.

## Non-Scope

- There is no real backend analysis API wired in the registry.
- There is no real backend clip persistence.
- The new analysis playground is a sprint/demo flow, not the final backend contract.
- Existing analysis detail video playback is represented by a visual placeholder.
- Export button is displayed but no export implementation is documented here.
- Similar-play search, player tracking, statistics integration, and prompt-driven agents are future scope.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify analysis list and detail loading with mock data.
