import { auth, db } from "./firebase.js";

import {
    signOut,
    onAuthStateChanged
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

/* ==========================================
ELEMENTS
========================================== */

const logoutBtn = document.getElementById("logoutBtn");

const userName = document.getElementById("userName");

const resourceCount = document.getElementById("resourceCount");

const lessonCount = document.getElementById("lessonCount");

const videoCount = document.getElementById("videoCount");

const latestResources = document.getElementById("latestResources");

const announcements = document.getElementById("announcements");

/* ==========================================
AUTH
========================================== */

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;

    }

    try {

        const userRef = doc(db, "users", user.uid);

        const snap = await getDoc(userRef);

        if (snap.exists()) {

            const data = snap.data();

            userName.textContent =
                data.firstName || data.name || "Trader";

        } else {

            userName.textContent = "Trader";

        }

    } catch (e) {

        console.error(e);

    }

    loadDashboard();

});

/* ==========================================
LOGOUT
========================================== */

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        if (!confirm("Logout?")) return;

        try {

            await signOut(auth);

            location.href = "login.html";

        }

        catch (e) {

            console.error(e);

            alert(e.message);

        }

    });

}

/* ==========================================
LOAD DASHBOARD
========================================== */

async function loadDashboard() {

    await Promise.all([

        loadResources(),

        loadAcademy(),

        loadVideos(),

        loadLatestResources(),

        loadAnnouncements()

    ]);

}
/* ==========================================
RESOURCE COUNT
========================================== */

async function loadResources() {

    try {

        const snapshot = await getDocs(collection(db, "resources"));

        resourceCount.textContent = snapshot.size;

    }

    catch (e) {

        console.error(e);

        resourceCount.textContent = "0";

    }

}

/* ==========================================
ACADEMY COUNT
========================================== */

async function loadAcademy() {

    try {

        const snapshot = await getDocs(collection(db, "academy"));

        lessonCount.textContent = snapshot.size;

    }

    catch (e) {

        console.error(e);

        lessonCount.textContent = "0";

    }

}

/* ==========================================
VIDEO COUNT
========================================== */

async function loadVideos() {

    try {

        const snapshot = await getDocs(collection(db, "videos"));

        videoCount.textContent = snapshot.size;

    }

    catch (e) {

        console.error(e);

        videoCount.textContent = "0";

    }

}

/* ==========================================
LATEST RESOURCES
========================================== */

async function loadLatestResources() {

    try {

        const q = query(

            collection(db, "resources"),

            orderBy("createdAt", "desc"),

            limit(5)

        );

        const snapshot = await getDocs(q);

        latestResources.innerHTML = "";

        if (snapshot.empty) {

            latestResources.innerHTML = `

            <div class="loading-card">

                No Resources Available

            </div>

            `;

            return;

        }

        snapshot.forEach(docSnap => {

            const resource = docSnap.data();

            latestResources.innerHTML += `

<div class="resource-item">

<div class="resource-left">

<h3>${resource.title}</h3>

<p>${resource.description || "Premium Resource"}</p>

</div>

<a

href="${resource.link}"

target="_blank"

class="resource-download">

Download

</a>

</div>

`;

        });

    }

    catch (e) {

        console.error(e);

    }

}
/* ==========================================
ANNOUNCEMENTS
========================================== */

async function loadAnnouncements() {

    try {

        const q = query(
            collection(db, "announcements"),
            orderBy("createdAt", "desc"),
            limit(5)
        );

        const snapshot = await getDocs(q);

        announcements.innerHTML = "";

        if (snapshot.empty) {

            announcements.innerHTML = `

            <div class="announcement">

                <h4>No Announcements</h4>

                <p>You're all caught up.</p>

            </div>

            `;

            return;

        }

        snapshot.forEach(docSnap => {

            const notice = docSnap.data();

            announcements.innerHTML += `

<div class="announcement">

<h4>${notice.title}</h4>

<p>${notice.message}</p>

</div>

`;

        });

    }

    catch (e) {

        console.error(e);

        announcements.innerHTML = `

        <div class="announcement">

            <h4>Error</h4>

            <p>Failed to load announcements.</p>

        </div>

        `;

    }

}

/* ==========================================
AUTO REFRESH
========================================== */

setInterval(() => {

    loadLatestResources();

    loadAnnouncements();

}, 60000);

/* ==========================================
MOBILE SIDEBAR
========================================== */

const sidebar = document.querySelector(".sidebar");

const mobileToggle = document.querySelector(".mobile-toggle");

if (mobileToggle) {

    mobileToggle.addEventListener("click", () => {

        sidebar.classList.toggle("active");

    });

}

/* ==========================================
ACTIVE MENU
========================================== */

document.querySelectorAll(".menu li a").forEach(link => {

    if (link.href === window.location.href) {

        link.parentElement.classList.add("active");

    }

});

/* ==========================================
SMOOTH PAGE LOAD
========================================== */

window.addEventListener("load", () => {

    document.body.style.opacity = "1";

});

/* ==========================================
CONSOLE
========================================== */

console.log("===================================");

console.log("GTRADES-AXIS Student Dashboard");

console.log("Dashboard Loaded Successfully");

console.log("===================================");