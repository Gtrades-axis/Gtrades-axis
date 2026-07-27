import {
    getAuth,
    onAuthStateChanged
} from "firebase/auth";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
    updateDoc,
    getDoc
} from "firebase/firestore";

import { auth, db } from "./firebase.js";

// ─── STATE ──────────────────────────────────────────────────────
let currentUser = null;
let trades = [];
let editingId = null;

// ─── DOM REFS ──────────────────────────────────────────────────
function getEl(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`⚠️ Element #${id} not found`);
    return el;
}

const form = getEl("tradeForm");
const saveBtn = getEl("saveTrade");
const completeBtn = getEl("completeTradeBtn");
const totalTrades = getEl("totalTrades");
const winRate = getEl("winRate");
const avgRR = getEl("averageRR");
const netProfit = getEl("netProfit");
const wins = getEl("wins");
const losses = getEl("losses");
const pendingTrades = getEl("pendingTrades");
const streak = getEl("streak");
const equityCanvas = getEl("equityChart");
const monthlyCanvas = getEl("monthlyChart");

// ─── AUTH ──────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    currentUser = user;
    await loadTrades();
    checkEditMode();
});

// ─── CHECK EDIT MODE ──────────────────────────────────────────
async function checkEditMode() {
    const editId = sessionStorage.getItem("editTradeId");
    if (editId) {
        sessionStorage.removeItem("editTradeId");
        await loadTradeForEditing(editId);
    }
}

// ─── LOAD TRADE FOR EDITING ──────────────────────────────────
async function loadTradeForEditing(id) {
    if (!currentUser) return;
    try {
        const docRef = doc(db, "users", currentUser.uid, "trades", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const trade = { id: docSnap.id, ...docSnap.data() };
            editingId = id;
            populateForm(trade);
            updateButtonText(trade.status || "Pending");
            if (window.updateCompletionState) window.updateCompletionState();
        } else {
            alert("Trade not found.");
        }
    } catch (error) {
        console.error("Load trade error:", error);
        alert("Error loading trade: " + error.message);
    }
}

// ─── POPULATE FORM ────────────────────────────────────────────
function populateForm(trade) {
    const fieldMap = {
        tradeDate: "tradeDate",
        tradeTime: "tradeTime",
        pair: "pair",
        direction: "direction",
        tradeStatus: "status",
        session: "session",
        broker: "broker",
        account: "account",
        lotSize: "lotSize",
        htfSwing: "htfSwing",
        htfInternal: "htfInternal",
        mtfSwing: "mtfSwing",
        mtfInternal: "mtfInternal",
        ltfStructure: "ltfStructure",
        liquidity: "liquidity",
        poi: "poi",
        entryModel: "entryModel",
        entryConfirmation: "entryConfirmation",
        tradeValid: "tradeValid",
        entry: "entryPrice",
        stopLoss: "stopLoss",
        takeProfit: "takeProfit",
        risk: "risk",
        rr: "expectedRR",
        exitPrice: "exitPrice",
        actualRR: "actualRR",
        profit: "profit",
        commission: "commission",
        result: "result",
        management: "management",
        psychology: "psychology",
        tradeSummary: "tradeSummary",
        strengths: "strengths",
        mistakes: "mistakes",
        lessonLearned: "lessonLearned",
        improvementPlan: "improvementPlan",
        beforeChart: "beforeChart",
        duringChart: "duringChart",
        afterChart: "afterChart",
        notes: "notes"
    };
    Object.keys(fieldMap).forEach((elId) => {
        const el = getEl(elId);
        if (el) {
            const value = trade[fieldMap[elId]] ?? "";
            el.value = value;
        }
    });
    const statusSelect = getEl("tradeStatus");
    if (statusSelect && trade.status) {
        statusSelect.value = trade.status;
    }
    const header = document.querySelector(".page-header h1");
    if (header) header.textContent = "✏️ Edit Trade";
}

// ─── UPDATE BUTTON TEXT ──────────────────────────────────────
function updateButtonText(status) {
    if (!saveBtn) return;
    if (status === "Pending") {
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 💾 Update Trade';
    } else {
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 💾 Update Trade';
    }
    if (window.updateCompletionState) window.updateCompletionState();
}

