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
