import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// DOM elements
const totalMembers = document.getElementById("totalMembers");
const premiumMembers = document.getElementById("premiumMembers");
const adminMembers = document.getElementById("adminMembers");
const pendingMembers = document.getElementById("pendingMembers");
const todayCount = document.getElementById("todayCount");
const resourceCount = document.getElementById("resourceCount");
const lessonCount = document.getElementById("lessonCount");
const paymentCount = document.getElementById("paymentCount");
const premiumOverview = document.getElementById("premiumOverview");
const pendingOverview = document.getElementById("pendingOverview");
const resourceOverview = document.getElementById("resourceOverview");
const lessonOverview = document.getElementById("lessonOverview");
const recentMembers = document.getElementById("recentMembers");
const liveDate = document.getElementById("liveDate");

// ─── Live clock ──────────────────────────────────────────────
function updateClock() {
  if (!liveDate) return;
  const now = new Date();
  liveDate.innerHTML = now.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
updateClock();
setInterval(updateClock, 1000);

// ─── Load all stats ──────────────────────────────────────────
async function refreshDashboard() {
  try {
    // Members stats
    const usersSnap = await getDocs(collection(db, "users"));
    let total = 0, premium = 0, admins = 0, pending = 0, joinedToday = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    usersSnap.forEach(doc => {
      const data = doc.data();
      total++;
      if (data.role === "premium") premium++;
      if (data.role === "admin") admins++;
      if (data.active === false || data.status === "pending" || data.role === "pending") pending++;
      if (data.createdAt) {
        const created = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        if (created >= today) joinedToday++;
      }
    });

    if (totalMembers) totalMembers.textContent = total;
    if (premiumMembers) premiumMembers.textContent = premium;
    if (adminMembers) adminMembers.textContent = admins;
    if (pendingMembers) pendingMembers.textContent = pending;
    if (todayCount) todayCount.textContent = joinedToday;
    if (premiumOverview) premiumOverview.textContent = premium;
    if (pendingOverview) pendingOverview.textContent = pending;

    // Resources
    const resourcesSnap = await getDocs(collection(db, "resources"));
    const resourceTotal = resourcesSnap.size;
    if (resourceCount) resourceCount.textContent = resourceTotal;
    if (resourceOverview) resourceOverview.textContent = resourceTotal;

    // Academy
    const academySnap = await getDocs(collection(db, "academy"));
    const lessonTotal = academySnap.size;
    if (lessonCount) lessonCount.textContent = lessonTotal;
    if (lessonOverview) lessonOverview.textContent = lessonTotal;

    // Payments
    const paymentsSnap = await getDocs(collection(db, "payments"));
    if (paymentCount) paymentCount.textContent = paymentsSnap.size;

    // Recent members
    if (recentMembers) {
      const recentQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(5));
      const recentSnap = await getDocs(recentQuery);
      if (recentSnap.empty) {
        recentMembers.innerHTML = `<div class="empty-card">No members yet.</div>`;
      } else {
        recentMembers.innerHTML = "";
        recentSnap.forEach(doc => {
          const user = doc.data();
          const initials = user.name ? user.name.charAt(0).toUpperCase() : "U";
          recentMembers.innerHTML += `
            <div class="recent-member">
              <div class="recent-avatar">${initials}</div>
              <div class="recent-info">
                <h4>${user.name || "Unknown"}</h4>
                <p>${user.email || ""}</p>
              </div>
            </div>
          `;
        });
      }
    }
  } catch (error) {
    console.error("Dashboard load error:", error);
  }
}

refreshDashboard();
setInterval(refreshDashboard, 30000);