# Public Homepage Trades Fix

The homepage reads `collectionGroup(db, "trades")` with `where("public", "==", true)`.

**Deploy the included `firestore.rules` to Firebase.** Hosting/deploying `index.html` alone will not change Firestore permissions.

Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

Admin visibility remains controlled by the `public` field. Only trades with `public: true` are readable by anonymous visitors.


## Admin approval flow
- Admin opens **Trades** / **Detailed Trades**.
- Clicking **Show** approves the journal trade for public visibility.
- Approval writes `public: true`, `approvedBy`, and `approvedAt` on the trade document.
- The homepage listens for `public == true` and displays approved trades in **📊 Live Community Trades** to unauthenticated visitors.
- Clicking **Hide** removes public visibility and records `hiddenBy` / `hiddenAt`.
