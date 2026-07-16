import { db } from "../firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* =====================================
ELEMENTS
===================================== */

const form = document.getElementById("resourceForm");
const container = document.getElementById("latestResources");
const search = document.getElementById("resourceSearch");

const chooseBtn = document.getElementById("chooseFileBtn");
const picker = document.getElementById("resourceFilePicker");
const filenameBox = document.getElementById("resourceFile");

let resources = [];

/* =====================================
FILE PICKER
===================================== */

if (chooseBtn && picker && filenameBox) {

    chooseBtn.addEventListener("click", () => {

        picker.click();

    });

    picker.addEventListener("change", () => {

        if (picker.files.length > 0) {

            filenameBox.value = picker.files[0].name;

        }

    });

}

/* =====================================
LOAD
===================================== */

loadResources();

/* =====================================
SAVE RESOURCE
===================================== */

if (form) {

    form.addEventListener("submit", publishResource);

}

async function publishResource(e) {

    e.preventDefault();

    const title = document.getElementById("resourceTitle").value.trim();

    const category = document.getElementById("resourceCategory").value;

    const description = document.getElementById("resourceDescription").value.trim();

    const filename = document.getElementById("resourceFile").value.trim();

    const premiumOnly = document.getElementById("premiumOnly").checked;

    let folder = "";

    switch (category) {

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

        alert("✅ Resource Published Successfully");

        form.reset();

        filenameBox.value = "";

        loadResources();

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}

/* =====================================
LOAD RESOURCES
===================================== */

async function loadResources() {

    resources = [];

    const snapshot = await getDocs(collection(db, "resources"));

    snapshot.forEach(docSnap => {

        resources.push({

            id: docSnap.id,
            ...docSnap.data()

        });

    });

    renderResources();

}

/* =====================================
DISPLAY
===================================== */

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

<div class="resource-card">

    <div class="resource-left">

        <div class="resource-icon">

            <i class="fa-solid fa-folder-open"></i>

        </div>

        <div>

            <h3>${resource.title}</h3>

            <p>${resource.description || "No description"}</p>

            <div class="resource-tags">

                <span>${resource.category}</span>

                ${
                    resource.premiumOnly
                    ? `<span class="premium-tag">Premium</span>`
                    : `<span class="free-tag">Free</span>`
                }

            </div>

        </div>

    </div>

    <div class="resource-right">

        <a

            href="${resource.link}"

            target="_blank"

            class="open-btn">

            <i class="fa-solid fa-eye"></i>

            Open

        </a>

        <button

            class="delete-btn"

            data-id="${resource.id}">

            <i class="fa-solid fa-trash"></i>

            Delete

        </button>

    </div>

</div>

`;

    });

    attachDelete();

}

function attachDelete() {

    document.querySelectorAll(".delete-btn").forEach(button => {

        button.addEventListener("click", async () => {

            if (!confirm("Delete this resource?")) return;

            await deleteDoc(doc(db, "resources", button.dataset.id));

            loadResources();

        });

    });

}