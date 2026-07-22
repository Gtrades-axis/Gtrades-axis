// ==========================================================
// GTRADES-AXIS™ ANALYTICS V2
// PART 1A - INITIALIZATION & FIRESTORE ENGINE
// ==========================================================

import { db, auth } from "../firebase.js";

import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ==========================================================
// GLOBAL DATA
// ==========================================================

let trades = [];

let charts = {};

let currentUser = null;

let analyticsLoaded = false;

// ==========================================================
// DASHBOARD ELEMENTS
// ==========================================================

const totalTradesCard =
    document.getElementById("totalTrades");

const totalProfitCard =
    document.getElementById("totalProfit");

const totalLossCard =
    document.getElementById("totalLoss");

const netProfitCard =
    document.getElementById("netProfit");

const winRateCard =
    document.getElementById("winRate");

const profitFactorCard =
    document.getElementById("profitFactor");

const expectancyCard =
    document.getElementById("expectancy");

const avgWinCard =
    document.getElementById("averageWin");

const avgLossCard =
    document.getElementById("averageLoss");

const bestPairCard =
    document.getElementById("bestPair");

const bestSessionCard =
    document.getElementById("bestSession");

const drawdownCard =
    document.getElementById("maxDrawdown");

const streakCard =
    document.getElementById("currentStreak");

const consistencyCard =
    document.getElementById("consistencyScore");

const riskCard =
    document.getElementById("riskScore");

// ==========================================================
// CHART REFERENCES
// ==========================================================

const equityCanvas =
    document.getElementById("equityChart");

const pairCanvas =
    document.getElementById("pairChart");

const sessionCanvas =
    document.getElementById("sessionChart");

const monthlyCanvas =
    document.getElementById("monthlyChart");

const weekdayCanvas =
    document.getElementById("weekdayChart");

const hourCanvas =
    document.getElementById("hourChart");

const rrCanvas =
    document.getElementById("rrChart");

// ==========================================================
// AUTH
// ==========================================================

onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;

    }

    currentUser = user;

    loadTradesRealtime();

});

// ==========================================================
// REALTIME FIRESTORE
// ==========================================================

function loadTradesRealtime() {

    const tradesRef = collection(db, "users", currentUser.uid, "trades");

    const q = query(
        tradesRef,
        orderBy("date", "asc")
    );

    onSnapshot(q, (snapshot) => {

        trades = [];

        snapshot.forEach((doc) => {

            trades.push({

                id: doc.id,

                ...doc.data()

            });

        });

        console.clear();

        console.log("======================================");

        console.log("GTRADES-AXIS ANALYTICS");

        console.log("Realtime Sync Active");

        console.log("Trades:", trades.length);

        console.log("======================================");

        refreshAnalytics();

    });

}

// ==========================================================
// MASTER REFRESH
// ==========================================================

function refreshAnalytics() {

    if (analyticsLoaded === false) {

        initializeCharts();

        analyticsLoaded = true;

    }

    calculateOverview();

    calculatePerformance();

    calculateSessions();

    calculatePairs();

    calculateMonthly();

    calculateWeekdays();

    calculateHours();

    calculateRisk();

    calculateExpectancy();

    calculateConsistency();

    calculateDrawdown();

    calculateStreak();

    updateCharts();

    buildAIInsights();

}

console.log("Analytics Engine Ready");
// ==========================================================
// PART 1B
// CORE STATISTICS ENGINE
// ==========================================================

let stats = {};

function calculateOverview() {

    stats = {

        totalTrades: trades.length,

        wins: 0,

        losses: 0,

        breakeven: 0,

        grossProfit: 0,

        grossLoss: 0,

        netProfit: 0,

        winRate: 0,

        profitFactor: 0,

        averageWin: 0,

        averageLoss: 0,

        expectancy: 0,

        largestWin: 0,

        largestLoss: 0,

        equity: [],

        runningBalance: 0

    };

    let totalWinningTrades = 0;
    let totalLosingTrades = 0;

    trades.forEach(trade => {

        const pnl = Number(
            trade.profit ??
            trade.pnl ??
            trade.net ??
            0
        );

        stats.runningBalance += pnl;

        stats.equity.push(stats.runningBalance);

        if (pnl > 0) {

            stats.wins++;

            totalWinningTrades++;

            stats.grossProfit += pnl;

            if (pnl > stats.largestWin)
                stats.largestWin = pnl;

        }

        else if (pnl < 0) {

            stats.losses++;

            totalLosingTrades++;

            stats.grossLoss += Math.abs(pnl);

            if (
                Math.abs(pnl) >
                Math.abs(stats.largestLoss)
            ) {

                stats.largestLoss = pnl;

            }

        }

        else {

            stats.breakeven++;

        }

    });

    stats.netProfit =
        stats.grossProfit -
        stats.grossLoss;

    if (stats.totalTrades > 0) {

        stats.winRate =
            (stats.wins / stats.totalTrades) * 100;

    }

    if (stats.grossLoss > 0) {

        stats.profitFactor =
            stats.grossProfit /
            stats.grossLoss;

    }
    else {

        stats.profitFactor = stats.grossProfit;

    }

    if (totalWinningTrades > 0) {

        stats.averageWin =
            stats.grossProfit /
            totalWinningTrades;

    }

    if (totalLosingTrades > 0) {

        stats.averageLoss =
            stats.grossLoss /
            totalLosingTrades;

    }

    stats.expectancy =
        ((stats.winRate / 100) * stats.averageWin)
        -
        (((100 - stats.winRate) / 100) * stats.averageLoss);

    updateOverviewCards();

}

