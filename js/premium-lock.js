// ============================================================
// GTRADES-AXIS™
// PREMIUM LOCK – No‑redirect, clean lock screen
// ============================================================

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/**
 * Initialize the premium lock on a container.
 * @param {string} containerId – The id of the container that holds the lock overlay and content.
 * @param {Function} onUnlock – Optional callback executed when user has premium/admin access.
 */
export function initPremiumLock(containerId = 'app', onUnlock = null) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found.`);
    return;
  }

  // Always start locked until we verify
  container.classList.add('locked');

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Not logged in → stay locked
      container.classList.add('locked');
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        container.classList.add('locked');
        return;
      }

      const data = userDoc.data();
      const role = data.role || 'member';
      const membership = data.membership || 'free';
      const hasPremium = (role === 'admin' || membership === 'premium');

      if (hasPremium) {
        // Unlock and optionally init the page
        container.classList.remove('locked');
        if (typeof onUnlock === 'function') {
          onUnlock(data);
        }
      } else {
        container.classList.add('locked');
      }
    } catch (error) {
      console.error('Premium lock error:', error);
      container.classList.add('locked');
    }
  });
}