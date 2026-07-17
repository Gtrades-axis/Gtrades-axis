/* ==========================================
GTRADES-AXIS™
TRADING JOURNAL
PART 1
========================================== */

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ==========================================
ELEMENTS
========================================== */

const logoutBtn = document.getElementById("logoutBtn");

const tradeForm = document.getElementById("tradeForm");

const tradeHistory = document.getElementById("tradeHistory");

const tradeSearch = document.getElementById("tradeSearch");

const totalTrades = document.getElementById("totalTrades");

const winRate = document.getElementById("winRate");

const averageRR = document.getElementById("averageRR");

const netProfit = document.getElementById("netProfit");

/* FORM */

const pair = document.getElementById("pair");

const direction = document.getElementById("direction");

const tradeDate = document.getElementById("tradeDate");

const timeframe = document.getElementById("timeframe");

const session = document.getElementById("session");

const setup = document.getElementById("setup");

const entry = document.getElementById("entry");

const sl = document.getElementById("sl");

const tp = document.getElementById("tp");

const rr = document.getElementById("rr");

const profit = document.getElementById("profit");

const result = document.getElementById("result");

const notes = document.getElementById("notes");

/* ==========================================
GLOBAL VARIABLES
========================================== */

let currentUser = null;

let trades = [];

let editTradeId = null;

/* ==========================================
AUTH
========================================== */

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;

    }

    currentUser = user;

    await loadTrades();

});

/* ==========================================
LOGOUT
========================================== */

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        if (!confirm("Logout?")) return;

        try {

            await signOut(auth);

            window.location.href = "login.html";

        }

        catch (error) {

            console.error(error);

            alert(error.message);

        }

    });

}

/* ==========================================
SAVE TRADE
========================================== */

tradeForm.addEventListener("submit", saveTrade);

