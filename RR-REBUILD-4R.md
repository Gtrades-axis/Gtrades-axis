# GTRADES-AXIS™ RR Rebuild — Minimum 4R

## Rule
- Minimum **projected** RR for new setups: **4.00R (1:4)**.
- Realized RR is not forced to 4R; it reflects actual exits, including losses, breakeven and partial exits.

## Shared metrics engine
`js/trade-metrics.js` is the single source of truth for:
- BUY/SELL geometry validation
- Projected RR
- Actual/realized RR
- Partial-exit weighted RR
- Average realized RR

## Pages aligned
- Journal
- History
- Analytics
- Profile
- Strategy education
- Academy RR lesson/quiz

## Examples validated
- 4.08R, 4.15R, -0.91R => average 2.44R
- 50% at +2R + 50% at +4R => realized 3.00R
- Wrong-side BUY/SELL SL/TP geometry => rejected
