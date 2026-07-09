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

                alert("Account not found.");

                return;

            }

            const user = snap.data();

            if (!user.active) {

                alert("Your account is awaiting administrator approval.");

                return;

            }

            if (user.role === "admin") {

                window.location.href = "admin.html";
                return;

            }

            if (user.role === "premium") {

                window.location.href = "dashboard.html";
                return;

            }

            alert("Your account is not configured correctly.");

        } catch (error) {

            console.log(error);
            console.log(error.code);
            console.log(error.message);

            alert(error.code);

        }

    });

}