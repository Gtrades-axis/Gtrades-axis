/* ======================================================
   GTRADES-AXIS™ PREMIUM GUARD
====================================================== */


import { auth, db } from "./firebase.js";


import {

onAuthStateChanged

}
from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";


import {

doc,
getDoc

}
from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";




window.PremiumGuard = function(options={}){


const feature =
options.feature || "Premium Feature";



onAuthStateChanged(auth, async(user)=>{


// ================================
// NOT LOGGED IN
// ================================


if(!user){


showOverlay(

"🔐 Login Required",

"Please login to continue.",

[

{

text:"Login",

url:"login.html",

primary:true

}

]

);


return;


}



// ================================
// GET USER DATA
// ================================


try{


const userSnap =
await getDoc(

doc(
db,
"users",
user.uid

)

);



if(!userSnap.exists()){


showOverlay(

"Account Not Found",

"Please contact support."

);


return;


}



const data =
userSnap.data();




// ================================
// ACCOUNT STATUS
// ================================


if(data.active !== true){


showOverlay(

"⏳ Awaiting Approval",

"Your account is waiting for administrator approval.",

[

{

text:"Dashboard",

url:"dashboard.html",

primary:true

}

]

);


return;


}




// ================================
// PREMIUM CHECK
// ================================


if(data.premium !== true){


showPremium(feature);


return;


}



// ================================
// ACCESS GRANTED
// ================================


document.body.classList.add(

"premium-authorized"

);



console.log(
"Premium access granted"
);



}

catch(error){

console.error(error);

}


});


};





// ======================================================
// PREMIUM REQUIRED WINDOW
// ======================================================


function showPremium(feature){


showOverlay(

"⭐ Premium Required",

`${feature} is available exclusively to GTRADES-AXIS™ Premium Members.`,

[

{

text:"Upgrade Membership",

url:"membership.html",

primary:true

},

{

text:"Back Dashboard",

url:"dashboard.html"

}

]

);


}





// ======================================================
// OVERLAY
// ======================================================


function showOverlay(title,message,buttons=[]){



if(document.getElementById("premiumGuardOverlay")){

return;

}



document.body.classList.add(
"premium-locked"
);



const overlay=document.createElement("div");


overlay.id="premiumGuardOverlay";


overlay.className="premium-guard-overlay";



let buttonsHTML="";



buttons.forEach(button=>{


buttonsHTML+=`

<a href="${button.url}"

class="premium-btn ${button.primary?"primary":"secondary"}">

${button.text}

</a>

`;

});



overlay.innerHTML=`

<div class="premium-card">

<div class="premium-icon">

🔒

</div>


<h1>

${title}

</h1>


<p>

${message}

</p>


<div class="premium-features">

<h3>

Premium Membership Includes

</h3>


<ul>

<li>📒 Professional Trading Journal</li>

<li>🎓 Premium Trading Academy</li>

<li>🤖 AI Trade Review</li>

<li>📊 Advanced Analytics</li>

<li>📚 Premium Resources</li>

<li>🏆 Certificates</li>

<li>🚀 Future Premium Updates</li>

</ul>


</div>


<div class="premium-buttons">

${buttonsHTML}

</div>


</div>

`;



document.body.appendChild(overlay);


}