// ==========================================================
// UPDATE DASHBOARD CARDS
// ==========================================================

function updateOverviewCards() {

    if (totalTradesCard)
        totalTradesCard.textContent =
            stats.totalTrades;

    if (totalProfitCard)
        totalProfitCard.textContent =
            "$" +
            stats.grossProfit.toFixed(2);

    if (totalLossCard)
        totalLossCard.textContent =
            "$" +
            stats.grossLoss.toFixed(2);

    if (netProfitCard)
        netProfitCard.textContent =
            "$" +
            stats.netProfit.toFixed(2);

    if (winRateCard)
        winRateCard.textContent =
            stats.winRate.toFixed(1) + "%";

    if (profitFactorCard)
        profitFactorCard.textContent =
            stats.profitFactor.toFixed(2);

    if (avgWinCard)
        avgWinCard.textContent =
            "$" +
            stats.averageWin.toFixed(2);

    if (avgLossCard)
        avgLossCard.textContent =
            "$" +
            stats.averageLoss.toFixed(2);

    if (expectancyCard)
        expectancyCard.textContent =
            "$" +
            stats.expectancy.toFixed(2);

}

// ==========================================================
// LARGEST WIN / LOSS
// ==========================================================

function getLargestWin() {

    return stats.largestWin;

}

function getLargestLoss() {

    return stats.largestLoss;

}

// ==========================================================
// EQUITY GROWTH
// ==========================================================

function getEquityGrowth() {

    if (stats.totalTrades === 0)
        return 0;

    const first = stats.equity[0] || 0;

    const last =
        stats.equity[
            stats.equity.length - 1
        ] || 0;

    if (first === 0)
        return last;

    return ((last - first) / Math.abs(first)) * 100;

}

// ==========================================================
// WIN LOSS RATIO
// ==========================================================

function getWinLossRatio() {

    if (stats.losses === 0)
        return stats.wins;

    return (
        stats.wins /
        stats.losses
    ).toFixed(2);

}

console.log("Core Statistics Loaded");
// ==========================================================
// PART 1C
// DRAWDOWN • STREAKS • CONSISTENCY • RISK
// ==========================================================

// ----------------------------------------------------------
// MAXIMUM DRAWDOWN
// ----------------------------------------------------------

function calculateDrawdown() {

    let peak = 0;

    let drawdown = 0;

    let maxDrawdown = 0;

    stats.equity.forEach(balance => {

        if (balance > peak) {

            peak = balance;

        }

        drawdown = peak - balance;

        if (drawdown > maxDrawdown) {

            maxDrawdown = drawdown;

        }

    });

    stats.maxDrawdown = maxDrawdown;

    if (drawdownCard) {

        drawdownCard.textContent =
            "$" + maxDrawdown.toFixed(2);

    }

}

// ----------------------------------------------------------
// WIN / LOSS STREAKS
// ----------------------------------------------------------

function calculateStreak() {

    let current = 0;

    let longestWin = 0;

    let longestLoss = 0;

    let currentType = "";

    trades.forEach(trade => {

        const pnl = Number(trade.profit || 0);

        if (pnl > 0) {

            if (currentType === "win") {

                current++;

            }

            else {

                current = 1;

                currentType = "win";

            }

            if (current > longestWin)

                longestWin = current;

        }

        else if (pnl < 0) {

            if (currentType === "loss") {

                current++;

            }

            else {

                current = 1;

                currentType = "loss";

            }

            if (current > longestLoss)

                longestLoss = current;

        }

    });

    stats.longestWinStreak = longestWin;

    stats.longestLossStreak = longestLoss;

    if (streakCard) {

        streakCard.innerHTML =

            longestWin +

            "W / " +

            longestLoss +

            "L";

    }

}

