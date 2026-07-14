import { db } from "../firebase.js";

import {

collection,
getDocs,
addDoc,
serverTimestamp,
doc,
deleteDoc

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
/* ===================================
ELEMENTS
=================================== */

const form=document.getElementById("resourceForm");

const container=document.getElementById("latestResources");

const search=document.getElementById("resourceSearch");

let resources=[];

/* ===================================
LOAD
=================================== */

await loadResources();

updateResourceCounter();
/* ===================================
UPLOAD
=================================== */

if(form){

form.addEventListener("submit",async(e)=>{

e.preventDefault();

const title=document.getElementById("resourceTitle").value;

const category=document.getElementById("resourceCategory").value;

const description=document.getElementById("resourceDescription").value;

const link=document.getElementById("resourceLink").value;

const premium=document.getElementById("premiumOnly").checked;

await addDoc(collection(db,"resources"),{

title,

category,

description,

link:link.trim(),

premiumOnly:premium,

createdAt:serverTimestamp()

});
});

alert("Resource Uploaded Successfully.");

form.reset();

loadResources();

});

/* ===================================
LOAD RESOURCES
=================================== */

async function loadResources(){

resources=[];

const snapshot=await getDocs(collection(db,"resources"));

snapshot.forEach(doc=>{

resources.push({
 updateResourceCounter();   

id:doc.id,

...doc.data()

});

});

renderResources();

}

/* ===================================
DISPLAY
=================================== */

function renderResources(){

if(!container) return;

container.innerHTML="";

if(resources.length===0){

container.innerHTML=`

<div class="empty-card">

No Resources Uploaded

</div>

`;

return;

}

resources.forEach(resource=>{

container.innerHTML+=`

<div class="admin-resource">

<div>

<h3>

${resource.title}

</h3>

<p>

${resource.category}

</p>

</div>

<div>

<a

href="${resource.link || '#'}"

target="_blank"

class="view-btn">

Open

</a>

<button

class="delete-btn"

data-id="${resource.id}">

Delete

</button>

</div>

</div>

`;

});

attachDelete();

}
/* ===================================
PART 5B
SEARCH + DELETE + STATS
=================================== */

/* ===================================
SEARCH
=================================== */

if(search){

search.addEventListener("input",()=>{

const value=search.value.toLowerCase();

const filtered=resources.filter(resource=>{

return(

(resource.title || "").toLowerCase().includes(value) ||

(resource.category || "").toLowerCase().includes(value) ||

(resource.description || "").toLowerCase().includes(value)

);

});

renderFiltered(filtered);

});

}

/* ===================================
RENDER FILTERED
=================================== */

function renderFiltered(list){

container.innerHTML="";

if(list.length===0){

container.innerHTML=`

<div class="empty-card">

No matching resources found.

</div>

`;

return;

}

list.forEach(resource=>{

container.innerHTML+=`

<div class="admin-resource">

<div>

<h3>${resource.title}</h3>

<p>${resource.category}</p>

<small>${resource.description || ""}</small>

</div>

<div class="resource-actions">

href="${resource.link || '#'}"

target="_blank"

class="view-btn">

Open

</a>

<button

class="delete-btn"

data-id="${resource.id}">

Delete

</button>

</div>

</div>

`;

});

attachDelete();

}

/* ===================================
DELETE BUTTONS
=================================== */

function attachDelete(){

document.querySelectorAll(".delete-btn")

.forEach(button=>{

button.onclick=async()=>{

const id=button.dataset.id;

const confirmDelete=confirm(

"Delete this resource permanently?"

);

if(!confirmDelete) return;

await deleteDoc(doc(db,"resources",id));

loadResources();

updateResourceCounter();

alert("Resource Deleted.");

};

});

}

/* ===================================
RESOURCE COUNTER
=================================== */

function updateResourceCounter(){

const count=document.getElementById("resourceCount");

const overview=document.getElementById("resourceOverview");

if(count) count.textContent=resources.length;

if(overview) overview.textContent=resources.length;

}

/* ===================================
AUTO REFRESH
=================================== */

setInterval(()=>{

loadResources();

},30000);
}