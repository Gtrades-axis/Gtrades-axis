import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const container = document.getElementById("resourcesContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");

let resources = [];
let currentCategory = "All";

async function loadResources(){

    const q = query(
        collection(db,"resources"),
        orderBy("createdAt","desc")
    );

    const snapshot = await getDocs(q);

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

    const filtered = resources.filter(resource=>{

        const categoryMatch =
            currentCategory==="All" ||
            resource.category===currentCategory;

        const searchMatch =
            (resource.title || "")
            .toLowerCase()
            .includes((searchInput?.value || "").toLowerCase());

        return categoryMatch && searchMatch;

    });

    if(filtered.length===0){

        container.innerHTML = `
            <div class="empty-state">
                <h2>No Resources Found</h2>
                <p>No resources available.</p>
            </div>
        `;

        return;

    }

    filtered.forEach(resource=>{

        let icon="📄";

        switch(resource.category){

            case "Indicator":
                icon="📈";
                break;

            case "Journal":
                icon="📒";
                break;

            case "Strategy":
                icon="🎯";
                break;

            case "Video":
                icon="🎥";
                break;

            default:
                icon="📄";

        }

        container.innerHTML += `

        <div class="resource-card">

            <div class="resource-header">

                <span class="resource-icon">${icon}</span>

                ${resource.premiumOnly
                    ? '<span class="premium-badge">PREMIUM</span>'
                    : ''}

            </div>

            <h3>${resource.title}</h3>

            <p>${resource.description || ""}</p>

            <a class="download-btn"
               href="${resource.link}"
               target="_blank">

                📥 Download

            </a>

        </div>

        `;

    });

}

if(searchInput){

    searchInput.addEventListener("input",displayResources);

}

filterButtons.forEach(button=>{

    button.addEventListener("click",()=>{

        filterButtons.forEach(btn=>btn.classList.remove("active"));

        button.classList.add("active");

        currentCategory=button.dataset.category;

        displayResources();

    });

});

loadResources();