import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const form = document.getElementById("loginForm");
const googleBtn = document.getElementById("googleLogin");

// ===================================
// Ensure Firestore User Exists
// ===================================

async function ensureUserDocument(user) {

    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {

        await setDoc(userRef, {

            name: user.displayName || user.email,

            email: user.email,

            role: "premium",

            active: true,

            premium: true,

            createdAt: serverTimestamp()

        });

        return await getDoc(userRef);

    }

    return userSnap;

}

// ===================================
// Redirect User
// ===================================

function redirectUser(data) {

    if (data.active === false) {

        alert("Your account is awaiting administrator approval.");

        return;

    }

    if (data.role === "admin") {

        window.location.href = "admin.html";

    } else {

        window.location.href = "dashboard.html";

    }

}
// ===================================
// Email Login
// ===================================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        const docSnap = await ensureUserDocument(user);

        const data = docSnap.data();

        console.log("UID:", user.uid);
        console.log("User Data:", data);

        redirectUser(data);

    } catch (error) {

        let message;

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

// ===================================
// Google Login
// ===================================

if (googleBtn) {

    googleBtn.addEventListener("click", async () => {

        try {

            const provider = new GoogleAuthProvider();

            const result = await signInWithPopup(auth, provider);

            const user = result.user;

            const docSnap = await ensureUserDocument(user);

            const data = docSnap.data();

            console.log("Google UID:", user.uid);
            console.log("Google User Data:", data);

            redirectUser(data);

        } catch (error) {

            alert(error.message);

        }

    });

}
