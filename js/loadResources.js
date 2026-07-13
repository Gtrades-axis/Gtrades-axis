import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const container = document.getElementById("resourcesContainer");

const searchInput = document.getElementById("searchInput");

const filterButtons = document.querySelectorAll(".filter-btn");

let resources = [];

let currentCategory = "All";

// ======================
// LOAD RESOURCES
// ======================

async function loadResources() {

    const q = query(
        collection(db, "resources"),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    resources = [];

    snapshot.forEach(doc => {

        resources.push({
            id: doc.id,
            ...doc.data()
        });

    });

    displayResources();

}

// ======================
// DISPLAY
// ======================

function displayResources() {

    container.innerHTML = "";

    const filtered = resources.filter(resource => {

        const categoryMatch =
            currentCategory === "All" ||
            resource.category === currentCategory;

        const searchMatch =
            resource.title
            .toLowerCase()
            .includes(searchInput.value.toLowerCase());

        return categoryMatch && searchMatch;

    });

    if (filtered.length === 0) {

        container.innerHTML = `

        <div class="empty-state">

            <h2>No Resources Found</h2>

            <p>No resources have been uploaded yet.</p>

        </div>

        `;

        return;

    }

    filtered.forEach(resource => {

        let icon = "📄";

        if(resource.category==="indicators") icon="📈";

        if(resource.category==="journals") icon="📒";

        if(resource.category==="strategies") icon="🎯";

        if(resource.category==="videos") icon="🎥";

        container.innerHTML += `

        <div class="resource-card">

            <div class="resource-header">

                <span class="resource-icon">

                    ${icon}

                </span>

                ${resource.premiumOnly ?

                `<span class="premium-badge">

                    PREMIUM

                </span>`

                : ""}

            </div>

            <h3>

                ${resource.title}

            </h3>

            <p>

                ${resource.description || ""}

            </p>

            <div class="resource-footer">

                <span>

                    ${resource.category.toUpperCase()}

                </span>

                <a
                   <p style="color:red;font-size:12px;">
${resource.link}
</p>

<a href="${resource.link}" target="_blank">
    Download
</a>
                </a>

            </div>

        </div>

        `;

    });

}

// ======================
// SEARCH
// ======================

searchInput.addEventListener("input", displayResources);

// ======================
// FILTERS
// ======================

filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        filterButtons.forEach(btn =>
            btn.classList.remove("active"));

        button.classList.add("active");

        currentCategory = button.dataset.category;

        displayResources();

    });

});

loadResources();
