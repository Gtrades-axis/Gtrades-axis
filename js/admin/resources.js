import { db } from "../firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const form = document.getElementById("resourceForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const title = document.getElementById("resourceTitle").value;
    const category = document.getElementById("resourceCategory").value;
    const description = document.getElementById("resourceDescription").value;
    const link = document.getElementById("resourceLink").value;
    const premiumOnly = document.getElementById("premiumOnly").checked;

    await addDoc(collection(db, "resources"), {
        title,
        category,
        description,
        link,
        premiumOnly,
        createdAt: serverTimestamp()
    });

    alert("Resource added successfully.");

    form.reset();

});