// ─── LOAD TRADES ──────────────────────────────────────────────
async function loadTrades() {
    if (!currentUser) return;
    try {
        const tradesRef = collection(db, "users", currentUser.uid, "trades");
        const q = query(tradesRef, orderBy("tradeDate", "desc"));
        const snapshot = await getDocs(q);
        trades = [];
        snapshot.forEach((doc) => {
            trades.push({ id: doc.id, ...doc.data() });
        });
        updateStats();
        updateCharts();
    } catch (error) {
        console.error("Load trades error:", error);
    }
}

// ─── SAVE TRADE ──────────────────────────────────────────────
async function saveTrade(data) {
    if (!currentUser) throw new Error("Not logged in");
    const tradesRef = collection(db, "users", currentUser.uid, "trades");

    try {
        if (editingId) {
            const docRef = doc(db, "users", currentUser.uid, "trades", editingId);
            await updateDoc(docRef, data);
            const index = trades.findIndex((t) => t.id === editingId);
            if (index !== -1) trades[index] = { ...trades[index], ...data };
            editingId = null;
            alert("✅ Trade updated!");
            const header = document.querySelector(".page-header h1");
            if (header) header.textContent = "📊 Professional Trading Journal";
        } else {
            // NEW TRADE: force status to "Pending"
            data.status = "Pending";
            const ref = await addDoc(tradesRef, data);
            trades.unshift({ id: ref.id, ...data });
            alert("✅ Trade saved as Pending!");
        }
        updateStats();
        updateCharts();
        resetForm();
    } catch (error) {
        console.error("Save error:", error);
        alert("❌ Error saving trade: " + error.message);
    }
}

// ─── COMPLETE TRADE ──────────────────────────────────────────
async function completeTrade() {
    if (!editingId) {
        alert("No trade is being edited.");
        return;
    }
    if (!currentUser) return;

    const result = getEl("result")?.value || "";
    const exitPrice = parseFloat(getEl("exitPrice")?.value) || 0;
    const actualRR = parseFloat(getEl("actualRR")?.value) || 0;
    const profit = parseFloat(getEl("profit")?.value) || 0;
    const commission = parseFloat(getEl("commission")?.value) || 0;
    const management = getEl("management")?.value || "";
    const psychology = getEl("psychology")?.value || "";
    const tradeSummary = getEl("tradeSummary")?.value || "";
    const strengths = getEl("strengths")?.value || "";
    const mistakes = getEl("mistakes")?.value || "";
    const lessonLearned = getEl("lessonLearned")?.value || "";
    const improvementPlan = getEl("improvementPlan")?.value || "";

    if (!result) {
        alert("Please select a Result (Win, Loss, or Breakeven) before completing the trade.");
        return;
    }

    if (!confirm(`Complete this trade as "${result}"? This will finalize it.`)) return;

    try {
        const updateData = {
            status: result,
            exitPrice,
            actualRR,
            profit,
            commission,
            result,
            management,
            psychology,
            tradeSummary,
            strengths,
            mistakes,
            lessonLearned,
            improvementPlan,
        };

        const docRef = doc(db, "users", currentUser.uid, "trades", editingId);
        await updateDoc(docRef, updateData);

        const index = trades.findIndex((t) => t.id === editingId);
        if (index !== -1) {
            trades[index] = { ...trades[index], ...updateData };
        }

        alert("✅ Trade completed successfully!");
        editingId = null;
        const header = document.querySelector(".page-header h1");
        if (header) header.textContent = "📊 Professional Trading Journal";
        updateStats();
        updateCharts();
        resetForm();
        if (completeBtn) completeBtn.style.display = "none";
    } catch (error) {
        console.error("Complete trade error:", error);
        alert("❌ Error completing trade: " + error.message);
    }
}

// ─── RESET FORM ──────────────────────────────────────────────
function resetForm() {
    if (form) form.reset();
    const dateInput = getEl("tradeDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
    const statusSelect = getEl("tradeStatus");
    if (statusSelect) statusSelect.value = "Pending";
    if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 💾 Save as Pending';
    if (completeBtn) completeBtn.style.display = "none";
    if (window.updateCompletionState) window.updateCompletionState();
}

// ─── DELETE ──────────────────────────────────────────────────
async function deleteTrade(id) {
    if (!confirm("Delete this trade?")) return;
    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "trades", id));
        trades = trades.filter((t) => t.id !== id);
        updateStats();
        updateCharts();
        alert("✅ Trade deleted!");
    } catch (error) {
        alert("❌ Error deleting trade: " + error.message);
    }
}

