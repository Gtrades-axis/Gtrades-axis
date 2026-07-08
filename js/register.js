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

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (password !== confirm) {
        alert("Passwords do not match.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    try {

        const cred = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        await updateProfile(cred.user, {
            displayName: name
        });

        await setDoc(doc(db, "users", cred.user.uid), {

            name: name,
            email: email,

            role: "pending",

            premium: false,

            active: false,

            paymentStatus: "unpaid",

            createdAt: serverTimestamp()

        });

        alert(
            "Registration successful.\n\nPlease make payment and wait for administrator approval."
        );

        window.location.href = "login.html";

    } catch (err) {

        alert(err.message);

    }

});
