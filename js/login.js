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
async function ensureUserDocument(user) {

    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {

        await setDoc(userRef, {

            name: user.displayName || "",

            email: user.email,

            role: "premium",

            active: true,

            createdAt: serverTimestamp()

        });

    }

    return await getDoc(userRef);

}
// Email Login
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

// Make sure the Firestore user document exists
const docSnap = await ensureUserDocument(user);

const data = docSnap.data();
        console.log("Logged in UID:", user.uid);
console.log("Firestore data:", data);

// Admin
// Check if account is active
if (data.active === false) {

    alert("Your account is awaiting administrator approval.");

    return;

}

// Administrator
if (data.role === "admin") {

    window.location.href = "admin.html";

}

// Premium Member
else {

    window.location.href = "dashboard.html";



}

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

        const result = await signInWithPopup(auth, provider);

        const user = result.user;

        // Ensure Firestore user exists
        const docSnap = await ensureUserDocument(user);

        const data = docSnap.data();

        // Check if account is active
        if (data.active === false) {

            alert("Your account is awaiting administrator approval.");

            return;

        }

        // Redirect based on role
        if (data.role === "admin") {

            window.location.href = "admin.html";

        } else {

            window.location.href = "dashboard.html";

        }

    } catch (error) {

        alert(error.message);

    }

});
    } catch (error) {

        alert(error.message);

    }

});
