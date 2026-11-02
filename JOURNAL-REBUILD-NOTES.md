# GTRADES-AXIS Journal Rebuild

The journal and history now use one canonical flat `localStorage` trade schema under:

- `trades`
- `gtrades_axis_accounts`

## Main fixes

1. History Edit always routes to `/journal?edit=<tradeId>`.
2. Journal resolves the edit ID only after account selectors and form controls exist.
3. Every saved field is populated, including account, risk calculations, chart URLs and confluences.
4. Custom Entry Model values are restored correctly.
5. Pending trades remain fully editable before closing.
6. Closing a pending trade preserves the journal data and only changes result/P&L/commission/close time.
7. Editing a closed trade applies only the balance delta between the old and new trade.
8. Changing the account while editing reverses the old account impact and applies the new account impact.
9. History and journal use the same `trades` storage key and flat schema.
10. Forex pip sizing distinguishes JPY pairs from non-JPY pairs.
11. XAUUSD uses 0.01 pip size and $1/pip per standard 100 oz lot.
12. USDJPY uses price-dependent USD pip value instead of a hard-coded $8.33.
13. Existing nested/older trade objects are normalized on load instead of being discarded.
