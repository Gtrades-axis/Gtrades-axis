# Cloudflare R2 payment-proof setup

Payment proofs are stored in Cloudflare R2 under `payments/{uid}/{paymentId}/{filename}`. The browser never receives R2 credentials. Firebase callable functions issue short-lived signed URLs.

## Deploy
1. Install Firebase CLI and Cloudflare Wrangler.
2. Set Firebase secrets:
   - `firebase functions:secrets:set R2_ACCOUNT_ID`
   - `firebase functions:secrets:set R2_ACCESS_KEY_ID`
   - `firebase functions:secrets:set R2_SECRET_ACCESS_KEY`
   - `firebase functions:secrets:set R2_BUCKET` (use `gtrades-assets`)
3. Deploy Firebase: `firebase deploy --only functions,firestore,hosting`.
4. Configure R2 CORS for the bucket using `r2-cors.json`. With Wrangler, use the R2 bucket CORS configuration command supported by your installed Wrangler version.
5. Keep the existing Cloudflare Worker for videos/resources. Payment proofs use the signed Firebase-function path and do not expose R2 credentials.

## Security
- Users can request upload URLs only for their own `payments/{uid}/...` prefix.
- Only users whose Firestore `users/{uid}.role` is `admin` can request payment-proof download/delete URLs.
- Proof download URLs expire after 5 minutes. Upload URLs expire after 15 minutes.
- Firestore payment rules require `proofStorageProvider == cloudflare-r2` and a user-owned proof path.
