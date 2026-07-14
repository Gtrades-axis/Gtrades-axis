import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const form = document.getElementById("resourceForm");
const chooseFileBtn =
document.getElementById("chooseFileBtn");

const filePicker =
document.getElementById("resourceFilePicker");

const filenameBox =
document.getElementById("resourceFile");


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

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}