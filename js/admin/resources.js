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

    const filename = document.getElementById("resourceFileName").value;

    const premiumOnly = document.getElementById("premiumOnly").checked;

    const link =
`https://gtrades-axis.github.io/Gtrades-axis/resources/${category}/${filename}`;

    await addDoc(collection(db,"resources"),{

        title,

        category,

        description,

        premiumOnly,

        filename,

        link,

        createdAt:serverTimestamp()

    });

    alert("Resource Added Successfully!");

    form.reset();

});