// ============================================================
// GTRADES-AXIS™ – COMPLETE AUTH & ROLE GUARD
// (Includes confirm password check)
// ============================================================

import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============================================================
// 1. PAGE GUARD – PROTECTS EVERY PAGE
// ============================================================

onAuthStateChanged(auth, async (user) => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['index.html', 'login.html', 'register.html'];

    if (!user && !publicPages.includes(currentPage)) {
        window.location.href = 'login.html';
        return;
    }

    if (user && (currentPage === 'login.html' || currentPage === 'register.html')) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Role-based access for academy
    if (user && currentPage === 'academy.html') {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const role = userDoc.exists() ? userDoc.data().role : 'member';
            if (role !== 'premium' && role !== 'admin') {
                alert('Academy access requires a Premium subscription.');
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error('Role check failed:', error);
            window.location.href = 'dashboard.html';
        }
    }
});

// ============================================================
// 2. LOGIN FUNCTION
// ============================================================

export async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
    } catch (error) {
        return { success: false, code: error.code, message: error.message };
    }
}

// ============================================================
// 3. REGISTER FUNCTION (creates user + Firestore profile)
// ============================================================

export async function registerUser(name, email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });

        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            role: 'member',
            createdAt: new Date().toISOString(),
            uid: user.uid
        });

        return { success: true };
    } catch (error) {
        return { success: false, code: error.code, message: error.message };
    }
}

// ============================================================
// 4. LOGOUT FUNCTION
// ============================================================

export async function logoutUser() {
    await signOut(auth);
    window.location.href = 'login.html';
}

// ============================================================
// 5. GET CURRENT USER DATA
// ============================================================

export async function getCurrentUserData() {
    const user = auth.currentUser;
    if (!user) return null;
    const docSnap = await getDoc(doc(db, "users", user.uid));
    return docSnap.exists() ? { uid: user.uid, ...docSnap.data() } : null;
}

// ============================================================
// 6. AUTO-BIND FORM HANDLERS
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- LOGIN FORM ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email')?.value.trim();
            const password = document.getElementById('password')?.value;
            const errorEl = document.getElementById('errorMsg');
            const btn = loginForm.querySelector('button[type="submit"]');

            if (!email || !password) {
                if (errorEl) errorEl.textContent = 'Please fill in all fields.';
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
            if (errorEl) errorEl.textContent = '';

            const result = await loginUser(email, password);
            if (result.success) {
                // Redirect handled by onAuthStateChanged
            } else {
                let msg = 'Login failed. Please check your credentials.';
                if (result.code === 'auth/user-not-found') msg = 'No account found with this email.';
                else if (result.code === 'auth/wrong-password') msg = 'Incorrect password.';
                else if (result.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Try again later.';
                if (errorEl) errorEl.textContent = msg;
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Log In';
            }
        });
    }

    // --- REGISTER FORM (with confirm password check) ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const password = document.getElementById('password')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;
            const errorEl = document.getElementById('errorMsg');
            const successEl = document.getElementById('successMsg');
            const btn = registerForm.querySelector('button[type="submit"]');

            if (!name || !email || !password || !confirmPassword) {
                if (errorEl) errorEl.textContent = 'Please fill in all fields.';
                return;
            }
            if (password.length < 6) {
                if (errorEl) errorEl.textContent = 'Password must be at least 6 characters.';
                return;
            }
            if (password !== confirmPassword) {
                if (errorEl) errorEl.textContent = 'Passwords do not match.';
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
                if (result.code === 'auth/email-already-in-use') msg = 'Email already registered. Please log in.';
                else if (result.code === 'auth/invalid-email') msg = 'Invalid email address.';
                else if (result.code === 'auth/network-request-failed') msg = 'Network error. Check your internet connection.';
                if (errorEl) errorEl.textContent = msg;
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
            }
        });
    }

    // --- LOGOUT BUTTON ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }
});