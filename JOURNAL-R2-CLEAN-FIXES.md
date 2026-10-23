# GTRADES-AXIS™ Clean Complete Fixes

## Journal
- Full multi-account manager retained.
- Account selector and selected account details retained.
- Edit route `/journal?edit=TRADE_ID` loads the saved trade after account selectors are populated.
- Date, time, pair, direction, session, broker, account, analysis, confluences, entry model, prices, risk, psychology, notes and chart references populate automatically.
- Pending trades can be edited before closing.
- Closed trades can be edited from History.
- Original entry / stop / take-profit / risk / RR are stored separately so later SL-to-BE changes do not overwrite the original setup.
- Closed RR is signed: Win = positive setup RR, Loss = negative setup RR, Breakeven = 0R.
- Legacy positive-loss RR values are normalized when the journal loads.
- Pair-aware calculations cover standard FX, JPY pairs, XAUUSD, XAGUSD, indices and crypto symbols.

## Cloudflare R2
- Admin video/resource uploads use the Cloudflare R2 Worker.
- R2 object keys are sanitized before upload.
- R2 delivery uses `/?key=` consistently.
- Video thumbnail names are sanitized.
- Existing `/file?key=` Worker compatibility remains available.

## Data preservation
The existing localStorage keys and flat trade/account structures are preserved:
- `trades`
- `gtrades_axis_accounts`
