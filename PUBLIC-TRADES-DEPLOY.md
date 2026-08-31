# Public Homepage Trades Fix

The homepage reads `collectionGroup(db, "trades")` with `where("public", "==", true)`.

**Deploy the included `firestore.rules` to Firebase.** Hosting/deploying `index.html` alone will not change Firestore permissions.

Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

Admin visibility remains controlled by the `public` field. Only trades with `public: true` are readable by anonymous visitors.
