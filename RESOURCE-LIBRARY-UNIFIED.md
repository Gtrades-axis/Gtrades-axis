# Unified Resource Library

Canonical member route: `/resources`

Legacy routes `/premium-resources` and `/downloads` now redirect to `/resources`.

Admin uploads: `/admin-resources` -> Firestore `/resources` -> R2 `resources/...`.

The member library displays published resources only. Premium access is enforced per resource inside the one library, so separate Premium Resources pages are no longer needed.
