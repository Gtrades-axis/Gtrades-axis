import { auth, db } from "./firebase.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// =======================================
// Load Member Information
// =======================================

async function loadUser() {

    const user = auth.currentUser;

    if (!user) return;

    try {

        const userRef = doc(db, "users", user.uid);

        const snap = await getDoc(userRef);

        if (snap.exists()) {

            const data = snap.data();

            const userName = document.getElementById("userName");

            if (userName) {

                userName.textContent = data.name;

            }

        }

    } catch (error) {

        console.error(error);

    }

}

// =======================================
// Latest Resources
// =======================================

async function loadLatestResources() {

    const container = document.getElementById("latestResources");

    if (!container) return;

    try {

        const q = query(
            collection(db, "resources"),
            orderBy("createdAt", "desc"),
            limit(5)
        );

        const snapshot = await getDocs(q);

        container.innerHTML = "";

        if (snapshot.empty) {

            container.innerHTML = "<p>No resources uploaded yet.</p>";

            return;

        }

        snapshot.forEach(doc => {

            const data = doc.data();

            container.innerHTML += `

                <div class="latest-item">

                    <strong>${data.title}</strong><br>

                    <small>${data.category}</small>

                </div>

            `;

        });

    }

    catch (error) {

        console.error(error);

        container.innerHTML = "<p>Unable to load resources.</p>";

    }

}

// =======================================
// Logout
// =======================================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        await signOut(auth);

        window.location.href = "login.html";

    });

}

// =======================================

auth.onAuthStateChanged((user) => {

    if (user) {

        loadUser();

        loadLatestResources();

    }

});
