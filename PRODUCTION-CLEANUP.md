# GTRADES-AXIS™ Production Cleanup

This build removes member-facing infrastructure labels and unfinished placeholder behavior while preserving the existing Firebase/Cloudflare implementation internally.

## Member-facing cleanup
- Removed storage-provider names such as Cloudflare R2 from resource and video experiences.
- Removed Firestore/Firebase wording from member-facing status, confirmations, and errors.
- Replaced broken/unavailable date labels with clean omission instead of “date unavailable”.
- Removed the Resource Library debug panel and backend diagnostics from the member UI.
- Unified member navigation language around **Resources / Resource Library**.
- Replaced generic hard-coded resource descriptions with optional real descriptions.
- Changed technical download errors to professional availability messages.

## Production behavior fixes
- Support form now creates a real `support_requests` Firestore record instead of simulating success.
- Added Firestore rules for signed-in support submissions and admin management.
- Academy no longer displays sample fallback modules when no published modules exist.
- Backtesting Lab no longer grants Premium access if account services fail.
- Removed placeholder Twelve Data API key / undefined Dukascopy fetch path from Backtesting Lab.
- Backtesting replay now uses its existing generated practice candle engine consistently.

## Admin-facing cleanup
- Admin resource and video upload pages use product language instead of storage-provider language.
- System status shows **System Online** rather than backend-provider names.
- Delete/upload notices no longer expose internal storage implementation details.

Backend identifiers remain in server/internal implementation files where required for functionality; they are not intended for member-facing presentation.
