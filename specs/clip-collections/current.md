# Clip Collections Current Spec

## Status

Frontend integration for the backend clip collections foundation.

## Routes

- `/videos/:videoId/colecciones`: list and create collections for one video.
- `/videos/:videoId/colecciones/:collectionId`: view a collection, add clip metadata, and delete clips.

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
- The collections page loads the selected video and its collections.
- Users can create a collection with a required name and optional description.
- Collection detail displays clips in backend position order.
- Users can add one clip metadata record with a filename and an existing Cloudflare URL.
- Users can delete clip metadata records after confirmation.
- Clip playback uses the persisted `cloudflareUrl`.
- API requests use the existing authenticated HTTP client.
- The service exposes single and batch clip creation even though the initial UI adds one clip at a time.
- Mock mode persists collections and clip items in the existing session store.

## Backend Alignment

- `POST /videos/{video_id}/collections`
- `GET /videos/{video_id}/collections`
- `GET /videos/{video_id}/collections/{collection_id}`
- `POST /videos/{video_id}/collections/{collection_id}/clips`
- `POST /videos/{video_id}/collections/{collection_id}/clips/batch`
- `DELETE /videos/{video_id}/collections/{collection_id}/clips/{item_id}`

Backend snake_case payloads are mapped to frontend camelCase types inside the API service.

## Non-Scope

- Generating a physical clip file from `startSecond` and `endSecond`.
- Uploading generated clip files to Cloudflare or R2.
- Editing, deleting, or reordering collections because the backend has no endpoints for those actions.
- Editing or reordering collection items.
- Automatically mapping manual-analysis labels to collections.

## Verification

- Run `npm run lint`.
- Run `npm run build`.
- In mock mode, create a collection from a video, add a clip URL, play it, and delete it.