// ─── STATS (STEP 17 – ignore Pending) ──────────────────────
function updateStats() {
    // Only completed trades count toward stats
    const completed = trades.filter(t => t.status !== "Pending");
    const pending = trades.filter(t => t.status === "Pending");

    const winsCount = completed.filter(t => t.status === "Win").length;
    const lossesCount = completed.filter(t => t.status === "Loss").length;

    const totalRR = completed.reduce((sum, t) => sum + (parseFloat(t.actualRR) || 0), 0);
    const totalProfit = completed.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);

    const winRateVal = completed.length ? (winsCount / completed.length) * 100 : 0;
    const avgRRVal = completed.length ? totalRR / completed.length : 0;

    // Streak: only from completed trades (most recent first)
    let streakVal = 0;
    for (let i = trades.length - 1; i >= 0; i--) {
        const t = trades[i];
        if (t.status === "Pending") continue;
        if (t.status === "Win") streakVal++;
        else if (t.status === "Loss") break;
    }

    if (totalTrades) totalTrades.textContent = completed.length;
    if (winRate) {
        winRate.textContent = winRateVal.toFixed(1) + "%";
        winRate.className = winRateVal >= 50 ? "value-positive" : "value-negative";
    }
    if (avgRR) avgRR.textContent = avgRRVal.toFixed(2);
    if (netProfit) {
        netProfit.textContent = "$" + totalProfit.toFixed(2);
        netProfit.className = totalProfit >= 0 ? "value-positive" : "value-negative";
    }
    if (wins) wins.textContent = winsCount;
    if (losses) losses.textContent = lossesCount;
    if (pendingTrades) pendingTrades.textContent = pending.length;
    if (streak) streak.textContent = streakVal;
}

// ─── CHARTS ──────────────────────────────────────────────────
function updateCharts() {
    if (typeof Chart === "undefined") return;
    if (!equityCanvas || !monthlyCanvas) return;

    if (window.equityChart && typeof window.equityChart.destroy === "function") {
        window.equityChart.destroy();
        window.equityChart = null;
    }
    if (window.monthlyChart && typeof window.monthlyChart.destroy === "function") {
        window.monthlyChart.destroy();
        window.monthlyChart = null;
    }

    // Only completed trades for equity curve
    const completed = trades.filter(t => t.status !== "Pending");
    let running = 0;
    const equityData = completed.map((t) => {
        running += parseFloat(t.profit) || 0;
        return running;
    });
    const labels = completed.map((_, i) => i + 1);

    if (equityData.length) {
        window.equityChart = new Chart(equityCanvas, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Equity Curve",
                    data: equityData,
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59,130,246,0.15)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: "#8ea2c0" } } },
                scales: {
                    x: { ticks: { color: "#8ea2c0" }, grid: { color: "rgba(255,255,255,0.05)" } },
                    y: { ticks: { color: "#8ea2c0" }, grid: { color: "rgba(255,255,255,0.05)" } },
                },
            },
        });
    }

    // Monthly profit (completed trades only)
    const monthly = {};
    completed.forEach((t) => {
        if (!t.tradeDate) return;
        const month = t.tradeDate.substring(0, 7);
        monthly[month] = (monthly[month] || 0) + (parseFloat(t.profit) || 0);
    });
    const monthLabels = Object.keys(monthly).sort();
    if (monthLabels.length) {
        window.monthlyChart = new Chart(monthlyCanvas, {
            type: "bar",
            data: {
                labels: monthLabels,
                datasets: [{
                    label: "Monthly Profit",
                    data: monthLabels.map((m) => monthly[m]),
                    backgroundColor: "#3b82f6",
                    borderRadius: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: "#8ea2c0" } } },
                scales: {
                    x: { ticks: { color: "#8ea2c0" }, grid: { color: "rgba(255,255,255,0.05)" } },
                    y: { ticks: { color: "#8ea2c0" }, grid: { color: "rgba(255,255,255,0.05)" } },
                },
            },
        });
    }
}

