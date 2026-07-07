import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {

    const page = window.location.pathname.split("/").pop();

    const publicPages = [
        "",
        "index.html",
        "login.html",
        "register.html",
        "forgot-password.html"
    ];

    // Not logged in
    if (!user) {

        if (!publicPages.includes(page)) {
            window.location.href = "login.html";
        }

        return;
    }

    // Logged in
    const docRef = doc(db, "users", user.uid);

    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {

        alert("Your account could not be found.");

        await signOut(auth);

        window.location.href = "login.html";

        return;

    }

    const data = docSnap.data();
    console.log("Logged in UID:", user.uid);
console.log("Firestore data:", data);

    // Account awaiting approval

    if (data.active === false) {

        alert("Your account is awaiting administrator approval.");

        await signOut(auth);

        window.location.href = "login.html";

        return;

    }

    // Display user info

    const userName = document.getElementById("userName");

    if (userName) {

        userName.textContent = data.name;

    }

    const userEmail = document.getElementById("userEmail");

    if (userEmail) {

        userEmail.textContent = data.email;

    }

});

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        await signOut(auth);

        window.location.href = "login.html";

    });

}
