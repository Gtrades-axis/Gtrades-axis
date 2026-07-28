import { auth, db } from "./firebase.js";

import {

onAuthStateChanged,

signOut

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {

doc,

getDoc

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const userName=document.getElementById("userName");
const userEmail=document.getElementById("userEmail");
const userRole=document.getElementById("userRole");
const memberBadge=document.getElementById("memberBadge");
const memberSince=document.getElementById("memberSince");
const academyProgress=document.getElementById("academyProgress");
const studyTime=document.getElementById("studyTime");
const logoutBtn=document.getElementById("logoutBtn");

academyProgress.textContent=localStorage.getItem("academyProgress") || "0%";

studyTime.textContent=localStorage.getItem("studyTime") || "0 hrs";

onAuthStateChanged(auth,async(user)=>{

if(!user){

window.location.href="login.html";

return;

}

const snap=await getDoc(doc(db,"users",user.uid));

if(!snap.exists()) return;

const data=snap.data();

userName.textContent=data.name || "Member";

userEmail.textContent=data.email;

userRole.textContent=(data.role || "member").toUpperCase();

if(data.role==="admin"){

memberBadge.textContent="ADMIN";

memberBadge.style.background="#ef4444";

}

else if(data.role==="premium"){

memberBadge.textContent="PREMIUM";

memberBadge.style.background="#22c55e";

}

else{

memberBadge.textContent="FREE";

memberBadge.style.background="#f59e0b";

}

if(data.createdAt?.toDate){

memberSince.textContent="Joined: "+data.createdAt.toDate().toLocaleDateString();

}

});

logoutBtn.addEventListener("click",async(e)=>{

e.preventDefault();

await signOut(auth);

window.location.href="login.html";

});