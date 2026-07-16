import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* =====================================
ELEMENTS
===================================== */

const form = document.getElementById("resourceForm");

const chooseFileBtn =
document.getElementById("chooseFileBtn");

const filePicker =
document.getElementById("resourceFilePicker");

const filenameBox =
document.getElementById("resourceFile");

/* =====================================
FILE PICKER
===================================== */

console.log("Button:", chooseFileBtn);
console.log("Picker:", filePicker);
console.log("Textbox:", filenameBox);

if (chooseFileBtn && filePicker && filenameBox) {

    chooseFileBtn.addEventListener("click", () => {

        filePicker.click();

    });

    filePicker.addEventListener("change", () => {

        if (filePicker.files.length > 0) {

            filenameBox.value = filePicker.files[0].name;

        }

    });

}

/* =====================================
SUBMIT
===================================== */

if (form) {

    form.addEventListener("submit", publishResource);

}

/* =====================================
PUBLISH RESOURCE
===================================== */

async function publishResource(e) {

    e.preventDefault();

    const title =
        document.getElementById("resourceTitle").value.trim();

    const category =
        document.getElementById("resourceCategory").value;

    const description =
        document.getElementById("resourceDescription").value.trim();

    const filename =
        filenameBox.value.trim();

    const premiumOnly =
        document.getElementById("premiumOnly").checked;

    if (!filename) {

        alert("Please choose a file first.");

        return;

    }

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

        default:
            folder = "";
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

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}