# GTRADES-AXIS Video Save Fix — 2026-08-29

## Root cause
The admin overhaul was creating Firestore video metadata with `undefined` fields (`fileKey` and `resourceKey`). Firebase Firestore rejects `undefined` values by default, so the R2 upload could succeed while the Firestore `/videos` document failed to save.

## Fix
- Removed undefined Firestore fields by using `null` for non-applicable keys.
- Added `videoUrl`, `videoURL`, and `url` to every video record.
- Preserve `videoKey`, `storageKey`, and `r2Key`.
- Parse and validate the R2 Worker JSON response before saving Firestore metadata.
- Use the Worker-returned key when available.
- Added matching resource URL fields for resource uploads.

## Expected flow
1. Select video.
2. Upload to Cloudflare R2.
3. Confirm successful Worker response.
4. Create `/videos/{autoId}` in Firestore.
5. Store the R2 key and playable URL.
6. Mark queue item complete only after both R2 and Firestore succeed.
