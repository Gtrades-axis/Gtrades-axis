# GTRADES-AXIS™ Journal Firestore Overhaul

## Single source of truth

The existing journal trade documents are NOT migrated, copied, renamed, or deleted.

The journal continues using:

`users/{USER_ID}/trades/{TRADE_ID}`

Accounts continue using:

`users/{USER_ID}/accounts/{ACCOUNT_ID}`

The admin Journal Trades page now reads those exact user trade subcollections. It does not read a separate localStorage database and it does not expect the top-level `/trades` collection.

## Permanent operations

- Journal Save -> Firestore `users/{uid}/trades`
- Journal Edit -> Firestore same trade document
- Journal Delete -> Firestore same trade document
- History -> reads Firestore same collection
- Admin Journal Trades -> reads Firestore same collection for every user
- Analytics -> reads Firestore same collection
- Accounts -> Firestore `users/{uid}/accounts`

## Important

Deploy `firestore.rules` with Firebase CLI:

`firebase deploy --only firestore:rules`

Then deploy hosting normally.

The rules deliberately retain the old `/trades`, `/journalAccounts`, and `/tradingAccounts` locations for compatibility. No automatic migration is performed.
