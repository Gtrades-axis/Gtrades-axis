console.log("🔥 register.js loaded");

import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

console.log("✅ Firebase imports done");

const form = document.getElementById("registerForm");
console.log("📝 Form element:", form);

if (form) {
    console.log("✅ Form found – attaching listener");
    form.addEventListener("submit", async (e) => {
        console.log("🚀 Form submitted");
        e.preventDefault();  // ⬅️ Prevent page refresh

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        console.log("📋 Name:", name, "Email:", email);

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            console.warn("❌ Passwords don't match");
            return;
        }
        if (password.length < 6) {
            alert("Password must be at least 6 characters.");
            console.warn("❌ Password too short");
            return;
        }

        try {
            console.log("⏳ Creating user...");
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("✅ User created:", user.uid);

            await updateProfile(user, { displayName: name });
            console.log("✅ Profile updated");

            // Send verification email
            await sendEmailVerification(user);
            console.log("✅ Verification email sent");

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: name,
                email: email,
                role: "member",
                membership: "free",
                active: false,
                status: "pending",
                payment: "unpaid",
                paymentStatus: "none",
                emailVerified: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            console.log("✅ Firestore document created");

            alert("✅ Registration successful!\n\nVerification email sent. Please check your inbox.");
            console.log("➡️ Redirecting to pending.html");
            window.location.href = "/pending";

        } catch (error) {
            console.error("❌ Registration error:", error);
            alert("❌ Error: " + error.message);
        }
    });
} else {
    console.error("❌ Form with id 'registerForm' not found!");
}