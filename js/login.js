import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const form = document.getElementById("loginForm");

if (form) {

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {

            const credential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            const uid = credential.user.uid;

            const snap = await getDoc(doc(db, "users", uid));

            if (!snap.exists()) {

                alert("Account not found. Please register first.");
                return;

            }

            const user = snap.data();

            // ✅ If not active – show waiting for approval
            if (!user.active) {

                alert("Your account is awaiting administrator approval.");
                return;

            }

            // ✅ Redirect based on role
            if (user.role === "admin") {

                window.location.href = "admin.html";
                return;

            }

            if (user.role === "premium") {

                window.location.href = "dashboard.html";
                return;

            }

            // Default for members
            window.location.href = "dashboard.html";

        } catch (error) {

            console.error("Login error:", error);

            // ✅ Friendly error messages instead of Firebase codes
            let message = "Login failed. Please try again.";

            if (error.code === "auth/user-not-found") {
                message = "No account found with this email. Please register first.";
            } else if (error.code === "auth/wrong-password") {
                message = "Incorrect password. Please try again.";
            } else if (error.code === "auth/invalid-email") {
                message = "Invalid email address.";
            } else if (error.code === "auth/too-many-requests") {
                message = "Too many failed attempts. Please wait and try again later.";
            } else if (error.code === "auth/network-request-failed") {
                message = "Network error – check your internet connection.";
            } else if (error.code === "auth/invalid-credential") {
                // This is the generic "invalid email/password" error
                message = "Invalid email or password. Please try again.";
            }

            alert(message);

        }

    });

}