/* ==========================================================
   GTRADES-AXIS™ TRADE HISTORY
   FIRESTORE SOURCE OF TRUTH
   Reads the exact same users/{uid}/trades collection as journal.js.
   ========================================================== */

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy
} from "firebase/firestore";

let currentUser = null;
let trades = [];
let filteredTrades = [];
let sortKey = "date";
let sortAsc = false;

const $ = id => document.getElementById(id);

function money(v) {
  return "$" + (Number(v) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function signedMoney(v) {
  const n = Number(v) || 0;
  return (n >= 0 ? "+" : "-") + "$" + Math.abs(n).toFixed(2);
}

function normalizeResult(value) {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "win") return "Win";
  if (s === "loss") return "Loss";
  if (s === "breakeven" || s === "break even" || s === "break-even") return "Breakeven";
  if (s === "partial") return "Partial";
  return "Pending";
}

function normalizeTrade(raw) {
  if (!raw || typeof raw !== "object") return null;
  const result = normalizeResult(raw.result);
  const status = raw.status === "Closed" || result !== "Pending" ? "Closed" : "Pending";
  return {
    ...raw,
    id: raw.id,
    date: raw.date || "",
    time: raw.time || "",
    pair: raw.pair || "",
    direction: raw.direction || "",
    session: raw.session || "",
    broker: raw.broker || "",
    account: raw.account || "",
    entryModel: raw.entryModel || "",
    entry: raw.entry ?? 0,
    stopLoss: raw.stopLoss ?? 0,
    takeProfit: raw.takeProfit ?? 0,
    exitPrice: raw.exitPrice ?? 0,
    initialEntry: Number(raw.initialEntry ?? raw.entry) || 0,
    initialStopLoss: Number(raw.initialStopLoss ?? raw.stopLoss) || 0,
    initialTakeProfit: Number(raw.initialTakeProfit ?? raw.takeProfit) || 0,
    initialRR: Number(raw.initialRR ?? raw.plannedRR ?? raw.rr) || 0,
    plannedRR: Number(raw.plannedRR ?? raw.initialRR ?? raw.rr) || 0,
    rr: Number(raw.rr) || 0,
    profit: raw.profit ?? 0,
    commission: raw.commission ?? 0,
    result,
    status
  };
}

async function loadTrades() {
  if (!currentUser) return;

  try {
    const ref = collection(db, "users", currentUser.uid, "trades");
    const snap = await getDocs(ref);
    trades = snap.docs.map(d => normalizeTrade({ id: d.id, ...d.data() })).filter(Boolean);
    trades.sort((a,b) => new Date(`${b.date}T${b.time || "00:00"}`) - new Date(`${a.date}T${a.time || "00:00"}`));
    filteredTrades = [...trades];
    applyFiltersAndRender();
  } catch (e) {
    console.error("History Firestore load failed:", e);
    const tbody = $("tradeTableBody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="12"><div class="empty-state"><h3>Unable to load trades</h3><p>${escapeHtml(e.message)}</p></div></td></tr>`;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTable() {
  const tbody = $("tradeTableBody");
  if (!tbody) return;

  let data = [...filteredTrades];
  data.sort((a,b) => {
    let A = a[sortKey] ?? "", B = b[sortKey] ?? "";
    if (["profit","rr","entry","stopLoss","takeProfit","commission"].includes(sortKey)) {
      A = Number(A) || 0; B = Number(B) || 0;
    } else if (sortKey === "date") {
      A = new Date(`${a.date}T${a.time || "00:00"}`).getTime() || 0;
      B = new Date(`${b.date}T${b.time || "00:00"}`).getTime() || 0;
    } else {
      A = String(A).toLowerCase(); B = String(B).toLowerCase();
    }
    if (A < B) return sortAsc ? -1 : 1;
    if (A > B) return sortAsc ? 1 : -1;
    return 0;
  });

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="12"><div class="empty-state"><i class="fa-solid fa-inbox"></i><h3>No trades found</h3><p>Start journaling your trades in the <a href="/journal" style="color:var(--accent-blue);text-decoration:none;">Trading Journal</a>.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = data.map(t => {
      const profit = Number(t.profit) || 0;
      const commission = Number(t.commission) || 0;
      const result = normalizeResult(t.result);
      const resultClass = result.toLowerCase() === "win" ? "win" : result.toLowerCase() === "loss" ? "loss" : "breakeven";
      const directionClass = String(t.direction || "").toLowerCase() === "buy" ? "buy" : "sell";
      const links = [["Before",t.beforeChart],["During",t.duringChart],["After",t.afterChart]].filter(x=>x[1]);
      const chartLinks = links.length ? links.map(([label,url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener"><i class="fa-solid fa-image"></i>${label}</a>`).join(" ") : '<span class="no-link">—</span>';
      return `<tr>
        <td>${formatDate(t.date)}<br><small>${escapeHtml(t.time || "")}</small></td>
        <td><strong>${escapeHtml(t.pair || "—")}</strong></td>
        <td><span class="badge-direction ${directionClass}">${escapeHtml(t.direction || "—")}</span></td>
        <td>${t.entry ?? "—"}</td><td>${t.stopLoss ?? "—"}</td><td>${t.takeProfit ?? "—"}</td>
        <td>${Number(t.rr) ? Number(t.rr).toFixed(2) : "—"}</td>
        <td class="trade-profit ${profit > 0 ? "positive" : profit < 0 ? "negative" : "zero"}">${signedMoney(profit)}</td>
        <td>${commission ? money(commission) : "—"}</td>
        <td><span class="badge-result ${resultClass}">${result}</span></td>
        <td><div class="chart-links">${chartLinks}</div></td>
        <td><div class="action-buttons">
          <button class="view-btn" data-id="${escapeHtml(t.id)}" title="View"><i class="fa-regular fa-eye"></i></button>
          <button class="edit-btn" data-id="${escapeHtml(t.id)}" title="Edit"><i class="fa-regular fa-pen-to-square"></i></button>
          <button class="delete-btn" data-id="${escapeHtml(t.id)}" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
        </div></td>
      </tr>`;
    }).join("");
  }

  $("showingCount").textContent = String(data.length);
  $("totalCount").textContent = String(trades.length);

  document.querySelectorAll(".view-btn").forEach(btn => btn.onclick = () => {
    const t = trades.find(x => String(x.id) === String(btn.dataset.id));
    if (t) openViewModal(t);
  });

  document.querySelectorAll(".edit-btn").forEach(btn => btn.onclick = () => {
    window.location.href = `/journal?edit=${encodeURIComponent(btn.dataset.id)}`;
  });

  document.querySelectorAll(".delete-btn").forEach(btn => btn.onclick = async () => {
    if (confirm("Delete this trade permanently from Firebase?")) await deleteTrade(btn.dataset.id);
  });

  updateStats();
}

function updateStats() {
  const data = filteredTrades;
  const closed = data.filter(t => t.status === "Closed");
  const wins = closed.filter(t => normalizeResult(t.result) === "Win");
  const losses = closed.filter(t => normalizeResult(t.result) === "Loss");
  const net = closed.reduce((s,t) => s + (Number(t.profit)||0) - (Number(t.commission)||0),0);
  const rrValues = closed.map(t=>Number(t.rr)||0).filter(v=>v!==0);
  const avgRR = rrValues.length ? rrValues.reduce((s,v)=>s+v,0)/rrValues.length : 0;
  let bestStreak=0,current=0,type="";
  [...closed].sort((a,b)=>new Date(`${a.date}T${a.time||"00:00"}`)-new Date(`${b.date}T${b.time||"00:00"}`)).forEach(t=>{
    const r=normalizeResult(t.result);
    if(r==="Win"||r==="Loss"){ if(r===type) current++; else {type=r;current=1;} bestStreak=Math.max(bestStreak,current); }
    else {type="";current=0;}
  });
  const now=new Date();
  const monthCount=data.filter(t=>t.date && new Date(t.date).getMonth()===now.getMonth() && new Date(t.date).getFullYear()===now.getFullYear()).length;
  const winRate=closed.length?wins.length/closed.length*100:0;
  $("statTotal").textContent=data.length; $("statWinRate").textContent=winRate.toFixed(1)+"%";
  $("statAvgRR").textContent=avgRR.toFixed(2); $("statNetProfit").textContent=signedMoney(net);
  $("statWins").textContent=wins.length; $("statLosses").textContent=losses.length;
  $("statStreak").textContent=bestStreak; $("statMonth").textContent=monthCount;
}

function applyFiltersAndRender() {
  const pair=($("filterPair")?.value||"").trim().toLowerCase();
  const direction=$("filterDirection")?.value||"";
  const result=$("filterResult")?.value||"";
  const from=$("filterDateFrom")?.value||"";
  const to=$("filterDateTo")?.value||"";
  filteredTrades=trades.filter(t=>{
    if(pair&&!String(t.pair||"").toLowerCase().includes(pair))return false;
    if(direction&&String(t.direction||"").toUpperCase()!==direction)return false;
    if(result&&normalizeResult(t.result)!==result)return false;
    if(from && t.date<from)return false;
    if(to && t.date>to)return false;
    return true;
  });
  renderTable();
}

function getConfluenceLabels(c) {
  if(!c)return "";
  const labels={htfSwing:"HTF Swing",htfInternal:"HTF Internal",mtfSwing:"MTF Swing",mtfInternal:"MTF Internal",htfDemand:"HTF Demand",htfSupply:"HTF Supply",mtfDemand:"MTF Demand",mtfSupply:"MTF Supply",premium:"Premium",discount:"Discount",sweep:"Liquidity Sweep",choch:"CHOCH",bos:"BOS",mitigation:"POI Mitigation",refined:"Refined POI",extreme:"Extreme POI"};
  return Object.keys(c).filter(k=>c[k]).map(k=>labels[k]||k).join(", ");
}

function openViewModal(t) {
  const modal=$("viewModal"),body=$("modalBody"); if(!modal||!body)return;
  const rows=[["Date",t.date],["Time",t.time],["Pair",t.pair],["Direction",t.direction],["Session",t.session],["Broker",t.broker],["Account",t.account],["Status",t.status],["Result",normalizeResult(t.result)],["Lot Size",t.lotSize],["Entry",t.entry],["Stop Loss",t.stopLoss],["Take Profit",t.takeProfit],["Exit Price",t.exitPrice],["Risk %",t.risk],["Risk Amount",t.riskAmount],["RR",t.rr],["Profit",t.profit],["Commission",t.commission],["HTF Swing",t.htfSwing],["HTF Internal",t.htfInternal],["MTF Swing",t.mtfSwing],["MTF Internal",t.mtfInternal],["LTF Structure",t.ltfStructure],["Liquidity",t.liquidity],["POI",t.poi],["Entry Model",t.entryModel],["Confirmation",t.entryConfirmation],["Trade Valid",t.tradeValid],["Confidence",t.confidence],["Emotion",t.emotion],["Discipline",t.discipline],["Patience",t.patience],["Summary",t.tradeSummary],["Strengths",t.strengths],["Mistakes",t.mistakes],["Lesson",t.lessonLearned],["Improvement",t.improvementPlan],["Before Chart",t.beforeChart],["During Chart",t.duringChart],["After Chart",t.afterChart],["Notes",t.notes],["Confluences",getConfluenceLabels(t.confluences)]];
  body.innerHTML=rows.map(([label,value])=>`<div class="detail-row"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value||"-")}</div></div>`).join("");
  modal.classList.add("active");
}

function downloadFile(content,filename,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
function exportJSON(){if(!filteredTrades.length)return alert("No trades to export.");downloadFile(JSON.stringify(filteredTrades,null,2),"trades_export.json","application/json");}
function exportCSV(){
  if(!filteredTrades.length)return alert("No trades to export.");
  const headers=["Date","Time","Pair","Direction","Session","Account","Entry","Stop Loss","Take Profit","Exit Price","Risk %","Risk Amount","RR","Profit","Commission","Result","Status","Notes"];
  const csvEscape=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const rows=filteredTrades.map(t=>[t.date,t.time,t.pair,t.direction,t.session,t.account,t.entry,t.stopLoss,t.takeProfit,t.exitPrice,t.risk,t.riskAmount,t.rr,t.profit,t.commission,t.result,t.status,t.notes]);
  downloadFile([headers.map(csvEscape).join(","),...rows.map(r=>r.map(csvEscape).join(","))].join("\n"),"trades_export.csv","text/csv");
}

async function recalculateAccountBalance(accountId) {
  if (!accountId || !currentUser) return;
  try {
    const accountRef=doc(db,"users",currentUser.uid,"accounts",accountId);
    const accountSnap=await getDocs(collection(db,"users",currentUser.uid,"accounts"));
    const accountDoc=accountSnap.docs.find(d=>d.id===accountId);
    if(!accountDoc)return;
    const account=accountDoc.data();
    const pnl=trades.filter(t=>t.accountId===accountId && t.status==="Closed")
      .reduce((s,t)=>s+(Number(t.profit)||0)-(Number(t.commission)||0),0);
    await updateDoc(accountRef,{currentBalance:(Number(account.startingBalance)||0)+pnl,updated:new Date().toISOString()});
  } catch(e){ console.warn("Account balance recalculation skipped:",e); }
}

async function deleteTrade(id) {
  const trade=trades.find(t=>String(t.id)===String(id)); if(!trade)return;
  try {
    await deleteDoc(doc(db,"users",currentUser.uid,"trades",id));
    trades=trades.filter(t=>String(t.id)!==String(id));
    if(trade.accountId) await recalculateAccountBalance(trade.accountId);
    applyFiltersAndRender();
  } catch(e){ console.error(e); alert("Trade could not be deleted: "+e.message); }
}

async function clearAll() {
  if(!trades.length)return alert("No trades to clear.");
  if(!confirm("⚠️ Delete ALL your journal trades permanently from Firebase?"))return;
  try {
    for(const t of trades) await deleteDoc(doc(db,"users",currentUser.uid,"trades",t.id));
    const affected=[...new Set(trades.map(t=>t.accountId).filter(Boolean))];
    trades=[]; filteredTrades=[];
    for(const id of affected) await recalculateAccountBalance(id);
    applyFiltersAndRender();
  } catch(e){console.error(e);alert("Could not clear all trades: "+e.message);}
}

function setupSorting() {
  document.querySelectorAll("thead th[data-sort]").forEach(th=>th.addEventListener("click",()=>{
    const key=th.dataset.sort;
    if(sortKey===key)sortAsc=!sortAsc; else {sortKey=key;sortAsc=false;}
    renderTable();
  }));
}

function initHistory() {
  $("applyFilters")?.addEventListener("click",applyFiltersAndRender);
  $("resetFilters")?.addEventListener("click",()=>{
    ["filterPair","filterDirection","filterResult","filterDateFrom","filterDateTo"].forEach(id=>{if($(id))$(id).value="";});
    applyFiltersAndRender();
  });
  $("exportCSV")?.addEventListener("click",exportCSV);
  $("exportJSON")?.addEventListener("click",exportJSON);
  $("clearAll")?.addEventListener("click",clearAll);
  $("closeModal")?.addEventListener("click",()=>$("viewModal")?.classList.remove("active"));
  $("viewModal")?.addEventListener("click",e=>{if(e.target===$("viewModal"))$("viewModal").classList.remove("active");});
  setupSorting();
  $("scrollTopBtn")?.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  window.addEventListener("scroll",()=>$("scrollTopBtn")?.classList.toggle("visible",window.scrollY>300));
  $("logoutBtn")?.addEventListener("click",async()=>{if(confirm("Logout?")){await signOut(auth);window.location.reload();}});
}

initHistory();

onAuthStateChanged(auth, async user=>{
  if(!user){window.location.href="/login";return;}
  currentUser=user;
  await loadTrades();
});

console.log("✅ GTRADES-AXIS history engine loaded — Firestore.");
