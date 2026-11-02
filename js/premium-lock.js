// ============================================================
// GTRADES-AXIS™ – PREMIUM LOCK (No flash, no redirects)
// ============================================================

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/**
 * Initialize the premium lock on a container.
 * @param {string} containerId – The id of the container that holds the lock overlay and content.
 * @param {Function} onUnlock – Callback executed when user has premium/admin access.
 */
export function initPremiumLock(containerId = 'app', onUnlock = null) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found.`);
    return;
  }

  // ─── HIDE EVERYTHING while we check auth ────────────────────
  container.classList.add('loading');

  onAuthStateChanged(auth, async (user) => {
    // If no user, lock the page (show overlay)
    if (!user) {
      container.classList.remove('loading');
      container.classList.add('locked');
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        container.classList.remove('loading');
        container.classList.add('locked');
        return;
      }

      const data = userDoc.data();
      const role = data.role || 'member';
      const membership = data.membership || 'free';
      const hasPremium = (role === 'admin' || membership === 'premium');

      // ─── Remove loading state ──────────────────────────────
      container.classList.remove('loading');

      if (hasPremium) {
        // ✅ Premium/admin – show content (remove locked class)
        container.classList.remove('locked');
        if (typeof onUnlock === 'function') {
          onUnlock(data);
        }
      } else {
        // ❌ Free/pending – show lock overlay
        container.classList.add('locked');
      }
    } catch (error) {
      console.error('Premium lock error:', error);
      container.classList.remove('loading');
      container.classList.add('locked');
    }
  });
}