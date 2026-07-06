import { db } from "./firebase.js";

import {

collection,

getDocs,

orderBy,

query

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const container=document.getElementById("resourceContainer");

async function loadResources(){

const q=query(

collection(db,"resources"),

orderBy("createdAt","desc")

);

const snapshot=await getDocs(q);

container.innerHTML="";
import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const container = document.getElementById("resourceContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");

let resources = [];
let selectedCategory = "All";

// =============================
// Load Resources
// =============================

async function loadResources() {

    try {

        const q = query(
            collection(db, "resources"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        resources = [];

        snapshot.forEach(doc => {

            resources.push({
                id: doc.id,
                ...doc.data()
            });

        });

        displayResources();

    }

    catch (error) {

        console.error(error);

        container.innerHTML = `

        <div class="resource-empty">

            <i class="fas fa-folder-open"></i>

            <h2>Unable to load resources</h2>

            <p>${error.message}</p>

        </div>

        `;

    }

}

// =============================
// Display Resources
// =============================

function displayResources() {

    const keyword = searchInput.value.toLowerCase();

    const filtered = resources.filter(resource => {

        const matchesSearch =
            resource.title.toLowerCase().includes(keyword) ||
            resource.description.toLowerCase().includes(keyword);

        const matchesCategory =
            selectedCategory === "All" ||
            resource.category === selectedCategory;

        return matchesSearch && matchesCategory;

    });

    container.innerHTML = "";

    if (filtered.length === 0) {

        container.innerHTML = `

        <div class="resource-empty">

            <i class="fas fa-search"></i>

            <h2>No Resources Found</h2>

            <p>Try another search or category.</p>

        </div>

        `;

        return;

    }

    filtered.forEach(resource => {

        container.innerHTML += `

        <div class="resource-card">

            <img
            src="${resource.thumbnail || "images/default-resource.jpg"}"
            class="resource-image">

            <div class="resource-content">

                <span class="category">

                    ${resource.category}

                </span>

                <h3>

                    ${resource.title}

                </h3>

                <p>

                    ${resource.description}

                </p>

                <a
                href="${resource.downloadURL}"
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

// =============================
// Search
// =============================

searchInput.addEventListener("input", displayResources);

// =============================
// Category Filter
// =============================

filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        filterButtons.forEach(btn => btn.classList.remove("active"));

        button.classList.add("active");

        selectedCategory = button.dataset.category;

        displayResources();

    });

});

// =============================

loadResources();
snapshot.forEach(doc=>{

const data=doc.data();

container.innerHTML+=`

<div class="resource-card">

<img

src="${
data.thumbnail ||
'https://placehold.co/600x350/0A84FF/FFFFFF?text=GTRADES'
}"

class="resource-image">

<div class="resource-content">

<span class="category">

${data.category}

</span>

<h3>

${data.title}

</h3>

<p>

${data.description}

</p>

<a

href="${data.downloadURL}"

target="_blank"

class="download-btn">

Download

</a>

</div>

</div>

`;

});

}

loadResources();
