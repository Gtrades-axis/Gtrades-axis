import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const container = document.getElementById("resourcesContainer");

const searchInput = document.getElementById("searchInput");

const filterButtons = document.querySelectorAll(".filter-btn");

let resources = [];

let currentCategory = "All";

async function loadResources(){

    const snapshot = await getDocs(collection(db,"resources"));

    resources = [];

    snapshot.forEach(doc=>{

        resources.push({
            id:doc.id,
            ...doc.data()
        });

    });

    displayResources();

}

function displayResources(){

    container.innerHTML = "";

    let filtered = resources.filter(resource=>{

        const categoryMatch =
            currentCategory==="All" ||
            resource.category===currentCategory;

        const searchMatch =
            resource.title.toLowerCase()
            .includes(searchInput.value.toLowerCase());

        return categoryMatch && searchMatch;

    });

    if(filtered.length===0){

        container.innerHTML=`

        <div class="empty-state">

            <h3>No resources found.</h3>

        </div>

        `;

        return;

    }

    filtered.forEach(resource=>{

        container.innerHTML+=`

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

searchInput.addEventListener("input",displayResources);

filterButtons.forEach(button=>{

    button.addEventListener("click",()=>{

        filterButtons.forEach(btn=>btn.classList.remove("active"));

        button.classList.add("active");

        currentCategory=button.dataset.category;

        displayResources();

    });

});

loadResources();