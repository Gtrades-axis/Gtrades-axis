import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const container = document.getElementById("resourcesContainer");

async function loadResources(){

    const snapshot = await getDocs(collection(db,"resources"));

    container.innerHTML = "";

    snapshot.forEach(doc=>{

        const resource = doc.data();

        container.innerHTML += `

        <div class="resource-card">

            <h3>${resource.title}</h3>

            <p>${resource.category}</p>

            <a href="${resource.link}" target="_blank">

                Download

            </a>

        </div>

        `;

    });

}

loadResources();