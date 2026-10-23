# GTRADES-AXIS Payment & Security Fixes

## Payment system fixes
- Fixed `payment.html` so it actually loads the existing payment controller instead of the placeholder inline script.
- Made payment proof mandatory and implemented private Firebase Storage upload.
- Payment proof is stored under `payments/{uid}/{paymentId}/...` and is readable by the owner/admin only.
- Payment IDs are generated before the Firestore write so proof and payment records are linked.
- Added server-enforced Firestore validation for plan, USD amount, payment method, transaction ID, owner UID, and pending status.
- Added admin-side validation so only pending payments with valid plan/amount combinations can be approved.
- Admin payment modal can resolve private proof files through Firebase Storage.
- Fixed the membership page's placeholder `$XX` price.

## Security fixes
- Removed hard-coded Cloudflare R2 access credentials from `functions/index.js`.
- R2 configuration now uses Firebase Secret Manager parameters.
- Added storage path validation to the legacy R2 callable functions.
- Added Firebase Storage rules for payment proofs.

## Important deployment action
The R2 credentials found in the old source were exposed. They should be revoked/rotated in Cloudflare immediately and replaced with Firebase Secret Manager values before deploying any R2 functions.

## Validation
- `node --check js/payment.js` passed.
- `node --check js/admin-payments.js` passed.