// ----------------------------------------------------------
// CONSISTENCY SCORE
// ----------------------------------------------------------

function calculateConsistency() {

    if (trades.length === 0) {

        stats.consistency = 0;

        if (consistencyCard)

            consistencyCard.textContent = "0%";

        return;

    }

    let score = 100;

    if (stats.winRate < 60)

        score -= 20;

    if (stats.maxDrawdown > stats.grossProfit * 0.50)

        score -= 20;

    if (stats.longestLossStreak >= 4)

        score -= 20;

    if (stats.profitFactor < 1.5)

        score -= 20;

    if (stats.expectancy < 0)

        score -= 20;

    score = Math.max(score, 0);

    stats.consistency = score;

    if (consistencyCard)

        consistencyCard.textContent =

            score + "%";

}

// ----------------------------------------------------------
// RISK SCORE
// ----------------------------------------------------------

function calculateRisk() {

    if (trades.length === 0) {

        stats.risk = 0;

        if (riskCard)

            riskCard.textContent = "--";

        return;

    }

    let risky = 0;

    trades.forEach(trade => {

        const pnl = Number(trade.profit || 0);

        const rr = Number(trade.rr || 0);

        if (pnl < 0)

            risky++;

        if (rr < 1)

            risky++;

        if (Math.abs(pnl) > stats.averageLoss * 2)

            risky++;

    });

    let score =

        100 -

        ((risky / (trades.length * 3)) * 100);

    score = Math.max(0, Math.min(100, score));

    stats.risk = score;

    if (riskCard)

        riskCard.textContent =

            score.toFixed(0) + "%";

}

// ----------------------------------------------------------
// MONTHLY ENGINE
// ----------------------------------------------------------

function calculateMonthly() {

    stats.monthly = {};

    trades.forEach(trade => {

        if (!trade.date)

            return;

        const month =

            new Date(trade.date)

            .toLocaleDateString(

                "en-US",

                {

                    month: "short",

                    year: "numeric"

                }

            );

        if (!stats.monthly[month])

            stats.monthly[month] = 0;

        stats.monthly[month] +=

            Number(trade.profit || 0);

    });

}

// ----------------------------------------------------------
// PAIR ENGINE
// ----------------------------------------------------------

function calculatePairs() {

    stats.pairs = {};

    trades.forEach(trade => {

        const pair = trade.pair || "Unknown";

        if (!stats.pairs[pair])

            stats.pairs[pair] = {

                profit: 0,

                trades: 0

            };

        stats.pairs[pair].profit +=

            Number(trade.profit || 0);

        stats.pairs[pair].trades++;

    });

    let best = "";

    let highest = -999999;

    Object.keys(stats.pairs).forEach(pair => {

        if (

            stats.pairs[pair].profit >

            highest

        ) {

            highest =

                stats.pairs[pair].profit;

            best = pair;

        }

    });

    if (bestPairCard)

        bestPairCard.textContent =

            best;

}

// ----------------------------------------------------------
// SESSION ENGINE
// ----------------------------------------------------------

function calculateSessions() {

    stats.sessions = {};

    trades.forEach(trade => {

        const session =

            trade.session ||

            "Unknown";

        if (!stats.sessions[session])

            stats.sessions[session] = 0;

        stats.sessions[session] +=

            Number(trade.profit || 0);

    });

    let best = "";

    let highest = -999999;

    Object.keys(stats.sessions).forEach(session => {

        if (

            stats.sessions[session] >

            highest

        ) {

            highest =

                stats.sessions[session];

            best = session;

        }

    });

    if (bestSessionCard)

        bestSessionCard.textContent =

            best;

}

console.log("Performance Engine Loaded");
// ==========================================================
// PART 2B
// UPDATE ALL CHARTS
// ==========================================================

function updateCharts() {

    updateEquityChart();

    updatePairChart();

    updateSessionChart();

    updateMonthlyChart();

    updateWeekdayChart();

    updateHourChart();

    updateRRChart();

}

// ==========================================================
// EQUITY CURVE
// ==========================================================

function updateEquityChart() {

    if (!charts.equity) return;

    charts.equity.data.labels = trades.map((t, i) => i + 1);

    charts.equity.data.datasets[0].data = stats.equity;

    charts.equity.update();

}

// ==========================================================
// PAIR PERFORMANCE
// ==========================================================

