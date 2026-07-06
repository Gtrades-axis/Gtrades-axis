import { auth } from "./firebase.js";

import {

onAuthStateChanged,

signOut

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// Wait for Firebase authentication state

onAuthStateChanged(auth,(user)=>{

// ---------- USER LOGGED IN ----------

if(user){

// Display user name if element exists

const userName=document.getElementById("userName");

if(userName){

userName.textContent=user.displayName || "Trader";

}

// Display email if element exists

const userEmail=document.getElementById("userEmail");

if(userEmail){

userEmail.textContent=user.email;

}

// Prevent logged-in users from seeing login pages

const page=window.location.pathname;

if(

page.includes("login.html") ||

page.includes("register.html") ||

page.includes("forgot-password.html")

){

window.location.href="dashboard.html";

}

}

// ---------- USER NOT LOGGED IN ----------

else{

const page=window.location.pathname;

const publicPages=[

"/",

"/index.html",

"/login.html",

"/register.html",

"/forgot-password.html"

];

const current=page.substring(page.lastIndexOf("/"));

if(

!publicPages.includes(current)

&& current!==""

){

window.location.href="login.html";

}

}

});

// ================= LOGOUT =================

const logoutBtn=document.getElementById("logoutBtn");

if(logoutBtn){

logoutBtn.addEventListener("click",()=>{

signOut(auth)

.then(()=>{

window.location.href="login.html";

})

.catch((error)=>{

alert(error.message);

});

});

}
