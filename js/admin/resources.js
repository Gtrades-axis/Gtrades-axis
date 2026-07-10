import { db } from "../firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const form = document.getElementById("resourceForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const title = document.getElementById("resourceTitle").value.trim();

    const category = document.getElementById("resourceCategory").value;

    const description = document.getElementById("resourceDescription").value.trim();

    const filename = document.getElementById("resourceFileName").value.trim();

    const premiumOnly = document.getElementById("premiumOnly").checked;

    if (!filename) {
        alert("Enter the filename.");
        return;
    }

    // Build GitHub Pages download link automatically
    const link =
        `https://gtrades-axis.github.io/Gtrades-axis/resources/${category}/${filename}`;

    await addDoc(collection(db, "resources"), {

        title,
        category,
        description,
        filename,
        link,
        premiumOnly,
        createdAt: serverTimestamp()

    });

    alert("Resource Added Successfully!");

    form.reset();

});