function updatePairChart() {

    if (!charts.pairs) return;

    const labels = [];

    const values = [];

    Object.keys(stats.pairs).forEach(pair => {

        labels.push(pair);

        values.push(stats.pairs[pair].profit);

    });

    charts.pairs.data.labels = labels;

    charts.pairs.data.datasets[0].data = values;

    charts.pairs.update();

}

// ==========================================================
// SESSION PERFORMANCE
// ==========================================================

function updateSessionChart() {

    if (!charts.sessions) return;

    const labels = [];

    const values = [];

    Object.keys(stats.sessions).forEach(session => {

        labels.push(session);

        values.push(stats.sessions[session]);

    });

    charts.sessions.data.labels = labels;

    charts.sessions.data.datasets[0].data = values;

    charts.sessions.update();

}

// ==========================================================
// MONTHLY PERFORMANCE
// ==========================================================

function updateMonthlyChart() {

    if (!charts.monthly) return;

    charts.monthly.data.labels = Object.keys(stats.monthly);

    charts.monthly.data.datasets[0].data = Object.values(stats.monthly);

    charts.monthly.update();

}

// ==========================================================
// WEEKDAY PERFORMANCE
// ==========================================================

function updateWeekdayChart() {

    if (!charts.weekdays) return;

    const weekdays = [

        "Sunday",

        "Monday",

        "Tuesday",

        "Wednesday",

        "Thursday",

        "Friday",

        "Saturday"

    ];

    const totals = new Array(7).fill(0);

    trades.forEach(trade => {

        if (!trade.date) return;

        const day = new Date(trade.date).getDay();

        const pnl = Number(

            trade.profit ??

            trade.pnl ??

            0

        );

        totals[day] += pnl;

    });

    charts.weekdays.data.labels = weekdays;

    charts.weekdays.data.datasets[0].data = totals;

    charts.weekdays.update();

}

// ==========================================================
// HOURLY PERFORMANCE
// ==========================================================

function updateHourChart() {

    if (!charts.hours) return;

    const totals = {};

    for (let i = 0; i < 24; i++) {

        totals[i] = 0;

    }

    trades.forEach(trade => {

        if (!trade.date) return;

        const hour = new Date(trade.date).getHours();

        totals[hour] += Number(

            trade.profit ??

            trade.pnl ??

            0

        );

    });

    charts.hours.data.labels = Object.keys(totals);

    charts.hours.data.datasets[0].data = Object.values(totals);

    charts.hours.update();

}

// ==========================================================
// RR DISTRIBUTION
// ==========================================================

function updateRRChart() {

    if (!charts.rr) return;

    const labels = [];

    const values = [];

    trades.forEach((trade, index) => {

        labels.push(index + 1);

        values.push(

            Number(

                trade.rr ??

                trade.RR ??

                trade.riskReward ??

                0

            )

        );

    });

    charts.rr.data.labels = labels;

    charts.rr.data.datasets[0].data = values;

    charts.rr.update();

}

console.log("Charts updated successfully.");
// ==========================================================
// PART 2C
// UPDATE DASHBOARD STATISTICS
// ==========================================================

