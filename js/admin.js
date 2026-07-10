import { db } from "../firebase.js";

import {
collection,
addDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const form=document.getElementById("resourceForm");

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

alert("Resource Added Successfully.");

form.reset();

});