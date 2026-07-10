import { db } from "../firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const form = document.getElementById("resourceForm");
const table = document.getElementById("resourcesTable");

// =======================
// SAVE RESOURCE
// =======================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const title = document.getElementById("resourceTitle").value.trim();

    const category = document.getElementById("resourceCategory").value;

    const description = document.getElementById("resourceDescription").value.trim();

    const filename = document.getElementById("resourceFileName").value.trim();

    const premiumOnly = document.getElementById("premiumOnly").checked;

    // Automatic GitHub Pages link
    const link =
`https://gtrades-axis.github.io/Gtrades-axis/resources/${category}/${filename}`;

    await addDoc(collection(db, "resources"), {

        title,

        category,

        description,

        filename,

        premiumOnly,

        link,

        createdAt: serverTimestamp()

    });

    alert("✅ Resource Added Successfully!");

    form.reset();

    loadResources();

});

// =======================
// LOAD RESOURCES
// =======================

async function loadResources() {

    table.innerHTML = "";

    const snapshot = await getDocs(collection(db, "resources"));

    snapshot.forEach((resource) => {

        const data = resource.data();

        table.innerHTML += `

        <tr>

            <td>${data.title}</td>

            <td>${data.category}</td>

            <td>${data.premiumOnly ? "⭐ Premium" : "Free"}</td>

            <td>

                <a href="${data.link}" target="_blank">

                    View

                </a>

                &nbsp;

                <button
                    class="deleteResource"
                    data-id="${resource.id}">

                    Delete

                </button>

            </td>

        </tr>

        `;

    });

    attachDeleteButtons();

}

// =======================
// DELETE RESOURCE
// =======================

function attachDeleteButtons() {

    document.querySelectorAll(".deleteResource").forEach(btn => {

        btn.onclick = async () => {

            if (!confirm("Delete this resource?")) return;

            await deleteDoc(doc(db, "resources", btn.dataset.id));

            loadResources();

        };

    });

}

loadResources();