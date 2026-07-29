/* ==========================================================
GTRADES-AXIS™
ADMIN MEMBERS
PART 3A (JS)
========================================================== */

import { auth, db } from "./firebase.js";

import {
signOut,
onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import{

collection,
getDocs,
doc,
updateDoc,
deleteDoc,
onSnapshot

}
from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ==========================================================
ELEMENTS
========================================================== */

const membersGrid=document.getElementById("membersGrid");

const totalMembers=document.getElementById("totalMembers");

const freeMembers=document.getElementById("freeMembers");

const premiumMembers=document.getElementById("premiumMembers");

const adminMembers=document.getElementById("adminMembers");

const suspendedMembers=document.getElementById("suspendedMembers");

const searchInput=document.getElementById("searchInput");

const roleFilter=document.getElementById("roleFilter");

const statusFilter=document.getElementById("statusFilter");

const logoutBtn=document.getElementById("logoutBtn");

/* ==========================================================
MODAL
========================================================== */

const modal=document.getElementById("memberModal");

const closeModal=document.getElementById("closeModal");

const modalName=document.getElementById("modalName");

const modalEmail=document.getElementById("modalEmail");

const modalRole=document.getElementById("modalRole");

const modalStatus=document.getElementById("modalStatus");

const modalPayment=document.getElementById("modalPayment");

const modalJoined=document.getElementById("modalJoined");

const makeFree=document.getElementById("makeFree");

const makePremium=document.getElementById("makePremium");

const makeAdmin=document.getElementById("makeAdmin");

const suspendUser=document.getElementById("suspendUser");

const deleteUser=document.getElementById("deleteUser");

/* ==========================================================
VARIABLES
========================================================== */

let members=[];

let selectedUser=null;

let currentAdmin=null;

/* ==========================================================
AUTH
========================================================== */

onAuthStateChanged(auth,user=>{

if(!user){

window.location="login.html";

return;

}

currentAdmin=user.uid;

loadMembers();

});

/* ==========================================================
LOGOUT
========================================================== */

logoutBtn.onclick=async()=>{

if(!confirm("Logout?")) return;

await signOut(auth);

window.location="login.html";

};

/* ==========================================================
LOAD MEMBERS
========================================================== */

function loadMembers(){

onSnapshot(

collection(db,"users"),

(snapshot)=>{

members=[];

snapshot.forEach(docSnap=>{

members.push({

id:docSnap.id,

...docSnap.data()

});

});

renderMembers();

}

);

}

/* ==========================================================
RENDER
========================================================== */

function renderMembers(){

membersGrid.innerHTML="";

let total=0;

let free=0;

let premium=0;

let admin=0;

let suspended=0;

const search=searchInput.value.toLowerCase();

const role=roleFilter.value;

const status=statusFilter.value;

members.forEach(member=>{

const name=(member.name||"").toLowerCase();

const email=(member.email||"").toLowerCase();

if(

!name.includes(search)

&&

!email.includes(search)

){

return;

}

if(

role!="all"

&&

member.role!==role

){

return;

}

if(

status!="all"

&&

member.accountStatus!==status

){

return;

}

total++;

if(member.role==="free") free++;

if(member.role==="premium") premium++;

if(member.role==="admin") admin++;

if(member.accountStatus==="suspended") suspended++;

let badge="role-free";

let badgeText="FREE";

if(member.role==="premium"){

badge="role-premium";

badgeText="⭐ PREMIUM";

}

if(member.role==="admin"){

badge="role-admin";

badgeText="🛡 ADMIN";

}

const joined=

member.createdAt?.toDate?.()

?member.createdAt.toDate().toLocaleDateString()

:"-";

const card=document.createElement("div");

card.className="member-card";

card.innerHTML=`

<div class="member-top">

<div class="member-avatar">

<i class="fa-solid fa-user"></i>

</div>

<div class="member-info">

<h3>${member.name||"Unknown"}</h3>

<p>${member.email||""}</p>

<span class="role-badge ${badge}">

${badgeText}

</span>

</div>

</div>

<div class="status">

<div>

<span>Status</span><br>

<b>

${member.accountStatus||"active"}

</b>

</div>

<div>

<span>Payment</span><br>

<b>

${member.paymentStatus||"unpaid"}

</b>

</div>

<div>

<span>Joined</span><br>

<b>

${joined}

</b>

</div>

</div>

<div class="card-buttons">

<button class="view-btn">

View

</button>

<button class="free-btn">

Free

</button>

<button class="premium-btn">

Premium

</button>

<button class="admin-btn">

Admin

</button>

<button class="suspend-btn">

${member.accountStatus==="suspended"

?"Activate"

:"Suspend"}

</button>

<button class="delete-btn">

Delete

</button>

</div>

`;

membersGrid.appendChild(card);
/* ==========================================================
CONTINUE FROM PART 3A
PART 3B
========================================================== */

        /* ===========================
        VIEW BUTTON
        =========================== */

        card.querySelector(".view-btn").onclick=()=>{

            selectedUser=member;

            modal.style.display="flex";

            modalName.textContent=member.name||"-";

            modalEmail.textContent=member.email||"-";

            modalRole.textContent=member.role||"free";

            modalStatus.textContent=member.accountStatus||"active";

            modalPayment.textContent=member.paymentStatus||"unpaid";

            modalJoined.textContent=joined;

            // Hide role buttons for yourself

            if(member.uid===currentAdmin){

                makeFree.style.display="none";

                makePremium.style.display="none";

                makeAdmin.style.display="none";

                suspendUser.style.display="none";

                deleteUser.style.display="none";

            }else{

                makeFree.style.display="block";

                makePremium.style.display="block";

                makeAdmin.style.display="block";

                suspendUser.style.display="block";

                deleteUser.style.display="block";

            }

        };

    });

    /* ===========================
    UPDATE STATS
    =========================== */

    totalMembers.innerText=total;

    freeMembers.innerText=free;

    premiumMembers.innerText=premium;

    adminMembers.innerText=admin;

    suspendedMembers.innerText=suspended;

}

/* ==========================================================
CHANGE ROLE
========================================================== */

async function changeRole(role){

if(!selectedUser) return;

try{

await updateDoc(

doc(db,"users",selectedUser.id),

{

role:role

}

);

modal.style.display="none";

}
catch(err){

console.error(err);

alert(err.message);

}

}

/* ==========================================================
MAKE FREE
========================================================== */

makeFree.onclick=()=>{

if(confirm("Make this user Free?")){

changeRole("free");

}

};

/* ==========================================================
MAKE PREMIUM
========================================================== */

makePremium.onclick=()=>{

if(confirm("Upgrade to Premium?")){

changeRole("premium");

}

};

/* ==========================================================
MAKE ADMIN
========================================================== */

makeAdmin.onclick=()=>{

if(confirm("Promote to Administrator?")){

changeRole("admin");

}

};

/* ==========================================================
SUSPEND / ACTIVATE
========================================================== */

suspendUser.onclick=async()=>{

if(!selectedUser) return;

const status=

selectedUser.accountStatus==="suspended"

?

"active"

:

"suspended";

try{

await updateDoc(

doc(db,"users",selectedUser.id),

{

accountStatus:status

}

);

modal.style.display="none";

}
catch(err){

console.error(err);

}

};

/* ==========================================================
DELETE USER
========================================================== */

deleteUser.onclick=async()=>{

if(!selectedUser) return;

if(

!confirm(

"Delete this member permanently?"

)

)

return;

try{

await deleteDoc(

doc(db,"users",selectedUser.id)

);

modal.style.display="none";

}
catch(err){

console.error(err);

alert(err.message);

}

};

/* ==========================================================
SEARCH
========================================================== */

searchInput.addEventListener(

"input",

renderMembers

);

/* ==========================================================
ROLE FILTER
========================================================== */

roleFilter.addEventListener(

"change",

renderMembers

);

/* ==========================================================
STATUS FILTER
========================================================== */

statusFilter.addEventListener(

"change",

renderMembers

);

/* ==========================================================
CLOSE MODAL
========================================================== */

closeModal.onclick=()=>{

modal.style.display="none";

};

window.onclick=(e)=>{

if(e.target===modal){

modal.style.display="none";

}

};

/* ==========================================================
CONSOLE
========================================================== */

console.log("===================================");

console.log("GTRADES-AXIS™ Members Management");

console.log("Loaded Successfully");

console.log("===================================");
/* ==========================================================
GTRADES-AXIS™
ADMIN MEMBERS
PART 4
========================================================== */

/* ==========================================
AUTO REFRESH COUNTS
========================================== */

setInterval(() => {

    renderMembers();

}, 10000);

/* ==========================================
MEMBER SORTING
========================================== */

function sortMembers(type){

    switch(type){

        case "az":

            members.sort((a,b)=>

                (a.name||"").localeCompare(b.name||"")

            );

        break;

        case "za":

            members.sort((a,b)=>

                (b.name||"").localeCompare(a.name||"")

            );

        break;

        case "newest":

            members.sort((a,b)=>

                (b.createdAt?.seconds||0)-

                (a.createdAt?.seconds||0)

            );

        break;

        case "oldest":

            members.sort((a,b)=>

                (a.createdAt?.seconds||0)-

                (b.createdAt?.seconds||0)

            );

        break;

    }

    renderMembers();

}

/* ==========================================
COPY EMAIL
========================================== */

function copyEmail(email){

navigator.clipboard.writeText(email);

alert("Email copied.");

}

/* ==========================================
COPY UID
========================================== */

function copyUID(uid){

navigator.clipboard.writeText(uid);

alert("UID copied.");

}

/* ==========================================
EXPORT MEMBERS CSV
========================================== */

function exportCSV(){

let csv="Name,Email,Role,Status,Payment\n";

members.forEach(user=>{

csv+=`${user.name},

${user.email},

${user.role},

${user.accountStatus},

${user.paymentStatus}\n`;

});

const blob=new Blob([csv],{

type:"text/csv"

});

const url=

URL.createObjectURL(blob);

const a=document.createElement("a");

a.href=url;

a.download="members.csv";

a.click();

URL.revokeObjectURL(url);

}

/* ==========================================
REFRESH BUTTON
========================================== */

function refreshMembers(){

renderMembers();

}

/* ==========================================
ONLINE USERS
========================================== */

function countOnline(){

let online=0;

members.forEach(user=>{

if(user.online===true){

online++;

}

});

console.log(

"Online Members:",

online

);

}

/* ==========================================
SHOW LOADER
========================================== */

function showLoader(){

membersGrid.innerHTML=`

<div class="loading">

<i class="fa-solid fa-spinner fa-spin"></i>

Loading Members...

</div>

`;

}

/* ==========================================
EMPTY STATE
========================================== */

function emptyState(){

membersGrid.innerHTML=`

<div class="empty-members">

<i class="fa-solid fa-users"></i>

<h2>

No Members Found

</h2>

<p>

Try another search.

</p>

</div>

`;

}

/* ==========================================
CHECK EMPTY
========================================== */

if(members.length===0){

emptyState();

}

/* ==========================================
ESC CLOSE
========================================== */

document.addEventListener(

"keydown",

(e)=>{

if(e.key==="Escape"){

modal.style.display="none";

}

}

/* ==========================================
END
========================================== */

);

console.log(

"Advanced Member Manager Loaded"

);