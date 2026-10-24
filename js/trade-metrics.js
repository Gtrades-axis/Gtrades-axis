/* ============================================================
   GTRADES-AXIS™ SHARED TRADE METRICS ENGINE
   One source of truth for Projected RR and Realized RR.
   ============================================================ */

export const MIN_PROJECTED_RR = 4;

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeDirection(value) {
  return String(value || "BUY").trim().toUpperCase() === "SELL" ? "SELL" : "BUY";
}

export function validateTradeGeometry({ entry, stopLoss, takeProfit, direction }) {
  const e = toNumber(entry);
  const sl = toNumber(stopLoss);
  const tp = toNumber(takeProfit);
  const dir = normalizeDirection(direction);

  if (!e || !sl || !tp || e === sl || e === tp) {
    return { valid: false, reason: "Entry, stop loss and take profit are required." };
  }

  if (dir === "BUY") {
    if (!(sl < e && tp > e)) {
      return { valid: false, reason: "For a BUY, stop loss must be below entry and take profit above entry." };
    }
  } else if (!(sl > e && tp < e)) {
    return { valid: false, reason: "For a SELL, stop loss must be above entry and take profit below entry." };
  }

  return { valid: true, reason: "" };
}

export function calculateProjectedRR({ entry, stopLoss, takeProfit, direction }) {
  const geometry = validateTradeGeometry({ entry, stopLoss, takeProfit, direction });
  if (!geometry.valid) return 0;

  const e = toNumber(entry);
  const sl = toNumber(stopLoss);
  const tp = toNumber(takeProfit);
  const riskDistance = Math.abs(e - sl);
  const rewardDistance = Math.abs(tp - e);
  return riskDistance > 0 ? rewardDistance / riskDistance : 0;
}

export function meetsMinimumProjectedRR(trade, minimum = MIN_PROJECTED_RR) {
  return calculateProjectedRR(trade) + 1e-9 >= toNumber(minimum, MIN_PROJECTED_RR);
}

export function calculatePriceRR({ entry, stopLoss, exitPrice, direction }) {
  const e = toNumber(entry);
  const sl = toNumber(stopLoss);
  const exit = toNumber(exitPrice);
  const riskDistance = Math.abs(e - sl);
  if (!e || !sl || !exit || riskDistance <= 0) return 0;

  const dir = normalizeDirection(direction);
  const signedMove = dir === "SELL" ? e - exit : exit - e;
  return signedMove / riskDistance;
}

function validExitRows(trade) {
  return Array.isArray(trade?.exitExecutions)
    ? trade.exitExecutions.filter(row => toNumber(row?.price) > 0 && toNumber(row?.percent) > 0)
    : [];
}

export function calculateRealizedRR(trade) {
  if (!trade || typeof trade !== "object") return 0;

  const entry = toNumber(trade.initialEntry ?? trade.entry);
  const stopLoss = toNumber(trade.initialStopLoss ?? trade.stopLoss);
  const direction = normalizeDirection(trade.direction);
  const riskDistance = Math.abs(entry - stopLoss);

  if (entry && stopLoss && riskDistance > 0) {
    const exits = validExitRows(trade);
    if (exits.length) {
      return exits.reduce((sum, row) => {
        const percent = Math.max(0, Math.min(100, toNumber(row.percent)));
        const legRR = calculatePriceRR({
          entry,
          stopLoss,
          exitPrice: row.price,
          direction
        });
        return sum + legRR * (percent / 100);
      }, 0);
    }

    const exitPrice = toNumber(trade.exitPrice);
    if (exitPrice > 0) {
      let percent = toNumber(trade.totalExitPercent ?? trade.partialPercent, 100);
      if (percent <= 0) percent = 100;
      percent = Math.max(0, Math.min(100, percent));
      return calculatePriceRR({ entry, stopLoss, exitPrice, direction }) * (percent / 100);
    }
  }

  const stored = Number(trade.actualRR ?? trade.realizedRR ?? trade.rr);
  return Number.isFinite(stored) ? stored : 0;
}

export function hasRealizedOutcome(trade) {
  if (!trade || typeof trade !== "object") return false;
  if (validExitRows(trade).length) return true;
  if (toNumber(trade.exitPrice) > 0) return true;

  const status = String(trade.status || "").trim().toLowerCase();
  const result = String(trade.result || trade.outcome || "").trim().toLowerCase();
  if (["closed", "partial"].includes(status)) return true;
  if (["win", "loss", "breakeven", "break even", "break-even", "partial"].includes(result)) return true;

  return Number.isFinite(Number(trade.actualRR ?? trade.realizedRR ?? trade.rr)) && status !== "pending";
}

export function averageRealizedRR(trades = []) {
  const values = (Array.isArray(trades) ? trades : [])
    .filter(hasRealizedOutcome)
    .map(calculateRealizedRR)
    .filter(Number.isFinite);

  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function enrichTradeMetrics(trade = {}) {
  const projectedRR = calculateProjectedRR({
    entry: trade.initialEntry ?? trade.entry,
    stopLoss: trade.initialStopLoss ?? trade.stopLoss,
    takeProfit: trade.initialTakeProfit ?? trade.takeProfit,
    direction: trade.direction
  });
  const realizedRR = calculateRealizedRR(trade);

  return {
    ...trade,
    projectedRR,
    plannedRR: toNumber(trade.plannedRR ?? trade.initialRR, projectedRR) || projectedRR,
    actualRR: realizedRR,
    realizedRR,
    rr: realizedRR
  };
}
