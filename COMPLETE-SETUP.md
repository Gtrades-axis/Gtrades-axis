# GTRADES-AXIS complete deployment checklist

## Firebase
```bash
firebase use gtrades-axis
firebase functions:secrets:set R2_ACCOUNT_ID
firebase functions:secrets:set R2_ACCESS_KEY_ID
firebase functions:secrets:set R2_SECRET_ACCESS_KEY
firebase functions:secrets:set R2_BUCKET
firebase deploy --only functions,firestore,hosting
```

The four secrets must contain the Cloudflare R2 account ID, access key ID, secret access key, and bucket name (`gtrades-assets`). Never put these values in HTML or JavaScript.

## Cloudflare R2

The payment-proof bucket is `gtrades-assets`. Configure the bucket CORS from `r2-cors.json` so browsers can PUT to short-lived signed R2 URLs. Do not expose the R2 S3 endpoint, access key, or secret in the website.

The existing `worker.js` remains the public media worker for videos/resources. Payment proofs use Firebase callable functions to issue short-lived R2 signed URLs, so proof files are not public.

## Payment-proof flow
1. User authenticates with Firebase.
2. The site creates a random Firestore payment ID locally.
3. The site requests a signed R2 PUT URL from `getPaymentProofUploadUrl`.
4. Firebase verifies the user and only permits `payments/{theirUid}/...` keys.
5. Browser uploads JPG/PNG/PDF directly to R2.
6. Firestore stores only the R2 object key and metadata.
7. Admin opens a payment; `getPaymentProofDownloadUrl` verifies the admin role and returns a 5-minute signed GET URL.
8. Deleting a payment also deletes its R2 proof through `deletePaymentProof`.

## Required admin account
The admin user's Firestore document must be `users/{uid}` with `role: "admin"`.

## Important
Rotate any R2 credentials that were ever exposed in an older copy of this project before deploying.
