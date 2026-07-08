import { db } from "./firebase.js";

import {
collection,
addDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const form=document.getElementById("resourceForm");

if(form){

form.addEventListener("submit",publishResource);

}

async function publishResource(e){

e.preventDefault();

try{

await addDoc(collection(db,"resources"),{

title:document.getElementById("resourceTitle").value,

category:document.getElementById("resourceCategory").value,

description:document.getElementById("resourceDescription").value,

downloadURL:document.getElementById("resourceURL").value,

thumbnail:document.getElementById("resourceImage").value,

premium:document.getElementById("resourcePremium").checked,

createdAt:serverTimestamp()

});

alert("✅ Resource Published Successfully");

form.reset();

}catch(error){

alert(error.message);

}

}
