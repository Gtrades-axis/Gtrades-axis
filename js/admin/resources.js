import { db } from "../firebase.js";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp,
    doc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ===================================
ELEMENTS
=================================== */

const form = document.getElementById("resourceForm");
const container = document.getElementById("latestResources");
const search = document.getElementById("resourceSearch");

let resources = [];

/* ===================================
INITIAL LOAD
=================================== */

loadResources();

/* ===================================
UPLOAD RESOURCE
=================================== */

if (form) {

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

       const title = document.getElementById("resourceTitle").value.trim();

const category = document.getElementById("resourceCategory").value;

const description = document.getElementById("resourceDescription").value.trim();

const filename = document.getElementById("resourceFile").value.trim();

const premiumOnly =
    document.getElementById("premiumOnly").checked;

let folder = "";

switch(category){

    case "PDF":
        folder = "pdf";
        break;

    case "Indicator":
        folder = "indicators";
        break;

    case "Journal":
        folder = "journals";
        break;

    case "Strategy":
        folder = "strategies";
        break;

    case "Video":
        folder = "videos";
        break;

}

const link =
`https://gtrades-axis.github.io/Gtrades-axis/resources/${folder}/${filename}`;

        try {

            await addDoc(collection(db, "resources"), {

                title,
                category,
                description,
                link,
                premiumOnly,
                createdAt: serverTimestamp()

            });

            alert("Resource uploaded successfully.");

            form.reset();

            await loadResources();

        } catch (err) {

            console.error(err);

            alert("Failed to upload resource.");

        }

    });

}

/* ===================================
LOAD RESOURCES
=================================== */

async function loadResources() {

    resources = [];

    try {

        const snapshot = await getDocs(collection(db, "resources"));

        snapshot.forEach(document => {

            resources.push({

                id: document.id,

                ...document.data()

            });

        });

        renderResources();

        updateResourceCounter();

    }

    catch (err) {

        console.error(err);

    }

}

/* ===================================
DISPLAY RESOURCES
=================================== */

function renderResources() {

    if (!container) return;

    container.innerHTML = "";

    if (resources.length === 0) {

        container.innerHTML = `

        <div class="empty-card">

            No resources uploaded.

        </div>

        `;

        return;

    }

    resources.forEach(resource => {

        container.innerHTML += `

        <div class="admin-resource">

            <div>

                <h3>${resource.title}</h3>

                <p>${resource.category}</p>

                <small>${resource.description || ""}</small>

            </div>

            <div class="resource-actions">

                <a
                    href="${resource.link}"
                    target="_blank"
                    class="view-btn">

                    Open

                </a>

                <button
                    class="delete-btn"
                    data-id="${resource.id}">

                    Delete

                </button>

            </div>

        </div>

        `;

    });

    attachDelete();

}/* ===================================
SEARCH
=================================== */

if (search) {

    search.addEventListener("input", () => {

        const value = search.value.toLowerCase();

        const filtered = resources.filter(resource => {

            return (

                (resource.title || "")
                .toLowerCase()
                .includes(value)

                ||

                (resource.category || "")
                .toLowerCase()
                .includes(value)

                ||

                (resource.description || "")
                .toLowerCase()
                .includes(value)

            );

        });

        renderFiltered(filtered);

    });

}

/* ===================================
RENDER FILTERED
=================================== */

function renderFiltered(list) {

    if (!container) return;

    container.innerHTML = "";

    if (list.length === 0) {

        container.innerHTML = `

        <div class="empty-card">

            No matching resources found.

        </div>

        `;

        return;

    }

    list.forEach(resource => {

        container.innerHTML += `

        <div class="admin-resource">

            <div>

                <h3>${resource.title}</h3>

                <p>${resource.category}</p>

                <small>${resource.description || ""}</small>

            </div>

            <div class="resource-actions">

                <a
                    href="${resource.link}"
                    target="_blank"
                    class="view-btn">

                    Open

                </a>

                <button
                    class="delete-btn"
                    data-id="${resource.id}">

                    Delete

                </button>

            </div>

        </div>

        `;

    });

    attachDelete();

}

/* ===================================
DELETE
=================================== */

function attachDelete() {

    document
    .querySelectorAll(".delete-btn")
    .forEach(button => {

        button.onclick = async () => {

            const id = button.dataset.id;

            const confirmDelete = confirm(

                "Delete this resource?"

            );

            if (!confirmDelete) return;

            try {

                await deleteDoc(
                    doc(db, "resources", id)
                );

                await loadResources();

            }

            catch (err) {

                console.error(err);

                alert("Failed to delete resource.");

            }

        };

    });

}

/* ===================================
COUNTER
=================================== */

function updateResourceCounter() {

    const count =
        document.getElementById("resourceCount");

    const overview =
        document.getElementById("resourceOverview");

    if (count)
        count.textContent = resources.length;

    if (overview)
        overview.textContent = resources.length;

}

/* ===================================
AUTO REFRESH
=================================== */

setInterval(async () => {

    await loadResources();

},30000);

console.log("Resources Manager Loaded");