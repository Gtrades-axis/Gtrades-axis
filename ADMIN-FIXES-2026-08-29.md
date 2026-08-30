# GTRADES-AXIS Admin Fixes — 2026-08-29

## Fixed
- Admin dashboard crash caused by `state.members` being undefined. The Members badge now reads from `state.users`.
- Added an explicit R2 Worker endpoint meta configuration to the admin dashboard and bumped the admin JS cache version.
- Added Firebase Hosting rewrites for the clean admin routes, including `/admin-trades`, `/admin-members`, `/admin-payments`, `/admin-videos`, `/admin-video-upload`, `/admin`, and `/academy-admin`.
- Reworked the standalone Members Manager so its search/filter controls match the HTML IDs and its View/Manage actions open the member modal.
- Implemented member actions: Free, Premium, Admin, Demote, Suspend, and Firestore profile deletion.
- Fixed the malformed nested Demote button in the Members page.
- Added compatibility styling for the current Members Manager modal/cards so the page no longer renders as unstyled/raw HTML.
- Replaced the old read-only Academy Admin route with the actual Academy management editor.
- Made **Add Module** functional.
- Added module creation fields: order, title, description, access, published state, and optional initial lessons JSON.
- Added **Import JSON File** for creating one or multiple academy modules from JSON.
- Made module deletion functional.
- Preserved existing Firestore rules: `academy_modules` writes remain admin-only.

## Validation
- JavaScript syntax checks pass for the changed admin scripts and R2 worker.
- Inline Academy Admin module syntax check passes.
- No missing local `<script src>` files remain in the HTML pages.
