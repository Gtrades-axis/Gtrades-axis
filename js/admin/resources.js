import { db, storage } from "../firebase.js";

import {

collection,

addDoc,

serverTimestamp

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {

ref,

uploadBytes,

getDownloadURL

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

const form=document.getElementById("resourceForm");

form.addEventListener("submit",async(e)=>{

e.preventDefault();

const file=document.getElementById("resourceFile").files[0];

if(!file){

alert("Choose a file");

return;

}

const storageRef=ref(storage,"resources/"+Date.now()+"_"+file.name);

await uploadBytes(storageRef,file);

const downloadURL=await getDownloadURL(storageRef);

await addDoc(collection(db,"resources"),{

title:document.getElementById("resourceTitle").value,

category:document.getElementById("resourceCategory").value,

description:document.getElementById("resourceDescription").value,

premiumOnly:document.getElementById("premiumOnly").checked,

fileName:file.name,

link:downloadURL,

createdAt:serverTimestamp()

});

alert("Resource uploaded successfully.");

form.reset();

});