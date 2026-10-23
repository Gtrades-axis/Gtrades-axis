# GTRADES-AXIS Payment + Analytics Fixes

## Analytics access

Analytics now treats administrator access case-insensitively and supports premium accounts with a valid membership expiry. Admins bypass the premium expiry check.

## Payment proof storage

Payment proofs remain Cloudflare R2 objects. The browser receives a short-lived signed PUT URL from the Firebase callable function and never receives the R2 secret credentials.

If payment submission reports that the payment proof service is unavailable, deploy the Firebase Functions and configure the four Firebase secrets:

- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET (gtrades-assets)

Then deploy:

    firebase deploy --only functions,firestore,hosting

The R2 bucket must also allow browser PUT requests from the production site using the CORS policy in `r2-cors.json`.

## Payment fixes in this build

- Fixed the payment form reset bug that attempted to assign to a function call.
- Added a clearer error when the signed R2 upload service cannot be reached.
- Added the user's UID to new payment records for compatibility with existing admin tooling.
- Admin payment approval no longer overwrites an administrator's `role` with `member`.
- Rejection reasons remain visible to the member and rejected payments can be resubmitted.
