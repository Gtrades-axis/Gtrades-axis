/* ======================================================
   GTRADES-AXIS™ PREMIUM GUARD
   (Works with embedded overlay + fallback)
====================================================== */

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ─── Logout function ──────────────────────────────────────
async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        }
    }
}

// ─── Premium Guard function ───────────────────────────────
window.PremiumGuard = function(options = {}) {
    const feature = options.feature || 'Premium Feature';

    const mainApp = document.getElementById('mainApp');
    const premiumOverlay = document.getElementById('premiumOverlay');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const logoutBtn = document.getElementById('logoutBtn');

    onAuthStateChanged(auth, async (user) => {
        if (loadingSpinner) loadingSpinner.style.display = 'none';

        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const isPremium = userDoc.exists() && userDoc.data().premium === true;

            if (isPremium) {
                console.log(`✅ Premium access granted for "${feature}"`);
                if (mainApp) {
                    mainApp.style.display = 'flex';
                    if (premiumOverlay) premiumOverlay.classList.remove('active');
                } else {
                    document.body.classList.add('premium-authorized');
                }
            } else {
                console.log(`❌ Premium access denied for "${feature}"`);
                if (mainApp && premiumOverlay) {
                    mainApp.style.display = 'none';
                    premiumOverlay.classList.add('active');
                } else {
                    showPremiumOverlay(feature);
                }
            }
        } catch (error) {
            console.error('❌ Error checking premium:', error);
            if (mainApp && premiumOverlay) {
                mainApp.style.display = 'none';
                premiumOverlay.classList.add('active');
                const msgEl = document.querySelector('#premiumOverlay .premium-box p');
                if (msgEl) {
                    msgEl.innerHTML = `⚠️ Error verifying membership.<br><small style="color:#f87171;">${error.message}</small>`;
                }
            } else {
                showErrorOverlay(error.message);
            }
        }
    });

    if (logoutBtn) {
        logoutBtn.removeEventListener('click', handleLogout);
        logoutBtn.addEventListener('click', handleLogout);
    }

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('#logoutBtn');
        if (btn) handleLogout();
    });

    console.log(`🔒 PremiumGuard initialized for "${feature}"`);
};

// ─── Fallback overlays ────────────────────────────────────
function showPremiumOverlay(feature) {
    const existing = document.getElementById('premiumGuardOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'premiumGuardOverlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
        z-index: 9999; display: flex; justify-content: center; align-items: center;
        padding: 20px;
    `;
    overlay.innerHTML = `
        <div style="
            background: #1a1f2f; border: 1px solid #2a3450;
            border-radius: 20px; padding: 60px 50px; max-width: 500px;
            width: 100%; text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
        ">
            <div style="font-size: 64px; color: #f5a623; margin-bottom: 20px;">🔒</div>
            <h2 style="font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 12px;">Premium Required</h2>
            <p style="font-size: 16px; color: #9aa4bf; margin-bottom: 30px;">
                ${feature} is available exclusively to Premium Members.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <a href="dashboard.html" style="
                    padding: 14px 40px; background: linear-gradient(135deg, #f5a623, #e69500);
                    border: none; border-radius: 12px; color: #0b0d15;
                    font-weight: 700; font-size: 16px; text-decoration: none;
                    transition: 0.25s;
                ">Go to Dashboard</a>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function showErrorOverlay(message) {
    const existing = document.getElementById('premiumGuardOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'premiumGuardOverlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
        z-index: 9999; display: flex; justify-content: center; align-items: center;
        padding: 20px;
    `;
    overlay.innerHTML = `
        <div style="
            background: #1a1f2f; border: 1px solid #ff4766;
            border-radius: 20px; padding: 40px 30px; max-width: 500px;
            width: 100%; text-align: center;
        ">
            <div style="font-size: 48px; color: #ff4766; margin-bottom: 20px;">⚠️</div>
            <h2 style="font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 12px;">Error</h2>
            <p style="font-size: 14px; color: #f87171; margin-bottom: 20px;">${message}</p>
            <a href="dashboard.html" style="
                padding: 14px 40px; background: #4f7cff;
                border: none; border-radius: 12px; color: #fff;
                font-weight: 700; font-size: 16px; text-decoration: none;
            ">Go to Dashboard</a>
        </div>
    `;
    document.body.appendChild(overlay);
}