import { auth, db } from "./firebase.js";

import {
signOut,
onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import{

doc,
getDoc,
collection,
getDocs,
query,
orderBy,
limit

}
from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ==========================================
ELEMENTS
========================================== */

const logoutBtn=document.getElementById("logoutBtn");

const userName=document.getElementById("userName");

const memberBadge=document.querySelector(".member-badge");

const resourceCount=document.getElementById("resourceCount");

const lessonCount=document.getElementById("lessonCount");

const videoCount=document.getElementById("videoCount");

const latestResources=document.getElementById("latestResources");

const announcements=document.getElementById("announcements");

/* ==========================================
CURRENT USER
========================================== */

let currentUser=null;

let membership="free";

let role="free";

/* ==========================================
AUTH
========================================== */

onAuthStateChanged(auth,async(user)=>{

if(!user){

location.href="login.html";

return;

}

currentUser=user;

const snap=await getDoc(

doc(db,"users",user.uid)

);

if(!snap.exists()){

location.href="login.html";

return;

}

const data=snap.data();

userName.innerText=data.name||"Trader";

membership=data.membership||"free";

role=data.role||"free";

/* ==========================================
BADGE
========================================== */

if(role==="admin"){

memberBadge.innerHTML=

`👑 Administrator`;

memberBadge.className=

"member-badge admin";

}

else if(membership==="premium"){

memberBadge.innerHTML=

`⭐ Premium Member`;

memberBadge.className=

"member-badge premium";

}

else{

memberBadge.innerHTML=

`🆓 Free Member`;

memberBadge.className=

"member-badge free";

}

loadDashboard();

});
/* ==========================================================
LOAD DASHBOARD
========================================================== */

async function loadDashboard(){

await Promise.all([

loadResources(),

loadAcademy(),

loadVideos(),

loadLatestResources(),

loadAnnouncements()

]);

setupPremiumLocks();

}

/* ==========================================================
PREMIUM LOCKS
========================================================== */

function setupPremiumLocks(){

// Admin has access to everything
if(role==="admin") return;

// Premium has access to everything
if(membership==="premium") return;

// -------------------------------
// Free Users
// -------------------------------

lockCard(

"resources.html",

"Premium Resources"

);

lockCard(

"journal.html",

"Trading Journal"

);

lockCard(

"profile.html",

"Premium Profile Features"

);

// Future pages

lockCard(

"ai-review.html",

"AI Trade Review"

);

lockCard(

"analytics.html",

"Advanced Analytics"

);

}

/* ==========================================================
LOCK CARD
========================================================== */

function lockCard(page,feature){

document.querySelectorAll("a").forEach(link=>{

if(link.getAttribute("href")!==page) return;

const card=link.closest(".quick-card");

if(card){

card.classList.add("locked");

if(!card.querySelector(".lock-badge")){

const badge=document.createElement("div");

badge.className="lock-badge";

badge.innerHTML=`
<i class="fa-solid fa-lock"></i>
Premium
`;

card.appendChild(badge);

}

}

link.addEventListener("click",(e)=>{

e.preventDefault();

showPremiumPopup(feature);

});

});

}

/* ==========================================================
PREMIUM POPUP
========================================================== */

function showPremiumPopup(feature){

if(document.getElementById("premiumPopup"))

return;

const popup=document.createElement("div");

popup.id="premiumPopup";

popup.className="premium-popup";

popup.innerHTML=`

<div class="premium-box">

<div class="premium-icon">

🔒

</div>

<h2>

Premium Required

</h2>

<p>

<b>${feature}</b>

is available only for Premium Members.

</p>

<ul>

<li>✔ Premium Academy</li>

<li>✔ Trading Journal</li>

<li>✔ Premium Resources</li>

<li>✔ AI Trade Review</li>

<li>✔ Advanced Analytics</li>

<li>✔ Future Updates</li>

</ul>

<div class="premium-actions">

<a

href="membership.html"

class="upgrade-btn">

Upgrade Membership

</a>

<button

id="closePremium">

Maybe Later

</button>

</div>

</div>

`;

document.body.appendChild(popup);

document

.getElementById("closePremium")

.onclick=()=>{

popup.remove();

};

}

/* ==========================================================
LOGOUT
========================================================== */

logoutBtn.onclick=async()=>{

if(!confirm("Logout?")) return;

await signOut(auth);

location.href="login.html";

};
/* ==========================================================
LATEST RESOURCES
========================================================== */

async function loadLatestResources(){

try{

const q=query(

collection(db,"resources"),

orderBy("createdAt","desc"),

limit(6)

);

const snapshot=await getDocs(q);

latestResources.innerHTML="";

if(snapshot.empty){

latestResources.innerHTML=`

<div class="loading-card">

No Resources Available

</div>

`;

return;

}

snapshot.forEach(docSnap=>{

const resource=docSnap.data();

const premium=resource.premium===true;

let html="";

if(

premium &&

membership!=="premium" &&

role!=="admin"

){

html=`

<div class="resource-item locked-resource">

<div class="resource-info">

<h3>

🔒 ${resource.title}

</h3>

<p>

${resource.description||"Premium Resource"}

</p>

<span class="premium-label">

Premium Resource

</span>

</div>

<button

class="locked-download"

data-feature="${resource.title}">

Locked

</button>

</div>

`;

}else{

html=`

<div class="resource-item">

<div class="resource-info">

<h3>

${resource.title}

</h3>

<p>

${resource.description||""}

</p>

</div>

<a

href="${resource.link}"

target="_blank"

class="resource-download">

Download

</a>

</div>

`;

}

latestResources.innerHTML+=html;

});

/* ==============================
LOCK BUTTONS
============================== */

document

.querySelectorAll(".locked-download")

.forEach(button=>{

button.onclick=()=>{

showPremiumPopup(

button.dataset.feature

);

};

});

}
catch(error){

console.error(error);

}

}