// ─── FORM SUBMIT ─────────────────────────────────────────────
if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = {
            tradeDate: getEl("tradeDate")?.value || "",
            tradeTime: getEl("tradeTime")?.value || "",
            pair: getEl("pair")?.value || "",
            direction: getEl("direction")?.value || "",
            status: getEl("tradeStatus")?.value || "Pending",
            session: getEl("session")?.value || "",
            broker: getEl("broker")?.value || "",
            account: getEl("account")?.value || "",
            lotSize: parseFloat(getEl("lotSize")?.value) || 0,
            htfSwing: getEl("htfSwing")?.value || "",
            htfInternal: getEl("htfInternal")?.value || "",
            mtfSwing: getEl("mtfSwing")?.value || "",
            mtfInternal: getEl("mtfInternal")?.value || "",
            ltfStructure: getEl("ltfStructure")?.value || "",
            liquidity: getEl("liquidity")?.value || "",
            poi: getEl("poi")?.value || "",
            entryModel: getEl("entryModel")?.value || "",
            entryConfirmation: getEl("entryConfirmation")?.value || "",
            tradeValid: getEl("tradeValid")?.value || "",
            entryPrice: parseFloat(getEl("entry")?.value) || 0,
            stopLoss: parseFloat(getEl("stopLoss")?.value) || 0,
            takeProfit: parseFloat(getEl("takeProfit")?.value) || 0,
            risk: parseFloat(getEl("risk")?.value) || 0,
            expectedRR: parseFloat(getEl("rr")?.value) || 0,
            exitPrice: parseFloat(getEl("exitPrice")?.value) || 0,
            actualRR: parseFloat(getEl("actualRR")?.value) || 0,
            profit: parseFloat(getEl("profit")?.value) || 0,
            commission: parseFloat(getEl("commission")?.value) || 0,
            result: getEl("result")?.value || "",
            management: getEl("management")?.value || "",
            psychology: getEl("psychology")?.value || "",
            tradeSummary: getEl("tradeSummary")?.value || "",
            strengths: getEl("strengths")?.value || "",
            mistakes: getEl("mistakes")?.value || "",
            lessonLearned: getEl("lessonLearned")?.value || "",
            improvementPlan: getEl("improvementPlan")?.value || "",
            beforeChart: getEl("beforeChart")?.value || "",
            duringChart: getEl("duringChart")?.value || "",
            afterChart: getEl("afterChart")?.value || "",
            notes: getEl("notes")?.value || "",
        };
        await saveTrade(data);
    });
}

// ─── COMPLETE TRADE BUTTON ──────────────────────────────────
if (completeBtn) {
    completeBtn.addEventListener("click", completeTrade);
}

// ─── CANCEL EDIT ─────────────────────────────────────────────
const cancelBtn = getEl("cancelEdit");
if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
        editingId = null;
        sessionStorage.removeItem("editTradeId");
        const header = document.querySelector(".page-header h1");
        if (header) header.textContent = "📊 Professional Trading Journal";
        resetForm();
    });
}

// ─── EXPOSE GLOBALLY ─────────────────────────────────────────
window.editTrade = function(id) {
    sessionStorage.setItem("editTradeId", id);
    window.location.href = "journal.html";
};
window.deleteTrade = deleteTrade;

// ─── INLINE TOGGLE SCRIPT (completion lock) ──────────────────
(function() {
    const statusSelect = getEl("tradeStatus");
    const completionFields = document.querySelectorAll('#completionSection select, #completionSection input, #completionSection textarea');

    function updateCompletionState() {
        const isPending = statusSelect && statusSelect.value === "Pending";
        completionFields.forEach(field => {
            field.disabled = isPending;
        });
        if (completeBtn) {
            const isEditing = editingId !== null;
            if (isEditing && isPending) {
                completeBtn.style.display = 'inline-flex';
            } else {
                completeBtn.style.display = 'none';
            }
        }
    }

    if (statusSelect) {
        statusSelect.addEventListener('change', updateCompletionState);
        setTimeout(updateCompletionState, 100);
    }
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(updateCompletionState, 300);
    });
    window.updateCompletionState = updateCompletionState;
})();

// ─── SCROLL TO TOP ────────────────────────────────────────────
const scrollBtn = document.getElementById('scrollTopBtn');
if (scrollBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ─── LOGOUT ────────────────────────────────────────────────────
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        import("firebase/auth").then(({ signOut }) => {
            signOut(auth).then(() => {
                window.location.href = "login.html";
            });
        });
    });
}

console.log("📊 Journal initialized.");