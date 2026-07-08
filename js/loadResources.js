import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const container = document.getElementById("resourceContainer");

async function loadResources() {

    try {

        const q = query(
            collection(db, "resources"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        console.log("Documents found:", snapshot.size);

        container.innerHTML = "";

        if (snapshot.empty) {

            container.innerHTML = `
                <div class="resource-empty">
                    <h2>No Resources Available</h2>
                    <p>Resources will appear here once uploaded.</p>
                </div>
            `;

            return;

        }

        snapshot.forEach(doc => {

            const data = doc.data();

            console.log(data);

            container.innerHTML += `

                <div class="resource-card">

                    <img
                    src="${data.thumbnail || 'images/logo.png'}"
                    class="resource-image">

                    <div class="resource-content">

                        <span class="category">
                            ${data.category}
                        </span>

                        <h3>${data.title}</h3>

                        <p>${data.description}</p>

                        <a
                            href="${data.downloadURL}"
                            target="_blank"
                            class="download-btn">

                            <i class="fas fa-download"></i>

                            Download

                        </a>

                    </div>

                </div>

            `;

        });

    }

    catch (error) {

        console.error(error);

        container.innerHTML = `
            <div class="resource-empty">
                <h2>Error Loading Resources</h2>
                <p>${error.message}</p>
            </div>
        `;

    }

}

loadResources();