# Analysis Current Spec

## Status

Implemented behavior through Phase 6C Setup redesign.

## Routes

- `/analisis`: analysis sessions list.
- `/analisis/nuevo`: manual analysis playground for demo use.
- `/analisis/:id`: analysis detail page.

## Files Involved

- `src/pages/analysis/AnalysisPage.tsx`
- `src/pages/analysis/AnalysisNewPage.tsx`
- `src/pages/analysis/AnalysisSetup.tsx`
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
- New analysis uses progressive disclosure inside the existing `/analisis/nuevo` route.
- Setup first asks which material the user wants to analyze and offers an existing video or a new local file.
- The workspace, timeline, clip editor, roster, and `Guardar análisis` action are not rendered during Setup.
- Existing videos are not considered ready until `videoService.getById()` resolves a usable playback URL and the browser can read its media metadata.
- Failed existing-video hydration remains an explicit recoverable Setup error and never enters the workspace.
- Existing videos infer their associated team and suggest their video title as the analysis title.
- New files display their filename, human-readable size, and validation state before exposing the required team selection.
- New-file validation requires a non-empty video file whose media metadata can be read; no arbitrary size limit is invented.
- Players and roster are not requested during Setup.
- Rival, date, context, and analysis-title editing remain optional after the material is selected.
- Date and free-form context remain local to the active flow because current persistence contracts do not represent them.
- When no teams exist, Setup opens a small inline create-team dialog and returns to the same selected material after creation.
- Team creation uses the existing service contract and the same inferred short name/default country behavior as the current Teams page.
- A new file is uploaded through `videoService.upload()` before the workspace is shown.
- Uploading is represented as indeterminate activity without fabricated percentage or ETA.
- Upload failure preserves file, team, and optional context and exposes a retry action.
- After a successful upload, Setup clearly states that the video exists in Videos while the analysis is not yet saved.
- Ready Setup shows the prepared video, inferred team/title, optional context, and `Empezar análisis`.
- Entering the workspace preserves the prepared Setup model and local playback URL.
- Workspace exposes `Editar preparación`; returning to Setup does not re-upload a prepared video.
- When clips already exist, Setup keeps the prepared material locked while allowing title and optional context edits.
- The existing workspace monitor, timeline, clip editor, and library retain their previous composition.
- `Guardar análisis` is visible only inside the workspace.
- The video player and timeline are the dominant workspace surface, with clip creation and organization in a dedicated tool panel.
- Draft/local persistence status is displayed in the workspace header.
- For a newly uploaded video, the workspace distinguishes `video subido` from `análisis sin guardar`.
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
- Manual clip ranges are limited to 30 seconds so they satisfy the persisted clip contract.
- Setup uploads a new video once before workspace entry; `Guardar análisis` does not upload it again.
- For an existing video, the workspace reuses that video without an upload.
- `Guardar análisis` creates a collection on the prepared video and persists all clip ranges atomically through `clipCollectionService.addClips()`.
- Manual labels remain in the analysis model because collection items only persist range and position data.
- After collection persistence, `Guardar análisis` calls mock `analysisService.saveManualAnalysis()` so the existing analysis detail keeps its labels and detected-event demo data.
- Setup currently supplies an empty player association while retaining the `playerIds` boundary for future workspace player tooling.
- Saved manual analysis stores the generated collection id and links to the persisted collection detail.
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
- Analysis session metadata remains mock/local, while its collection and clip ranges use the configured real or mock clip collection service.

## Non-Scope

- There is no real backend analysis API wired in the registry.
- The new analysis playground is a sprint/demo flow, not the final backend contract.
- Manual-analysis labels are not persisted on backend collection items.
- Setup date/free-form context is not persisted because the current contracts have no Partido persistence fields.
- Successfully uploaded videos are not rolled back if the user leaves before saving the analysis.
- Similar-play search, player tracking, statistics integration, and prompt-driven agents are future scope.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Inspect Setup and workspace at desktop and approximately 390px widths.
- Verify existing-video hydration failure cannot enter the workspace.
- Verify new-file validation, no-team creation, indeterminate upload, retry, ready, and edit-Setup flows.
- Verify clips survive context editing and lock material changes once clip work exists.
- Manually verify analysis list and detail loading with mock data.
