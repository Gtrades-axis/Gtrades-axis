import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

console.log("🔵 register.js loaded");

const form = document.getElementById("registerForm");

if (!form) {
    console.error("❌ Register form not found!");
} else {
    console.log("✅ Register form found, attaching listener...");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("📝 Register form submitted");

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        console.log("Name:", name, "Email:", email);

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        try {
            console.log("1️⃣ Creating Auth user...");
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("✅ Auth user created:", user.uid);

            console.log("2️⃣ Updating profile...");
            await updateProfile(user, { displayName: name });
            console.log("✅ Profile updated");

            console.log("3️⃣ Writing to Firestore...");
            const userData = {
                name: name,
                email: email,
                role: "pending",
                active: false,
                status: "pending",
                payment: "unpaid",
                createdAt: serverTimestamp(),
                uid: user.uid
            };
            console.log("📦 Data to write:", userData);

            await setDoc(doc(db, "users", user.uid), userData);
            console.log("✅ Firestore document created for:", user.uid);

            alert("Registration successful!\n\nYour account is pending administrator approval.");
            window.location.href = "pending.html";

        } catch (error) {
            console.error("❌ Registration error:", error);
            alert("Error: " + error.message);
        }
    });
}