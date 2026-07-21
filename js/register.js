// ============================================================
// GTRADES AXIS™
// REGISTER
// ============================================================

import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const form = document.getElementById("registerForm");

let registering = false;

if (form) {

    form.addEventListener("submit", registerUser);

}

async function registerUser(e) {

    e.preventDefault();

    if (registering) return;

    registering = true;

    const submitButton = form.querySelector("button[type='submit']");

    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent = "Creating Account...";

    }

    const name = document.getElementById("name").value.trim();

    const email = document.getElementById("email").value.trim().toLowerCase();

    const password = document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (!name) {

        alert("Please enter your name.");

        resetButton();

        return;

    }

    if (!email) {

        alert("Please enter your email.");

        resetButton();

        return;

    }

    if (password.length < 6) {

        alert("Password must be at least 6 characters.");

        resetButton();

        return;

    }

    if (password !== confirmPassword) {

        alert("Passwords do not match.");

        resetButton();

        return;

    }

    try {

        const credential = await createUserWithEmailAndPassword(

            auth,

            email,

            password

        );

        await updateProfile(

            credential.user,

            {

                displayName: name

            }

        );

        const userRef = doc(

            db,

            "users",

            credential.user.uid

        );

        const existing = await getDoc(userRef);

        if (!existing.exists()) {

            await setDoc(userRef, {

                uid: credential.user.uid,

                name: name,

                email: email,

                role: "pending",

                status: "pending",

                active: false,

                premium: false,

                paymentStatus: "unpaid",

                approvedBy: null,

                approvedAt: null,

                createdAt: serverTimestamp()

            });

        }

        alert(

            "Registration successful!\n\nYour account has been created and is waiting for administrator approval."

        );

        window.location.href = "pending.html";

    }

    catch (error) {

        console.error(error);

        switch (error.code) {

            case "auth/email-already-in-use":

                alert("This email is already registered.");

                break;

            case "auth/invalid-email":

                alert("Please enter a valid email.");

                break;

            case "auth/weak-password":

                alert("Password is too weak.");

                break;

            case "auth/network-request-failed":

                alert("Network error. Check your internet connection.");

                break;

            default:

                alert(error.message);

        }

    }

    finally {

        resetButton();

    }

}

function resetButton() {

    registering = false;

    const submitButton = form.querySelector("button[type='submit']");

    if (submitButton) {

        submitButton.disabled = false;

        submitButton.textContent = "Register";

    }

}