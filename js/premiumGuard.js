/* ==========================================================
GTRADES-AXIS™
UNIVERSAL PREMIUM GUARD
========================================================== */

import { auth, db } from "./firebase.js";

import {

onAuthStateChanged

}
from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import{

doc,
getDoc

}
from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ==========================================================
PUBLIC FUNCTION
========================================================== */

window.PremiumGuard=function({

feature="Premium Feature"

}={}){

onAuthStateChanged(auth,async(user)=>{

/* ===========================
NOT LOGGED IN
=========================== */

if(!user){

showPopup(

"Login Required",

"Please login to continue.",

"login.html"

);

return;

}

/* ===========================
GET USER
=========================== */

const snap=await getDoc(

doc(db,"users",user.uid)

);

if(!snap.exists()){

showPopup(

"Account Not Found",

"Please contact support.",

"login.html"

);

return;

}

const data=snap.data();

/* ===========================
WAITING APPROVAL
=========================== */

if(data.active!==true){

showPopup(

"Awaiting Approval",

"Your account has not yet been approved by an administrator.",

"pending.html"

);

return;

}

/* ===========================
ADMIN
=========================== */

if(data.role==="admin"){

document.body.classList.add(

"premium-authorized"

);

return;

}

/* ===========================
PREMIUM
=========================== */

if(data.membership==="premium"){

document.body.classList.add(

"premium-authorized"

);

return;

}

/* ===========================
FREE
=========================== */

showPremium(feature);

});

};
/* ==========================================================
PREMIUM WINDOW
========================================================== */

function showPremium(feature){

showPopup(

"Premium Required",

feature+

" is available only for Premium Members.",

"membership.html",

true

);

}

/* ==========================================================
POPUP
========================================================== */

function showPopup(

title,

message,

url,

upgrade=false

){

if(

document.getElementById(

"premiumPopup"

)

)

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

${title}

</h2>

<p>

${message}

</p>

<div class="premium-list">

<div>📒 Trading Journal</div>

<div>📚 Premium Resources</div>

<div>🎓 Premium Academy</div>

<div>🤖 AI Trade Review</div>

<div>📈 Analytics</div>

<div>🏆 Certificates</div>

</div>

<div class="premium-buttons">

<a

href="${url}"

class="upgrade-btn">

${upgrade?"Upgrade Membership":"Continue"}

</a>

<button id="closePremium">

Close

</button>

</div>

</div>

`;

document.body.appendChild(popup);

document

.getElementById(

"closePremium"

)

.onclick=()=>{

popup.remove();

};

}