function updateDashboardCards() {

    // ------------------------------------------------------
    // TOTAL TRADES
    // ------------------------------------------------------

    if (totalTradesCard) {

        totalTradesCard.textContent =
            stats.totalTrades;

    }

    // ------------------------------------------------------
    // TOTAL PROFIT
    // ------------------------------------------------------

    if (totalProfitCard) {

        totalProfitCard.textContent =
            "$" + stats.grossProfit.toFixed(2);

    }

    // ------------------------------------------------------
    // TOTAL LOSS
    // ------------------------------------------------------

    if (totalLossCard) {

        totalLossCard.textContent =
            "$" + stats.grossLoss.toFixed(2);

    }

    // ------------------------------------------------------
    // NET PROFIT
    // ------------------------------------------------------

    if (netProfitCard) {

        netProfitCard.textContent =
            "$" + stats.netProfit.toFixed(2);

        netProfitCard.classList.remove(
            "positive",
            "negative"
        );

        netProfitCard.classList.add(

            stats.netProfit >= 0 ?

            "positive" :

            "negative"

        );

    }

    // ------------------------------------------------------
    // WIN RATE
    // ------------------------------------------------------

    if (winRateCard) {

        winRateCard.textContent =
            stats.winRate.toFixed(1) + "%";

    }

    // ------------------------------------------------------
    // PROFIT FACTOR
    // ------------------------------------------------------

    if (profitFactorCard) {

        profitFactorCard.textContent =
            stats.profitFactor.toFixed(2);

    }

    // ------------------------------------------------------
    // EXPECTANCY
    // ------------------------------------------------------

    if (expectancyCard) {

        expectancyCard.textContent =
            "$" + stats.expectancy.toFixed(2);

    }

    // ------------------------------------------------------
    // AVERAGE WIN
    // ------------------------------------------------------

    if (avgWinCard) {

        avgWinCard.textContent =
            "$" + stats.averageWin.toFixed(2);

    }

    // ------------------------------------------------------
    // AVERAGE LOSS
    // ------------------------------------------------------

    if (avgLossCard) {

        avgLossCard.textContent =
            "$" + stats.averageLoss.toFixed(2);

    }

    // ------------------------------------------------------
    // BEST PAIR
    // ------------------------------------------------------

    if (bestPairCard) {

        bestPairCard.textContent =
            bestPairCard.textContent || "--";

    }

    // ------------------------------------------------------
    // BEST SESSION
    // ------------------------------------------------------

    if (bestSessionCard) {

        bestSessionCard.textContent =
            bestSessionCard.textContent || "--";

    }

    // ------------------------------------------------------
    // MAX DRAWDOWN
    // ------------------------------------------------------

    if (drawdownCard) {

        drawdownCard.textContent =
            "$" + stats.maxDrawdown.toFixed(2);

    }

    // ------------------------------------------------------
    // STREAK
    // ------------------------------------------------------

    if (streakCard) {

        streakCard.textContent =
            stats.longestWinStreak +
            "W / " +
            stats.longestLossStreak +
            "L";

    }

    // ------------------------------------------------------
    // CONSISTENCY
    // ------------------------------------------------------

    if (consistencyCard) {

        consistencyCard.textContent =
            stats.consistency.toFixed(0) + "%";

    }

    // ------------------------------------------------------
    // RISK SCORE
    // ------------------------------------------------------

    if (riskCard) {

        riskCard.textContent =
            stats.risk.toFixed(0) + "%";

    }

}

// ==========================================================
// MODIFY refreshAnalytics()
// ==========================================================

// Add this line immediately after:

updateCharts();

// and before:

buildAIInsights();

// ADD:

updateDashboardCards();

console.log("Dashboard cards updated.");
// ==========================================================
// PART 3A
// GTRADES-AXIS AI TRADING COACH
// ==========================================================

