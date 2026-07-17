import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ==========================================
ELEMENTS
========================================== */

const logoutBtn = document.getElementById("logoutBtn");

const searchInput = document.getElementById("searchInput");

const container = document.getElementById("resourcesContainer");

const filterButtons =
document.querySelectorAll(".filter-btn");

let resources = [];

let currentCategory = "All";

/* ==========================================
AUTH
========================================== */

onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;

    }

    loadResources();

});

/* ==========================================
LOGOUT
========================================== */

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        if (!confirm("Logout?")) return;

        try {

            await signOut(auth);

            window.location.href = "login.html";

        }

        catch (e) {

            console.error(e);

        }

    });

}

/* ==========================================
LOAD RESOURCES
========================================== */

async function loadResources() {

    resources = [];

    const q = query(

        collection(db, "resources"),

        orderBy("createdAt", "desc")

    );

    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {

        resources.push({

            id: doc.id,

            ...doc.data()

        });

    });

    renderResources();

}
/* ==========================================
RENDER RESOURCES
========================================== */

function renderResources() {

    if (!container) return;

    container.innerHTML = "";

    let filtered = resources;

    /* CATEGORY FILTER */

    if (currentCategory !== "All") {

        filtered = filtered.filter(resource =>
            resource.category === currentCategory
        );

    }

    /* SEARCH */

    const keyword = searchInput.value.toLowerCase().trim();

    if (keyword !== "") {

        filtered = filtered.filter(resource =>

            resource.title.toLowerCase().includes(keyword) ||

            (resource.description || "")
            .toLowerCase()
            .includes(keyword)

        );

    }

    /* EMPTY */

    if (filtered.length === 0) {

        container.innerHTML = `

<div class="loading-card">

<h3>No resources found.</h3>

</div>

`;

        return;

    }

    /* CARDS */

    filtered.forEach(resource => {

        container.innerHTML += `

<div class="quick-card">

<div class="quick-icon">

<i class="fa-solid fa-folder-open"></i>

</div>

<h3>

${resource.title}

</h3>

<p>

${resource.description || "Premium Trading Resource"}

</p>

<div style="margin:15px 0;">

<span class="member-badge">

${resource.category}

</span>

${
resource.premiumOnly
?
`<span class="member-badge"
style="background:#e74c3c;margin-left:8px;">
Premium
</span>`
:
`<span class="member-badge"
style="background:#18b663;margin-left:8px;">
Free
</span>`
}

</div>

<a

href="${resource.link}"

target="_blank"

class="resource-download">

<i class="fa-solid fa-download"></i>

Download

</a>

</div>

`;

    });

}

/* ==========================================
SEARCH
========================================== */

if (searchInput) {

    searchInput.addEventListener("input", () => {

        renderResources();

    });

}

/* ==========================================
CATEGORY FILTERS
========================================== */

filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        document.querySelector(".filter-btn.active")
        ?.classList.remove("active");

        button.classList.add("active");

        currentCategory = button.dataset.category;

        renderResources();

    });

});
/* ==========================================
AUTO REFRESH
========================================== */

setInterval(async () => {

    try {

        await loadResources();

    }

    catch (e) {

        console.error("Auto Refresh Failed:", e);

    }

}, 60000);

/* ==========================================
LOADING STATE
========================================== */

function showLoading() {

    if (!container) return;

    container.innerHTML = `

    <div class="loading-card">

        <i class="fa-solid fa-spinner fa-spin"></i>

        <h3>Loading Premium Resources...</h3>

    </div>

    `;

}

/* ==========================================
ERROR STATE
========================================== */

function showError(message = "Failed to load resources.") {

    if (!container) return;

    container.innerHTML = `

    <div class="loading-card">

        <i class="fa-solid fa-triangle-exclamation"
        style="font-size:40px;color:#e74c3c;"></i>

        <h3>${message}</h3>

    </div>

    `;

}

/* ==========================================
INITIAL LOAD
========================================== */

(async function init() {

    try {

        showLoading();

        await loadResources();

    }

    catch (e) {

        console.error(e);

        showError();

    }

})();

/* ==========================================
PAGE VISIBILITY REFRESH
========================================== */

document.addEventListener("visibilitychange", async () => {

    if (!document.hidden) {

        try {

            await loadResources();

        }

        catch (e) {

            console.error(e);

        }

    }

});

/* ==========================================
DEBUG
========================================== */

console.log("======================================");

console.log("GTRADES-AXIS™ Premium Resources Loaded");

console.log("======================================");