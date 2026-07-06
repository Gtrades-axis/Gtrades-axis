import { auth } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const form = document.getElementById("loginForm");
const googleBtn = document.getElementById("googleLogin");

// Email Login
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {

        await signInWithEmailAndPassword(auth, email, password);

        window.location.href = "dashboard.html";

    } catch (error) {

        let message = "";

        switch (error.code) {

            case "auth/invalid-credential":
                message = "Invalid email or password.";
                break;

            case "auth/user-not-found":
                message = "Account not found.";
                break;

            case "auth/wrong-password":
                message = "Incorrect password.";
                break;

            default:
                message = error.message;
        }

        alert(message);
    }
});

// Google Login
googleBtn.addEventListener("click", async () => {

    try {

        const provider = new GoogleAuthProvider();

        await signInWithPopup(auth, provider);

        window.location.href = "dashboard.html";

    } catch (error) {

        alert(error.message);

    }

});