function buildAIInsights() {

    const container = document.getElementById("aiInsights");

    if (!container) return;

    const insights = [];

    // ------------------------------------------------------
    // NO TRADES
    // ------------------------------------------------------

    if (trades.length === 0) {

        container.innerHTML = `

            <div class="ai-card">

                <h3>🤖 AI Coach</h3>

                <p>No trades available yet.</p>

                <small>
                    Start journaling trades to unlock
                    advanced analytics.
                </small>

            </div>

        `;

        return;

    }

    // ------------------------------------------------------
    // WIN RATE
    // ------------------------------------------------------

    if (stats.winRate >= 70) {

        insights.push({

            type: "success",

            title: "Excellent Win Rate",

            message:
                "Your win rate is above 70%. Continue following your trading plan."

        });

    }

    else if (stats.winRate >= 60) {

        insights.push({

            type: "good",

            title: "Healthy Win Rate",

            message:
                "Your trading performance is consistent. Focus on protecting profits."

        });

    }

    else if (stats.winRate >= 50) {

        insights.push({

            type: "warning",

            title: "Average Win Rate",

            message:
                "Improve trade selection and avoid forcing setups."

        });

    }

    else {

        insights.push({

            type: "danger",

            title: "Low Win Rate",

            message:
                "Reduce trading frequency and wait for higher probability setups."

        });

    }

    // ------------------------------------------------------
    // PROFIT FACTOR
    // ------------------------------------------------------

    if (stats.profitFactor >= 2) {

        insights.push({

            type: "success",

            title: "Strong Profit Factor",

            message:
                "Your winners significantly outweigh your losers."

        });

    }

    else if (stats.profitFactor >= 1.5) {

        insights.push({

            type: "good",

            title: "Good Profit Factor",

            message:
                "Maintain discipline and avoid unnecessary losses."

        });

    }

    else if (stats.profitFactor >= 1) {

        insights.push({

            type: "warning",

            title: "Profit Factor Needs Improvement",

            message:
                "Small improvements in risk management could greatly improve profitability."

        });

    }

    else {

        insights.push({

            type: "danger",

            title: "Negative Edge",

            message:
                "Your losses currently outweigh your gains."

        });

    }

    // ------------------------------------------------------
    // DRAWDOWN
    // ------------------------------------------------------

    if (stats.maxDrawdown > stats.grossProfit * 0.50) {

        insights.push({

            type: "danger",

            title: "High Drawdown",

            message:
                "Reduce risk per trade until consistency improves."

        });

    }

    // ------------------------------------------------------
    // STREAKS
    // ------------------------------------------------------

    if (stats.longestLossStreak >= 5) {

        insights.push({

            type: "warning",

            title: "Loss Streak",

            message:
                "Pause after several consecutive losses and review your journal."

        });

    }

    if (stats.longestWinStreak >= 5) {

        insights.push({

            type: "success",

            title: "Winning Momentum",

            message:
                "Excellent consistency. Stay disciplined and avoid overconfidence."

        });

    }

    // ------------------------------------------------------
    // EXPECTANCY
    // ------------------------------------------------------

    if (stats.expectancy > 0) {

        insights.push({

            type: "success",

            title: "Positive Expectancy",

            message:
                "Your trading system has a statistical edge."

        });

    }

    else {

        insights.push({

            type: "danger",

            title: "Negative Expectancy",

            message:
                "Your strategy requires adjustments before increasing position size."

        });

    }

    // ------------------------------------------------------
    // CONSISTENCY
    // ------------------------------------------------------

    if (stats.consistency >= 80) {

        insights.push({

            type: "success",

            title: "Professional Consistency",

            message:
                "Excellent trading discipline."

        });

    }

    else if (stats.consistency >= 60) {

        insights.push({

            type: "good",

            title: "Consistent Trading",

            message:
                "Minor improvements could produce outstanding results."

        });

    }

    else {

        insights.push({

            type: "warning",

            title: "Inconsistent Performance",

            message:
                "Focus on executing only your highest quality setups."

        });

    }

    // ------------------------------------------------------
    // BEST PAIR
    // ------------------------------------------------------

    if (bestPairCard && bestPairCard.textContent !== "--") {

        insights.push({

            type: "info",

            title: "Best Performing Pair",

            message:
                "Your strongest market is " +
                bestPairCard.textContent +
                ". Consider prioritizing it."

        });

    }

    // ------------------------------------------------------
    // BEST SESSION
    // ------------------------------------------------------

    if (bestSessionCard && bestSessionCard.textContent !== "--") {

        insights.push({

            type: "info",

            title: "Best Trading Session",

            message:
                "You perform best during the " +
                bestSessionCard.textContent +
                " session."

        });

    }

    // ------------------------------------------------------
    // DISPLAY
    // ------------------------------------------------------

    container.innerHTML = insights.map(item => `

        <div class="ai-card ${item.type}">

            <h4>${item.title}</h4>

            <p>${item.message}</p>

        </div>

    `).join("");

    console.log("AI Coach Updated");

}
// ==========================================================
// PART 3B
// ADVANCED AI TRADING REPORT
// ==========================================================

function generateTradingGrade() {

    let score = 0;

    // ---------------------------------------
    // WIN RATE (25)
    // ---------------------------------------

    if (stats.winRate >= 70) score += 25;
    else if (stats.winRate >= 60) score += 20;
    else if (stats.winRate >= 50) score += 15;
    else if (stats.winRate >= 40) score += 10;

    // ---------------------------------------
    // PROFIT FACTOR (25)
    // ---------------------------------------

    if (stats.profitFactor >= 2.5) score += 25;
    else if (stats.profitFactor >= 2) score += 22;
    else if (stats.profitFactor >= 1.5) score += 18;
    else if (stats.profitFactor >= 1) score += 10;

    // ---------------------------------------
    // EXPECTANCY (15)
    // ---------------------------------------

    if (stats.expectancy > 0) score += 15;

    // ---------------------------------------
    // CONSISTENCY (20)
    // ---------------------------------------

    score += Math.min(20, Math.round(stats.consistency / 5));

    // ---------------------------------------
    // DRAWDOWN (15)
    // ---------------------------------------

    if (stats.maxDrawdown <= 2) score += 15;
    else if (stats.maxDrawdown <= 5) score += 12;
    else if (stats.maxDrawdown <= 10) score += 8;
    else score += 3;

    stats.gradeScore = score;

    if (score >= 90)
        stats.grade = "A+";

    else if (score >= 80)
        stats.grade = "A";

    else if (score >= 70)
        stats.grade = "B";

    else if (score >= 60)
        stats.grade = "C";

    else if (score >= 50)
        stats.grade = "D";

    else
        stats.grade = "F";

}

// ==========================================================

