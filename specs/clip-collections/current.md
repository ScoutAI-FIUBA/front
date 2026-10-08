# Clip Collections Current Spec

## Status

Frontend integration for the backend clip collections foundation.

## Routes

- `/videos/:videoId/colecciones`: list and create collections for one video.
- `/videos/:videoId/colecciones/:collectionId`: view a collection, add virtual clips, reproduce ranges, export, and delete clips.

## Files Involved

- `src/pages/videos/VideoCollectionsPage.tsx`
- `src/pages/videos/VideoCollectionDetailPage.tsx`
- `src/services/registry.ts`
- `src/services/contracts/clip-collections.service.ts`
- `src/services/api/clip-collections.api.ts`
- `src/services/mock/clip-collections.mock.ts`
- `src/types/index.ts`
- `src/App.tsx`
- `src/pages/videos/VideosPage.tsx`

## Behavior

- Collections are private and scoped to an owned video.
- The canonical entry is the `Clips` tab on match detail. Collection routes keep their existing
  `/videos/:videoId/colecciones` URLs, but return to `/partidos/:videoId?tab=clips` so the user stays
  inside the match-review flow.
- The collections page loads the selected video and its collections independently. A failure in
  secondary video metadata does not block the collection index, and each failed section exposes its
  own retry action.
- Collections are presented as a dense editorial list rather than a card grid. Clip counts are not
  shown because the list contract does not provide them and the UI does not fan out detail requests
  only to decorate the index.
- Collections are sorted by `updatedAt` descending only when every returned timestamp is valid;
  otherwise the service order is preserved.
- Users can create a collection with a required name and optional description.
- Collection detail is a desktop review workspace: the original video is the primary surface and a
  compact clip rail remains visible beside it. Video loading/playback failures are isolated to the
  player so saved clips remain available.
- Collection detail displays virtual clips in canonical `position` order and clearly marks the
  selected and currently playing clip. The time range remains the most scannable clip datum.
- Persisted items may expose an optional backend `description`, which the UI presents as the clip title while keeping the time range visible. Legacy items without it use the honest fallback `Clip 1 · 00:42–00:55`; the UI never reconstructs notes or player associations.
- Users add clips by defining `startMs`, `endMs`, and an optional description of at most 200 characters; no per-clip video file is uploaded.
- The compact add-clip dialog is launched from the clip rail, keeps the video context visible, and
  seeds the next range from the player's current time so repeated capture stays fast.
- The UI validates non-negative ranges, end after start, a maximum duration of 30 seconds, and the known video duration.
- Users can delete virtual clips after confirmation.
- Clip playback seeks the original video to `startMs` and pauses at `endMs`.
- Users can request a server-side export for a clip and download the returned URL while a preparing state is shown.
- Failed exports or deletions leave the current selection and workspace state intact.
- Backend `INVALID_CLIP_RANGE` and `CLIP_EXPORT_FAILED` responses are surfaced as actionable messages.
- API requests use the existing authenticated HTTP client.
- The service exposes single and atomic batch range creation.
- Mock mode persists collections and clip items in the existing session store.

## Backend Alignment

- `POST /videos/{video_id}/collections`
- `GET /videos/{video_id}/collections`
- `GET /videos/{video_id}/collections/{collection_id}`
- `POST /videos/{video_id}/collections/{collection_id}/clips`
- `POST /videos/{video_id}/collections/{collection_id}/clips/batch`
- `PATCH /videos/{video_id}/collections/{collection_id}/clips/{item_id}` (backend contract available; frontend editing is not part of this increment)
- `POST /videos/{video_id}/collections/{collection_id}/clips/{item_id}/export`
- `DELETE /videos/{video_id}/collections/{collection_id}/clips/{item_id}`

Backend snake_case payloads are mapped to frontend camelCase types inside the API service.

## Non-Scope

- Editing, deleting, or reordering collections because the backend has no endpoints for those actions.
- Editing existing descriptions or reordering collection items.

## Verification

- Run `npm run lint`.
- Run `npm run build`.
- In mock mode, create a collection from a video, add a range, play it from the original video, export it, and delete it.