async function saveTrade(e) {

    e.preventDefault();
    console.log("Save button clicked");

    const trade = {

        pair: pair.value.trim().toUpperCase(),

        direction: direction.value,

        tradeDate: tradeDate.value,

        timeframe: timeframe.value,

        session: session.value,

        setup: setup.value,

        entry: Number(entry.value),

        sl: Number(sl.value),

        tp: Number(tp.value),

        rr: Number(rr.value),

        profit: Number(profit.value),

        result: result.value,

        notes: notes.value.trim(),

        createdAt: serverTimestamp()

    };
        try {

        /* ===============================
           UPDATE EXISTING TRADE
        =============================== */

        if (editTradeId) {

            const tradeRef = doc(
                db,
                "users",
                currentUser.uid,
                "trades",
                editTradeId
            );

            await updateDoc(tradeRef, {

                pair: trade.pair,

                direction: trade.direction,

                tradeDate: trade.tradeDate,

                timeframe: trade.timeframe,

                session: trade.session,

                setup: trade.setup,

                entry: trade.entry,

                sl: trade.sl,

                tp: trade.tp,

                rr: trade.rr,

                profit: trade.profit,

                result: trade.result,

                notes: trade.notes

            });

            alert("✅ Trade Updated");

            editTradeId = null;

        }

        /* ===============================
           NEW TRADE
        =============================== */

        else {

            await addDoc(

                collection(
                    db,
                    "users",
                    currentUser.uid,
                    "trades"
                ),

                trade

            );

            alert("✅ Trade Saved");

        }

        tradeForm.reset();

        await loadTrades();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}

/* ==========================================
LOAD TRADES
========================================== */

async function loadTrades() {

    trades = [];

    const q = query(

        collection(
            db,
            "users",
            currentUser.uid,
            "trades"
        ),

        orderBy("createdAt", "desc")

    );

    const snapshot = await getDocs(q);

    snapshot.forEach(docSnap => {

        trades.push({

            id: docSnap.id,

            ...docSnap.data()

        });

    });

    renderTrades();

    updateStatistics();

}
/* ==========================================
RENDER TRADES
========================================== */

function renderTrades(searchText = "") {

    tradeHistory.innerHTML = "";

    let filteredTrades = trades;

    if (searchText.trim() !== "") {

        const keyword = searchText.toLowerCase();

        filteredTrades = trades.filter(trade =>

            trade.pair.toLowerCase().includes(keyword) ||

            trade.session.toLowerCase().includes(keyword) ||

            trade.timeframe.toLowerCase().includes(keyword) ||

            trade.setup.toLowerCase().includes(keyword) ||

            trade.result.toLowerCase().includes(keyword)

        );

    }

    if (filteredTrades.length === 0) {

        tradeHistory.innerHTML = `

<div class="loading-card">

<h3>No Trades Found</h3>

</div>

`;

        return;

    }

    filteredTrades.forEach(trade => {

        tradeHistory.innerHTML += `

<div class="trade-card">

<div>

<h3>

${trade.pair}

<span style="color:#005eff">

${trade.direction}

</span>

</h3>

<p>

📅 ${trade.tradeDate}

&nbsp;&nbsp;

⏱ ${trade.timeframe}

&nbsp;&nbsp;

🌍 ${trade.session}

</p>

<p>

📌 ${trade.setup}

</p>

<p>

RR :

<strong>${trade.rr}</strong>

&nbsp;&nbsp;

Profit :

<strong>${trade.profit}</strong>

</p>

<p>

Result :

<strong>${trade.result}</strong>

</p>

<p>

${trade.notes || ""}

</p>

</div>

<div class="trade-actions">

<button

class="edit-btn"

data-id="${trade.id}">

<i class="fa-solid fa-pen"></i>

Edit

</button>

<button

class="delete-btn"

data-id="${trade.id}">

<i class="fa-solid fa-trash"></i>

Delete

</button>

</div>

</div>

`;

    });

    attachTradeButtons();

}

/* ==========================================
SEARCH
========================================== */

if (tradeSearch) {

    tradeSearch.addEventListener("input", e => {

        renderTrades(e.target.value);

    });

}
/* ==========================================
EDIT / DELETE BUTTONS
========================================== */

function attachTradeButtons() {

    /* ---------- EDIT ---------- */

    document.querySelectorAll(".edit-btn").forEach(button => {

        button.onclick = () => {

            const trade = trades.find(t => t.id === button.dataset.id);

            if (!trade) return;

            editTradeId = trade.id;

            pair.value = trade.pair;

            direction.value = trade.direction;

            tradeDate.value = trade.tradeDate;

            timeframe.value = trade.timeframe;

            session.value = trade.session;

            setup.value = trade.setup;

            entry.value = trade.entry;

            sl.value = trade.sl;

            tp.value = trade.tp;

            rr.value = trade.rr;

            profit.value = trade.profit;

            result.value = trade.result;

            notes.value = trade.notes || "";

            window.scrollTo({

                top: 0,

                behavior: "smooth"

            });

        };

    });

    /* ---------- DELETE ---------- */

    document.querySelectorAll(".delete-btn").forEach(button => {

        button.onclick = async () => {

            if (!confirm("Delete this trade?")) return;

            try {

                await deleteDoc(

                    doc(

                        db,

                        "users",

                        currentUser.uid,

                        "trades",

                        button.dataset.id

                    )

                );

                await loadTrades();

            }

            catch (error) {

                console.error(error);

                alert(error.message);

            }

        };

    });

}

/* ==========================================
STATISTICS
========================================== */

function updateStatistics() {

    totalTrades.textContent = trades.length;

    if (trades.length === 0) {

        winRate.textContent = "0%";

        averageRR.textContent = "0";

        netProfit.textContent = "$0";

        return;

    }

    const wins = trades.filter(t => t.result === "Win").length;

    const winPercentage = ((wins / trades.length) * 100).toFixed(1);

    winRate.textContent = winPercentage + "%";

    let rrTotal = 0;

    trades.forEach(t => {

        rrTotal += Number(t.rr) || 0;

    });

    averageRR.textContent =

        (rrTotal / trades.length).toFixed(2);

    let totalProfit = 0;

    trades.forEach(t => {

        totalProfit += Number(t.profit) || 0;

    });

    netProfit.textContent = "$" + totalProfit.toFixed(2);

}

/* ==========================================
AUTO REFRESH
========================================== */

setInterval(() => {

    if (currentUser) {

        loadTrades();

    }

}, 60000);

/* ==========================================
READY
========================================== */

console.log("====================================");

console.log("GTRADES-AXIS Trading Journal Loaded");

console.log("Firestore Connected");

console.log("====================================");