function updateTradingReport() {

    generateTradingGrade();

    const grade =
        document.getElementById("tradingGrade");

    const score =
        document.getElementById("gradeScore");

    const summary =
        document.getElementById("tradeSummary");

    if (grade)
        grade.textContent = stats.grade;

    if (score)
        score.textContent =
        stats.gradeScore + "/100";

    if (!summary) return;

    let message = "";

    switch (stats.grade) {

        case "A+":

            message =
                "Outstanding trading performance. Your journal shows excellent discipline, consistency and positive expectancy. Continue following your trading plan.";

            break;

        case "A":

            message =
                "Excellent trader. Small improvements in execution can push you to professional level.";

            break;

        case "B":

            message =
                "Very good performance. Focus on improving risk management and avoiding unnecessary trades.";

            break;

        case "C":

            message =
                "Average consistency. Your strategy has potential but execution requires improvement.";

            break;

        case "D":

            message =
                "Below average performance. Review your journal carefully and reduce trading frequency.";

            break;

        default:

            message =
                "Current statistics show no measurable trading edge. Return to demo or reduce risk while refining your strategy.";

    }

    summary.innerHTML = `

        <strong>Overall Assessment</strong>

        <br><br>

        ${message}

        <hr>

        <strong>AI Recommendations</strong>

        <ul>

            <li>✔ Continue journaling every trade.</li>

            <li>✔ Review screenshots before every session.</li>

            <li>✔ Trade only your proven setups.</li>

            <li>✔ Maintain consistent risk.</li>

            <li>✔ Review your losing trades weekly.</li>

        </ul>

    `;

}

// ==========================================================
// MODIFY refreshAnalytics()
// ==========================================================

// Immediately AFTER:

buildAIInsights();

// ADD:

updateTradingReport();

console.log("Advanced AI Report Ready");
// ==========================================================
// PART 4
// EXPORT ENGINE (CSV + JSON + PRINT)
// ==========================================================

// ----------------------------------------------------------
// EXPORT CSV
// ----------------------------------------------------------

function exportCSV() {

    if (trades.length === 0) {

        alert("No trades to export.");

        return;

    }

    const headers = [

        "Date",
        "Pair",
        "Direction",
        "Session",
        "Entry",
        "Stop Loss",
        "Take Profit",
        "Risk Reward",
        "Lot Size",
        "Profit",
        "Result",
        "Notes"

    ];

    let csv = headers.join(",") + "\n";

    trades.forEach(trade => {

        csv += [

            trade.date || "",

            trade.pair || "",

            trade.direction || "",

            trade.session || "",

            trade.entry || "",

            trade.stopLoss || "",

            trade.takeProfit || "",

            trade.rr || "",

            trade.lotSize || "",

            trade.profit || 0,

            trade.result || "",

            `"${trade.notes || ""}"`

        ].join(",");

        csv += "\n";

    });

    const blob = new Blob(

        [csv],

        {

            type: "text/csv"

        }

    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download =

        "GTRADES_Trades.csv";

    a.click();

    URL.revokeObjectURL(url);

}

// ----------------------------------------------------------
// EXPORT JSON
// ----------------------------------------------------------

function exportJSON() {

    const blob = new Blob(

        [

            JSON.stringify(

                trades,

                null,

                2

            )

        ],

        {

            type:

            "application/json"

        }

    );

    const url =

        URL.createObjectURL(blob);

    const a =

        document.createElement("a");

    a.href = url;

    a.download =

        "GTRADES_Trades.json";

    a.click();

    URL.revokeObjectURL(url);

}

// ----------------------------------------------------------
// PRINT REPORT
// ----------------------------------------------------------

function printAnalytics() {

    window.print();

}

// ----------------------------------------------------------
// EXPORT SUMMARY
// ----------------------------------------------------------

function exportSummary() {

    let report = `

==============================

GTRADES-AXIS ANALYTICS REPORT

==============================

Total Trades : ${stats.totalTrades}

Wins : ${stats.wins}

Losses : ${stats.losses}

Win Rate : ${stats.winRate.toFixed(2)}%

Gross Profit : $${stats.grossProfit.toFixed(2)}

Gross Loss : $${stats.grossLoss.toFixed(2)}

Net Profit : $${stats.netProfit.toFixed(2)}

Profit Factor : ${stats.profitFactor.toFixed(2)}

Average Win : $${stats.averageWin.toFixed(2)}

Average Loss : $${stats.averageLoss.toFixed(2)}

Expectancy : $${stats.expectancy.toFixed(2)}

Largest Win : $${stats.largestWin.toFixed(2)}

Largest Loss : $${stats.largestLoss.toFixed(2)}

Maximum Drawdown : $${stats.maxDrawdown.toFixed(2)}

Longest Win Streak : ${stats.longestWinStreak}

Longest Loss Streak : ${stats.longestLossStreak}

Consistency : ${stats.consistency.toFixed(0)}%

Risk Score : ${stats.risk.toFixed(0)}%

Grade : ${stats.grade}

==============================

Generated by

GTRADES-AXIS™

`;

    const blob = new Blob(

        [

            report

        ],

        {

            type:

            "text/plain"

        }

    );

    const url =

        URL.createObjectURL(blob);

    const a =

        document.createElement("a");

    a.href = url;

    a.download =

        "Trading_Report.txt";

    a.click();

    URL.revokeObjectURL(url);

}

// ----------------------------------------------------------
// AUTO BIND BUTTONS
// ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

    document

        .getElementById("exportCSV")

        ?.addEventListener(

            "click",

            exportCSV

        );

    document

        .getElementById("exportJSON")

        ?.addEventListener(

            "click",

            exportJSON

        );

    document

        .getElementById("printReport")

        ?.addEventListener(

            "click",

            printAnalytics

        );

    document

        .getElementById("exportSummary")

        ?.addEventListener(

            "click",

            exportSummary

        );

});

