# GTRADES-AXIS Journal — Automatic Exit & Partial Calculations

## What the trader enters manually
- Entry price
- Stop loss
- Take profit
- Lot size
- Each actual exit price
- Percentage closed at each exit/partial
- Commission

## What the journal calculates automatically
- Risk amount and risk percentage
- Planned/projected RR
- P/L for every exit/partial
- R for every exit/partial
- Total closed percentage and remaining position
- Weighted average exit price
- Gross P/L
- Net P/L after commission
- Actual/gross RR
- Win/Loss/Breakeven/Partial/Pending result
- Closed vs partial trade status
- Account balance impact
- History/analytics values

## Exit calculation
For each exit, the journal uses the existing instrument pip size and pip value logic, the trade direction, lot size, and the percentage of the original position closed.

`Exit P/L = signed price movement in pips × pip value × lot size × (closed % / 100)`

`Exit R = Exit P/L / initial risk amount`

`Gross P/L = sum of all exit P/L values`

`Net P/L = Gross P/L - Commission`

`Actual RR = Gross P/L / initial risk amount`

Commission is intentionally the only P/L-related field that remains manual.

## Partial handling
- 0% closed: Pending
- More than 0% but less than 100%: Partial
- 100% closed: Win, Loss, or Breakeven based on gross P/L
- Exit percentages cannot exceed 100% in total.
- Every non-zero exit percentage must have an actual exit price.

Existing trades that only have a legacy single `exitPrice`/`partialPercent` are still readable. When edited, the legacy exit is converted into the new exit execution log.
