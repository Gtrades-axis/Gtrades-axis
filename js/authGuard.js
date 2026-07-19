// ============================================================
// GTRADES-AXIS™ – Complete Authentication & Page Guard
// Include this script on EVERY page (login, register, dashboard, journal, etc.)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ============================================================
// 1. FIREBASE CONFIG – REPLACE WITH YOUR OWN
// ============================================================

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ============================================================
// 2. PAGE GUARD – AUTOMATIC PROTECTION
// ============================================================

// This runs immediately and protects every page.
// If user is not logged in and page is not public, redirect to login.html.
onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname.split('/').pop() || '';
    const publicPages = ['index.html', 'login.html', 'register.html'];

    if (!user && !publicPages.includes(currentPage)) {
        // User is not logged in and trying to access protected content
        window.location.href = 'login.html';
    }

    // Optional: if user is logged in and on login/register, redirect to dashboard
    if (user && (currentPage === 'login.html' || currentPage === 'register.html')) {
        window.location.href = 'dashboard.html';
    }
});

// ============================================================
// 3. EXPOSE AUTH FUNCTIONS FOR FORMS
// ============================================================

// ---- LOGIN ----
export async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.code, message: error.message };
    }
}

// ---- REGISTER ----
export async function registerUser(name, email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update display name
        await updateProfile(userCredential.user, { displayName: name });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.code, message: error.message };
    }
}

// ---- LOGOUT ----
export async function logoutUser() {
    await signOut(auth);
    window.location.href = 'login.html';
}

// ---- GET CURRENT USER ----
export function getCurrentUser() {
    return auth.currentUser;
}

// ============================================================
// 4. AUTO-BIND FORM HANDLERS (if forms exist on the page)
// ============================================================

// This runs when the script loads and attaches submit handlers
// to login and register forms if they exist.

document.addEventListener('DOMContentLoaded', () => {

    // ----- LOGIN FORM -----
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email')?.value.trim();
            const password = document.getElementById('password')?.value;
            const errorEl = document.getElementById('errorMsg');
            const successEl = document.getElementById('successMsg');
            const btn = loginForm.querySelector('button[type="submit"]');

            if (!email || !password) {
                if (errorEl) errorEl.textContent = 'Please fill in all fields.';
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
            if (errorEl) errorEl.textContent = '';
            if (successEl) successEl.textContent = '';

            const result = await loginUser(email, password);
            if (result.success) {
                if (successEl) successEl.textContent = 'Login successful! Redirecting...';
                setTimeout(() => window.location.href = 'dashboard.html', 1000);
            } else {
                let msg = 'Login failed. Please check your credentials.';
                if (result.error === 'auth/user-not-found') msg = 'No account found with this email.';
                else if (result.error === 'auth/wrong-password') msg = 'Incorrect password.';
                else if (result.error === 'auth/too-many-requests') msg = 'Too many failed attempts. Try again later.';
                if (errorEl) errorEl.textContent = msg;
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Log In';
            }
        });
    }

    // ----- REGISTER FORM -----
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const password = document.getElementById('password')?.value;
            const errorEl = document.getElementById('errorMsg');
            const successEl = document.getElementById('successMsg');
            const btn = registerForm.querySelector('button[type="submit"]');

            if (!name || !email || !password) {
                if (errorEl) errorEl.textContent = 'Please fill in all fields.';
                return;
            }
            if (password.length < 6) {
                if (errorEl) errorEl.textContent = 'Password must be at least 6 characters.';
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';
            if (errorEl) errorEl.textContent = '';
            if (successEl) successEl.textContent = '';

            const result = await registerUser(name, email, password);
            if (result.success) {
                if (successEl) successEl.textContent = 'Account created! Redirecting...';
                setTimeout(() => window.location.href = 'dashboard.html', 1200);
            } else {
                let msg = 'Registration failed. Please try again.';
                if (result.error === 'auth/email-already-in-use') msg = 'Email already registered. Please log in.';
                else if (result.error === 'auth/invalid-email') msg = 'Invalid email address.';
                if (errorEl) errorEl.textContent = msg;
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
            }
        });
    }

    // ----- LOGOUT BUTTON (if exists) -----
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    // ----- TOGGLE PASSWORD VISIBILITY (if eye icons exist) -----
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.closest('.password-wrapper').querySelector('input');
            if (!input) return;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });
});