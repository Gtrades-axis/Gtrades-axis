// ============================================================
// GTRADES-AXIS™ – PREMIUM ACCESS GUARD
// Admins always have access. Premium access supports legacy and
// current membership fields and membership expiry.
// ============================================================

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const normalize = (value) => String(value ?? "").trim().toLowerCase();

function dateValue(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function accessFromData(data = {}, claims = {}) {
  const role = normalize(data.role || claims.role);
  const membership = normalize(data.membership || data.membershipStatus || data.subscription || claims.membership);
  const plan = normalize(data.membershipPlan || data.plan || data.subscriptionPlan || claims.membershipPlan);

  // Administrators are never blocked by premium expiry.
  if (role === "admin" || claims.admin === true || claims.isAdmin === true) return true;

  // Support legacy boolean access flags used by older records.
  if (data.isPremium === true || data.premiumAccess === true || data.hasPremiumAccess === true) return true;

  if (!["premium", "paid", "active"].includes(membership)) return false;

  // Lifetime memberships never expire. For legacy premium records without
  // an expiry date, keep access (older records did not always store one).
  if (plan === "lifetime") return true;

  const expiry = dateValue(data.membershipExpiresAt || data.expiresAt || data.subscriptionExpiresAt);
  return !expiry || expiry.getTime() > Date.now();
}

export function initPremiumLock(containerId = "app", onUnlock = null) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found.`);
    return;
  }

  container.classList.add("loading");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      container.classList.remove("loading");
      container.classList.add("locked");
      return;
    }

    try {
      // Force-refresh claims so an admin/premium claim added recently is seen.
      let claims = {};
      try {
        claims = (await user.getIdTokenResult(true)).claims || {};
      } catch (claimError) {
        console.warn("Unable to refresh auth claims; using Firestore only.", claimError);
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const data = userDoc.exists() ? userDoc.data() : {};
      const hasAccess = accessFromData(data, claims);

      // Expose a consistent status for pages that use the shared guard.
      window.currentUser = { uid: user.uid, ...data };
      window.isAdmin = normalize(data.role || claims.role) === "admin" || claims.admin === true || claims.isAdmin === true;
      window.isPremium = hasAccess;
      window.hasPremiumAccess = hasAccess;

      console.log("GTRADES-AXIS premium guard:", {
        uid: user.uid,
        role: data.role,
        membership: data.membership,
        membershipPlan: data.membershipPlan,
        membershipExpiresAt: data.membershipExpiresAt,
        adminClaim: claims.admin,
        hasAccess
      });

      container.classList.remove("loading");

      if (hasAccess) {
        container.classList.remove("locked");
        if (typeof onUnlock === "function") onUnlock(data);
      } else {
        container.classList.add("locked");
      }
    } catch (error) {
      console.error("Premium access check failed:", error);
      container.classList.remove("loading");
      container.classList.add("locked");
    }
  });
}

export { accessFromData };
