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

const form = document.getElementById("registerForm");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: name });

            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                role: "pending",
                active: false,
                status: "pending",
                payment: "unpaid",
                createdAt: serverTimestamp(),
                uid: user.uid
            });

            alert("Registration successful!\n\nYour account is pending administrator approval.");
            window.location.href = "pending.html";

        } catch (error) {
            console.error("Registration error:", error);
            alert(error.message);
        }
    });
}