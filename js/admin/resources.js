import { db } from "../firebase.js";

import {

collection,
addDoc,
getDocs,
deleteDoc,
doc,
serverTimestamp,
query,
orderBy

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ===========================
ELEMENTS
=========================== */

const form=document.getElementById("resourceForm");

const list=document.getElementById("latestResources");

/* ===========================
LOAD
=========================== */

loadResources();

async function loadResources(){

    if(!list) return;

    list.innerHTML="Loading...";

    const q=query(

        collection(db,"resources"),

        orderBy("createdAt","desc")

    );

    const snapshot=await getDocs(q);

    if(snapshot.empty){

        list.innerHTML=`

        <div class="empty-card">

            No resources uploaded.

        </div>

        `;

        return;

    }

    list.innerHTML="";

    snapshot.forEach(resource=>{

        const data=resource.data();

        list.innerHTML+=`

        <div class="resource-item">

            <div>

                <strong>

                    ${data.title}

                </strong>

                <br>

                <small>

                    ${data.category}

                </small>

            </div>

            <div class="resource-actions">

                <a

                href="${data.link}"

                target="_blank"

                class="preview-btn">

                Open

                </a>

                <button

                class="delete-resource"

                data-id="${resource.id}">

                Delete

                </button>

            </div>

        </div>

        `;

    });

    attachDeleteButtons();

}

/* ===========================
SAVE
=========================== */

if(form){

form.addEventListener("submit",async(e)=>{

e.preventDefault();

await addDoc(collection(db,"resources"),{

title:document.getElementById("resourceTitle").value,

category:document.getElementById("resourceCategory").value,

description:document.getElementById("resourceDescription").value,

link:document.getElementById("resourceLink").value,

premiumOnly:document.getElementById("premiumOnly").checked,

createdAt:serverTimestamp()

});

alert("Resource Saved.");

form.reset();

loadResources();

});

}
/* ===========================================
PART 5B
DELETE • SEARCH • FILTER
=========================================== */

/* ==========================
DELETE RESOURCE
========================== */

function attachDeleteButtons(){

    const buttons=document.querySelectorAll(".delete-resource");

    buttons.forEach(button=>{

        button.addEventListener("click",async()=>{

            const id=button.dataset.id;

            const confirmDelete=confirm(

                "Delete this resource permanently?"

            );

            if(!confirmDelete) return;

            await deleteDoc(

                doc(db,"resources",id)

            );

            alert("Resource Deleted Successfully.");

            loadResources();

        });

    });

}

/* ==========================
SEARCH
========================== */

const resourceSearch=document.getElementById("resourceSearch");

if(resourceSearch){

resourceSearch.addEventListener("keyup",()=>{

const value=resourceSearch.value.toLowerCase();

document.querySelectorAll(".resource-item")

.forEach(card=>{

const text=card.innerText.toLowerCase();

card.style.display=

text.includes(value)

?"flex"

:"none";

});

});

}

/* ==========================
CATEGORY FILTER
========================== */

const categoryFilter=document.getElementById("resourceFilter");

if(categoryFilter){

categoryFilter.addEventListener("change",()=>{

const value=categoryFilter.value;

document.querySelectorAll(".resource-item")

.forEach(card=>{

const category=

card.querySelector("small")

.innerText;

if(

value==="All" ||

category===value

){

card.style.display="flex";

}else{

card.style.display="none";

}

});

});

}

/* ==========================
COPY LINK
========================== */

document.addEventListener("click",(e)=>{

if(e.target.classList.contains("copy-link")){

navigator.clipboard.writeText(

e.target.dataset.link

);

alert("Link Copied.");

}

});

/* ==========================
RESOURCE COUNT
========================== */

async function updateResourceCounter(){

const snapshot=await getDocs(

collection(db,"resources")

);

const total=snapshot.size;

const counter=document.getElementById("resourceCount");

if(counter){

counter.textContent=total;

}

}

updateResourceCounter();

/* ==========================
AUTO REFRESH
========================== */

setInterval(()=>{

loadResources();

updateResourceCounter();

},30000);

console.log("Resources Manager Loaded");