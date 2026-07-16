import { db } from "./firebase.js";

import {

collection,
getDocs,
query,
orderBy,
limit

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ============================
ELEMENTS
============================ */

if(totalMembers) totalMembers.textContent = total;

if(premiumMembers) premiumMembers.textContent = premium;

if(adminMembers) adminMembers.textContent = admins;

if(pendingMembers) pendingMembers.textContent = pending;

if(todayCount) todayCount.textContent = joinedToday;

if(premiumOverview) premiumOverview.textContent = premium;

if(pendingOverview) pendingOverview.textContent = pending;

const resourceCount=document.getElementById("resourceCount");
const lessonCount=document.getElementById("lessonCount");
const paymentCount=document.getElementById("paymentCount");
const todayCount=document.getElementById("todayCount");

const premiumOverview=document.getElementById("premiumOverview");
const pendingOverview=document.getElementById("pendingOverview");
const resourceOverview=document.getElementById("resourceOverview");
const lessonOverview=document.getElementById("lessonOverview");

const recentMembers=document.getElementById("recentMembers");
<div id="recentMembers"></div>

/* ============================
LOAD DASHBOARD
============================ */

loadDashboard();

async function loadDashboard(){

    await Promise.all([

        loadMemberStats(),
        loadResources(),
        loadRecentMembers()

    ]);

}

/* ============================
MEMBER STATISTICS
============================ */

async function loadMemberStats(){

    if(totalMembers) totalMembers.textContent=total;
if(premiumMembers) premiumMembers.textContent=premium;
if(adminMembers) adminMembers.textContent=admins;
if(pendingMembers) pendingMembers.textContent=pending;
if(todayCount) todayCount.textContent=joinedToday;

if(premiumOverview) premiumOverview.textContent=premium;
if(pendingOverview) pendingOverview.textContent=pending;

    totalMembers.textContent=total;

    premiumMembers.textContent=premium;

    adminMembers.textContent=admins;

    pendingMembers.textContent=pending;

    todayCount.textContent=joinedToday;

    premiumOverview.textContent=premium;

    pendingOverview.textContent=pending;

}
/* ============================
RESOURCE STATISTICS
============================ */

async function loadResources(){

    const snapshot = await getDocs(collection(db,"resources"));

    const totalResources = snapshot.size;

    if(resourceCount) resourceCount.textContent = totalResources;

    if(resourceOverview) resourceOverview.textContent = totalResources;

}
}

/* ============================
ACADEMY STATISTICS
============================ */

async function loadAcademy(){

    if(!lessonCount || !lessonOverview) return;

    try{

        const snapshot = await getDocs(collection(db,"academy"));

        lessonCount.textContent = snapshot.size;

        lessonOverview.textContent = snapshot.size;

    }catch(e){

        lessonCount.textContent = "0";

        lessonOverview.textContent = "0";

    }

}

/* ============================
PAYMENT STATISTICS
============================ */

async function loadPayments(){

    if(!paymentCount) return;

    try{

        const snapshot = await getDocs(collection(db,"payments"));

        paymentCount.textContent = snapshot.size;

    }catch(e){

        paymentCount.textContent = "0";

    }

}
/* ============================
RECENT MEMBERS
============================ */

async function loadRecentMembers(){

    recentMembers.innerHTML = "";

    const q = query(

        collection(db,"users"),
        orderBy("createdAt","desc"),
        limit(5)

    );

    const snapshot = await getDocs(q);

    if(snapshot.empty){

        recentMembers.innerHTML = `

        <div class="empty-card">

            No members yet.

        </div>

        `;

        return;

    }

    snapshot.forEach(doc=>{

        const user = doc.data();

        const initials = user.name
            ? user.name.charAt(0).toUpperCase()
            : "U";

        recentMembers.innerHTML += `

        <div class="recent-member">

            <div class="recent-avatar">

                ${initials}

            </div>

            <div class="recent-info">

                <h4>

                    ${user.name || "Unknown User"}

                </h4>

                <p>

                    ${user.email || ""}

                </p>

            </div>

        </div>

        `;

    });

}

/* ============================
LOAD EVERYTHING
============================ */

async function refreshDashboard(){

    await Promise.all([

        loadMemberStats(),
        loadResources(),
        loadAcademy(),
        loadPayments(),
        loadRecentMembers()

    ]);

}

