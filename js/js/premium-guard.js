// ============================================================
// GTRADES-AXIS™
// PREMIUM GUARD
// PART 1
// ============================================================

import { auth, db } from "./firebase.js";

import {

    onAuthStateChanged

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {

    doc,

    getDoc

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ============================================================
// PREMIUM PAGES
// ============================================================

const PREMIUM_PAGES = [

    "premium-academy.html",

    "journal.html",

    "resources.html",

    "videos.html",

    "analytics.html",

    "history.html",

    "ai-review.html"

];

// ============================================================
// CURRENT PAGE
// ============================================================

const currentPage =

window.location.pathname

.split("/")

.pop()

.toLowerCase();

// ============================================================
// EXIT IF NOT PREMIUM PAGE
// ============================================================

if(

!PREMIUM_PAGES.includes(currentPage)

){

    console.log(

        "Premium Guard skipped."

    );

}

else{

// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(

auth,

async(user)=>{

    if(!user){

        window.location.href="login.html";

        return;

    }

    try{

        const snap=

        await getDoc(

            doc(db,"users",user.uid)

        );

        if(!snap.exists()){

            window.location.href="login.html";

            return;

        }

        const data=

        snap.data();

        window.currentUser=data;

        window.currentUser.uid=user.uid;

// ============================================================
// ADMIN
// ============================================================

        if(

            data.role==="admin"

        ){

            console.log(

            "Admin Access"

            );

            return;

        }

// ============================================================
// PREMIUM
// ============================================================

        if(

            data.membership==="premium"

        ){

            console.log(

            "Premium Access"

            );

            return;

        }

// ============================================================
// FREE USER
// ============================================================

        lockPremiumContent(

            currentPage

        );

    }

    catch(error){

        console.error(error);

    }

});

}

// ============================================================
// PLACEHOLDER
// ============================================================

f// ============================================================
// LOCK PREMIUM CONTENT
// ============================================================

function lockPremiumContent(page) {

    // Don't create it twice
    if (document.getElementById("premiumOverlay")) return;

    // Blur everything except the overlay
    document.body.classList.add("premium-locked");

    const overlay = document.createElement("div");

    overlay.id = "premiumOverlay";

    overlay.innerHTML = `

        <div class="premium-overlay-card">

            <div class="premium-lock-icon">
                <i class="fa-solid fa-crown"></i>
            </div>

            <h1>Premium Feature</h1>

            <p>

                This section is reserved for

                <strong>Premium Members</strong>.

                Upgrade your membership to unlock

                every professional trading tool.

            </p>

            <div class="premium-feature-list">

                <div>✔ Trading Journal</div>

                <div>✔ Premium Academy</div>

                <div>✔ Resources Library</div>

                <div>✔ AI Trade Review</div>

                <div>✔ Analytics Dashboard</div>

                <div>✔ Trading History</div>

            </div>

            <div class="premium-buttons">

                <a href="payment.html" class="upgrade-btn">

                    Upgrade Now

                </a>

                <a href="dashboard.html" class="dashboard-btn">

                    Dashboard

                </a>

            </div>

        </div>

    `;

    document.body.appendChild(overlay);

    // Disable interaction with the page underneath
    document.querySelectorAll("body > *").forEach(el => {

        if (el.id !== "premiumOverlay") {

            el.style.pointerEvents = "none";

            el.style.userSelect = "none";

        }

    });

    overlay.style.pointerEvents = "auto";

}
console.log(

"✅ PREMIUM GUARD PART 1 LOADED"

);