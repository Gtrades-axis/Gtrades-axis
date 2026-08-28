# GTRADES-AXIS™ — Journal / Admin Trade Architecture

## Single source of truth

All student journal trades are stored at:

`users/{USER_ID}/trades/{TRADE_ID}`

The student journal, History, Admin Journal Trades, Admin dashboard, and public homepage all use this same path.

### Flow

`Student Journal → users/{uid}/trades/{tradeId} → Admin live listener → Admin publishes → Homepage live listener`

There is no separate admin trade database and no copied public-feed collection.

## Student Journal

`js/journal.js` writes new trades, edits, closes, and deletes to:

`users/{uid}/trades/{tradeId}`

Students cannot publish a trade themselves. The Firestore rules keep the `public` flag unchanged on student updates.

## Admin

`admin-trades.html` and the Trades tab in `admin.html` use a Firestore collection-group listener:

`collectionGroup(db, "trades")`

This reads every student's `users/{uid}/trades` collection in real time.

The admin can set:

`public: true`

to publish a trade, or:

`public: false`

to hide it.

## Homepage

`index.html` uses a collection-group listener with:

`where("public", "==", true)`

Therefore the homepage receives public trades directly from the student journal documents in real time. No second trade collection is required.

## Firestore security

- Student: read/write only their own journal trades.
- Admin: read all student trades and change publication status.
- Public/unauthenticated visitors: read only documents whose `public` field is `true`.
- Students cannot change `public` after creation.
- New student trades are created with `public: false`.

Deploy the rules:

`firebase deploy --only firestore:rules`

Then deploy the website.

## Existing legacy trades

Older versions of the journal wrote to the top-level `/trades` collection. The Admin Journal Trades page includes **Import Legacy Trades**.

That operation is non-destructive:

- Reads old `/trades` records.
- Uses each record's `userId`.
- Creates the same trade ID under `users/{userId}/trades/{tradeId}`.
- Skips records already migrated.
- Does not delete the old records.

After importing, the new journal and all live feeds use only the canonical nested path.