/* ============================
AUTO REFRESH
============================ */

setInterval(refreshDashboard,30000);

/* First load */

refreshDashboard();
/* ==========================================
PART 3C
UI IMPROVEMENTS
========================================== */

/* =========================
ANIMATED COUNTERS
========================= */

function animateCounter(element, target){

    if(!element) return;

    let start = 0;

    const duration = 800;

    const increment = Math.max(1, Math.ceil(target / 40));

    const timer = setInterval(()=>{

        start += increment;

        if(start >= target){

            element.textContent = target;

            clearInterval(timer);

        }else{

            element.textContent = start;

        }

    },duration/40);

}

/* =========================
UPDATE CARD VALUES
========================= */

function setCardValue(element,value){

    if(!element) return;

    animateCounter(element,Number(value));

}

/* =========================
SUCCESS MESSAGE
========================= */

function showNotification(message,color="#22C55E"){

    let notify=document.getElementById("dashboardNotification");

    if(!notify){

        notify=document.createElement("div");

        notify.id="dashboardNotification";

        document.body.appendChild(notify);

    }

    notify.innerHTML=message;

    notify.style.background=color;

    notify.style.position="fixed";

    notify.style.top="25px";

    notify.style.right="25px";

    notify.style.padding="16px 22px";

    notify.style.color="#fff";

    notify.style.borderRadius="12px";

    notify.style.fontWeight="600";

    notify.style.zIndex="999999";

    notify.style.boxShadow="0 15px 30px rgba(0,0,0,.25)";

    notify.style.opacity="1";

    notify.style.transition=".35s";

    setTimeout(()=>{

        notify.style.opacity="0";

    },2500);

}

/* =========================
RECENT ACTIVITY
========================= */

function addActivity(icon,title,text){

    const feed=document.querySelector(".activity-feed");

    if(!feed) return;

    const item=document.createElement("div");

    item.className="activity-item";

    item.innerHTML=`

        <div class="activity-icon blue">

            <i class="${icon}"></i>

        </div>

        <div>

            <h4>${title}</h4>

            <p>${text}</p>

        </div>

    `;

    feed.prepend(item);

    if(feed.children.length>6){

        feed.removeChild(feed.lastElementChild);

    }

}

/* =========================
LOAD EFFECT
========================= */

window.addEventListener("load",()=>{

    document.body.style.opacity="0";

    document.body.style.transition=".4s";

    setTimeout(()=>{

        document.body.style.opacity="1";

    },100);

});

/* =========================
ERROR HANDLER
========================= */

window.addEventListener("error",(e)=>{

    console.error(e.error);

    showNotification("An unexpected error occurred.","#EF4444");

});

/* =========================
RESOURCE UPLOADED EVENT
========================= */

window.addEventListener("resourceUploaded",()=>{

    refreshDashboard();

    addActivity(

        "fa-solid fa-folder-plus",

        "Resource Uploaded",

        "A new premium resource was added."

    );

    showNotification("Resource uploaded successfully.");

});

/* =========================
NEW MEMBER EVENT
========================= */

window.addEventListener("memberRegistered",()=>{

    refreshDashboard();

    addActivity(

        "fa-solid fa-user-plus",

        "New Member",

        "A new member joined GTRADES AXIS."

    );

});

/* =========================
WELCOME
========================= */

setTimeout(()=>{

    showNotification("Welcome back Administrator 👋","#0A84FF");

},800);

console.log("GTRADES AXIS ADMIN V2 LOADED");
/* =====================================
LOGOUT
===================================== */

import { auth } from "./firebase.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const logoutBtn = document.getElementById("logoutBtn");
console.log("Logout button:", logoutBtn);

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        const confirmLogout = confirm("Are you sure you want to logout?");

        if (!confirmLogout) return;

        try {

            await signOut(auth);

            window.location.href = "login.html";

        } catch (error) {

            console.error(error);

            alert(error.message);

        }

    });

}
const liveDate = document.getElementById("liveDate");

function updateClock() {

    if (!liveDate) return;

    const now = new Date();

    liveDate.innerHTML = now.toLocaleString("en-GB", {

        weekday: "short",

        day: "numeric",

        month: "short",

        year: "numeric",

        hour: "2-digit",

        minute: "2-digit"

    });

}

updateClock();

setInterval(updateClock, 1000);