console.log("Export Engine Ready");
// ==========================================================
// PART 5
// FINAL OPTIMIZATION ENGINE
// AUTO REFRESH • EMPTY STATE • LIVE STATUS
// ==========================================================

// ----------------------------------------------------------
// EMPTY STATE
// ----------------------------------------------------------

function showEmptyAnalytics() {

    if (trades.length !== 0) return;

    document.querySelectorAll(".stat-value").forEach(card => {

        card.textContent = "--";

    });

    const ai = document.getElementById("aiInsights");

    if (ai) {

        ai.innerHTML = `

        <div class="ai-card info">

            <h3>Welcome to GTRADES-AXIS™ Analytics</h3>

            <p>

                Your analytics dashboard becomes fully active
                after you journal your first trade.

            </p>

        </div>

        `;

    }

}

// ----------------------------------------------------------
// LIVE STATUS
// ----------------------------------------------------------

function updateSyncStatus() {

    const sync = document.getElementById("syncStatus");

    if (!sync) return;

    sync.innerHTML = `

        <i class="fa-solid fa-circle-check"></i>

        Synced

        ${new Date().toLocaleTimeString()}

    `;

}

// ----------------------------------------------------------
// PERFORMANCE SCORE
// ----------------------------------------------------------

function calculatePerformanceScore() {

    let score = 0;

    score += Math.min(30, stats.winRate / 3);

    score += Math.min(30, stats.profitFactor * 10);

    score += Math.min(20, stats.consistency / 5);

    score += Math.min(20, stats.risk / 5);

    stats.performanceScore =

        Math.round(score);

    const card =

        document.getElementById("performanceScore");

    if (card)

        card.textContent =

            stats.performanceScore + "%";

}

// ----------------------------------------------------------
// MONTHLY GOAL
// ----------------------------------------------------------

function calculateMonthlyGoal() {

    const goal =

        document.getElementById("goalProgress");

    if (!goal) return;

    const target = 10;

    const current =

        ((stats.netProfit / 5000) * 100);

    const percent =

        Math.max(

            0,

            Math.min(

                100,

                (current / target) * 100

            )

        );

    goal.style.width =

        percent + "%";

    goal.innerText =

        percent.toFixed(0) + "%";

}

// ----------------------------------------------------------
// FIRESTORE CONNECTION INDICATOR
// ----------------------------------------------------------

window.addEventListener("online", () => {

    console.log("Firestore Connected");

});

window.addEventListener("offline", () => {

    console.log("Offline Mode");

});

// ----------------------------------------------------------
// MASTER UPDATE
// ----------------------------------------------------------

function finalizeAnalytics() {

    showEmptyAnalytics();

    calculatePerformanceScore();

    calculateMonthlyGoal();

    updateSyncStatus();

}

// ----------------------------------------------------------
// MODIFY refreshAnalytics()
// ----------------------------------------------------------

// At the END of refreshAnalytics()
// after buildAIInsights();
// updateTradingReport();
// updateDashboardCards();

// ADD:

finalizeAnalytics();

// ----------------------------------------------------------

console.log("====================================");

console.log("GTRADES-AXIS™");

console.log("Professional Analytics Engine Loaded");


console.log("Realtime Firestore Sync Active");

console.log("AI Coach Active");

console.log("Charts Active");

console.log("History Connected");

console.log("Journal Connected");

console.log("Export Engine Ready");

console.log("Analytics Version 3.0");

console.log("====================================");