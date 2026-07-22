// ======================================================
// GTRADES-AXIS™ JOURNAL
// PART 1
// ======================================================

let trades = JSON.parse(localStorage.getItem("gtradesJournal")) || [];

// ======================================================
// FORM
// ======================================================

const tradeForm = document.getElementById("tradeForm");

if (tradeForm) {

    tradeForm.addEventListener("submit", saveTrade);

}

// ======================================================
// SAVE TRADE
// ======================================================

function saveTrade(e) {

    e.preventDefault();

    const trade = {

        id: Date.now(),

        // ==========================
        // BASIC INFO
        // ==========================

        tradeDate: document.getElementById("tradeDate").value,

        tradeTime: document.getElementById("tradeTime").value,

        pair: document.getElementById("pair").value,

        direction: document.getElementById("direction").value,

        session: document.getElementById("session").value,

        broker: document.getElementById("broker").value,

        account: document.getElementById("account").value,

        lotSize: document.getElementById("lotSize").value,

        // ==========================
        // HTF
        // ==========================

        htfSwing: document.getElementById("htfSwing").value,

        htfInternal: document.getElementById("htfInternal").value,

        // ==========================
        // MTF
        // ==========================

        mtfSwing: document.getElementById("mtfSwing").value,

        mtfInternal: document.getElementById("mtfInternal").value,

        // ==========================
        // LTF
        // ==========================

        ltfStructure: document.getElementById("ltfStructure").value,

        liquidity: document.getElementById("liquidity").value,

        poi: document.getElementById("poi").value,

        entryModel: document.getElementById("entryModel").value,

        entryConfirmation: document.getElementById("entryConfirmation").value,

        tradeValid: document.getElementById("tradeValid").value,
                // ==========================
        // RISK MANAGEMENT
        // ==========================

        entryPrice: document.getElementById("entryPrice").value,

        stopLoss: document.getElementById("stopLoss").value,

        takeProfit: document.getElementById("takeProfit").value,

        risk: document.getElementById("risk").value,

        expectedRR: document.getElementById("expectedRR").value,

        actualRR: document.getElementById("actualRR").value,

        commission: document.getElementById("commission").value,

        profit: document.getElementById("profit").value,

        // ==========================
        // TRADE RESULT
        // ==========================

        result: document.getElementById("result").value,

        breakEven: document.getElementById("breakEven").value,

        partials: document.getElementById("partials").value,

        trailing: document.getElementById("trailing").value,

        executionQuality: document.getElementById("executionQuality").value,

        followedPlan: document.getElementById("followedPlan").value,

        // ==========================
        // PSYCHOLOGY
        // ==========================

        confidence: document.getElementById("confidence").value,

        emotion: document.getElementById("emotion").value,

        discipline: document.getElementById("discipline").value,

        patience: document.getElementById("patience").value,

        // ==========================
        // TRADE REVIEW
        // ==========================

        tradeSummary: document.getElementById("tradeSummary").value,

        strengths: document.getElementById("strengths").value,

        mistakes: document.getElementById("mistakes").value,

        lessonLearned: document.getElementById("lessonLearned").value,

        improvementPlan: document.getElementById("improvementPlan").value,

        // ==========================
        // CHART URLS
        // ==========================

        beforeChart: document.getElementById("beforeChart").value,

        duringChart: document.getElementById("duringChart").value,

        afterChart: document.getElementById("afterChart").value,

        // ==========================
        // NOTES
        // ==========================

        notes: document.getElementById("notes").value

    };
        // ==========================
    // SAVE TRADE
    // ==========================

    trades.push(trade);

    localStorage.setItem(
        "gtradesJournal",
        JSON.stringify(trades)
    );

    alert("Trade saved successfully!");

    tradeForm.reset();

    updateDashboard();

}

// ======================================================
// DASHBOARD
// ======================================================

updateDashboard();

function updateDashboard() {

    if (!document.getElementById("totalTrades")) return;

    const totalTrades = trades.length;

    const wins = trades.filter(t => t.result === "Win").length;

    const losses = trades.filter(t => t.result === "Loss").length;

    const breakEven = trades.filter(t => t.result === "Break Even").length;

    const winRate =
        totalTrades === 0
            ? 0
            : ((wins / totalTrades) * 100).toFixed(1);

    let totalProfit = 0;

    let totalRR = 0;

    trades.forEach(t => {

        totalProfit += Number(t.profit || 0);

        totalRR += Number(t.actualRR || 0);

    });

    const averageRR =
        totalTrades === 0
            ? 0
            : (totalRR / totalTrades).toFixed(2);

    document.getElementById("totalTrades").textContent = totalTrades;

    document.getElementById("wins").textContent = wins;

    document.getElementById("losses").textContent = losses;

    document.getElementById("winRate").textContent =
        winRate + "%";

    document.getElementById("averageRR").textContent =
        averageRR;

    document.getElementById("netProfit").textContent =
        "$" + totalProfit.toFixed(2);

    document.getElementById("consistency").textContent =
        winRate + "%";

    document.getElementById("streak").textContent =
        calculateStreak();

    drawCharts();

}

// ======================================================
// CURRENT STREAK
// ======================================================

function calculateStreak() {

    let streak = 0;

    for (let i = trades.length - 1; i >= 0; i--) {

        if (trades[i].result === "Win") {

            streak++;

        } else {

            break;

        }

    }

    return streak;

}

// ======================================================
// CHARTS
// ======================================================

function drawCharts() {

    if (!document.getElementById("equityChart")) return;

    const labels = [];

    const equity = [];

    let running = 0;

    trades.forEach((trade, index) => {

        labels.push(index + 1);

        running += Number(trade.profit || 0);

        equity.push(running);

    });

    new Chart(document.getElementById("equityChart"), {

        type: "line",

        data: {

            labels,

            datasets: [

                {

                    label: "Equity",

                    data: equity,

                    borderWidth: 3,

                    tension: 0.3

                }

            ]

        }

    });

    const months = {};

    trades.forEach(trade => {

        if (!trade.tradeDate) return;

        const month = trade.tradeDate.substring(0, 7);

        months[month] =
            (months[month] || 0) +
            Number(trade.profit || 0);

    });

    new Chart(document.getElementById("monthlyChart"), {

        type: "bar",

        data: {

            labels: Object.keys(months),

            datasets: [

                {

                    label: "Monthly Profit",

                    data: Object.values(months),

                    borderWidth: 1

                }

            ]

        }

    });

}