import { auth, db } from "./firebase.js";
import {
    signInWithEmailAndPassword,
    sendEmailVerification   // ✅ NEW: import for resending if needed
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const form = document.getElementById("loginForm");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            // 1. Sign in
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const user = credential.user;

            // ✅ 2. Check if email is verified
            if (!user.emailVerified) {
                // Resend verification email
                await sendEmailVerification(user);
                alert("📧 Please verify your email first. A new verification link has been sent to your inbox.");
                // Optionally redirect to verify-email page
                window.location.href = "/verify-email";
                return;
            }

            // 3. Get user document
            const uid = user.uid;
            const snap = await getDoc(doc(db, "users", uid));

            if (!snap.exists()) {
                alert("Account not found. Please register first.");
                return;
            }

            const userData = snap.data();

            // 4. Check approval status
            if (!userData.active) {
                alert("Your account is awaiting administrator approval.");
                return;
            }

            // 5. If role is still "pending" but active is true, auto-upgrade to "member"
            if (userData.role === "pending") {
                await updateDoc(doc(db, "users", uid), { role: "member" });
            }

            // 6. Set session flag for meta-refresh guard (if any)
            sessionStorage.setItem('gtrades_user_logged_in', 'true');

            // 7. Role-based redirects
            if (userData.role === "admin") {
                window.location.href = "/admin";
                return;
            }
            if (userData.role === "premium") {
                window.location.href = "/dashboard";
                return;
            }
            // Default for members and auto-upgraded users
            window.location.href = "/dashboard";

        } catch (error) {
            console.error("Login error:", error);
            let message = "Login failed. Please try again.";
            if (error.code === "auth/user-not-found") message = "No account found with this email. Please register first.";
            else if (error.code === "auth/wrong-password") message = "Incorrect password. Please try again.";
            else if (error.code === "auth/invalid-email") message = "Invalid email address.";
            else if (error.code === "auth/too-many-requests") message = "Too many failed attempts. Please wait and try again later.";
            else if (error.code === "auth/network-request-failed") message = "Network error – check your internet connection.";
            else if (error.code === "auth/invalid-credential") message = "Invalid email or password. Please try again.";
            alert(message);
        }
    });
}