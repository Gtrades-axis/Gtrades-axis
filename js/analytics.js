import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let trades = [];
let charts = {};
let currentUser = null;
let analyticsLoaded = false;

// DOM elements (keep your existing IDs)
// ...

onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  loadTradesRealtime();
});

function loadTradesRealtime() {
  // ✅ CORRECT PATH: subcollection under user
  const tradesRef = collection(db, "users", currentUser.uid, "trades");
  const q = query(tradesRef, orderBy("tradeDate", "desc"));
  onSnapshot(q, (snapshot) => {
    trades = [];
    snapshot.forEach((doc) => trades.push({ id: doc.id, ...doc.data() }));
    refreshAnalytics();
  }, (error) => {
    console.error("Firestore error:", error);
    alert("Error loading trades: " + error.message);
  });
}

function refreshAnalytics() {
  if (!analyticsLoaded) {
    initializeCharts();
    analyticsLoaded = true;
  }
  updateOverview();
  buildCharts();
  buildInsights();
}

// ... (rest of analytics logic – same as before but using the subcollection path)