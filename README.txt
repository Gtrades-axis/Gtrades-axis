GTRADES-AXIS LARGE VIDEO UPLOAD FIX
====================================

Replace these two files in your GitHub repository:

1. worker.js
2. js/admin-video-upload.js

What changed:
- Video uploads now use Cloudflare R2 multipart uploads.
- Each video is split into 50 MiB chunks in the browser.
- Each chunk is sent to the existing r2-uploader Worker, so the 100 MB Cloudflare request-body limit is never exceeded.
- Failed chunks are retried up to 3 times.
- The existing R2 object-serving/range playback code is preserved.
- Thumbnails continue using the existing small-file /upload endpoint.
- No R2 access keys or secrets are placed in the browser.

DEPLOY
------
From the repository root:

  npx wrangler deploy

Then commit/push the updated GitHub files so Firebase Hosting redeploys the frontend.

IMPORTANT SECURITY ACTION
--------------------------
The uploaded project contains an R2 access key and secret hard-coded in:

  functions/index.js

Rotate/revoke that R2 API token in Cloudflare immediately and replace the hard-coded credentials with secure server-side secrets/environment configuration. Do NOT put the new secret in browser JavaScript or GitHub source.

TEST
----
Use https://gtradesaxis.com/admin-video-upload (or /admin) and upload a video larger than 100 MB.
The progress text should show "Uploading video... part X of Y" instead of staying at 0%.

NOTE
----
You do NOT need an Nginx/cPanel setting for this architecture, and you do NOT need to route the large video through a new R2 custom domain. The existing Worker binding GTRADES_ASSETS -> gtrades-assets is used.
