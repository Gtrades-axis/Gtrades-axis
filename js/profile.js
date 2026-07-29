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

const profileName=document.getElementById("profileName");

const profileEmail=document.getElementById("profileEmail");

const profileBadge=document.getElementById("profileBadge");

const profileRole=document.getElementById("profileRole");

const profileMembership=document.getElementById("profileMembership");

const profilePayment=document.getElementById("profilePayment");

const profileJoined=document.getElementById("profileJoined");

const upgradeBtn=document.getElementById("upgradeBtn");

onAuthStateChanged(auth,async(user)=>{

if(!user){

location.href="login.html";

return;

}

const snap=await getDoc(

doc(db,"users",user.uid)

);

if(!snap.exists()) return;

const data=snap.data();

profileName.innerText=data.name||"Trader";

profileEmail.innerText=data.email||user.email;

profileRole.innerText=data.role||"free";

profileMembership.innerText=data.membership||"free";

profilePayment.innerText=data.paymentStatus||"unpaid";

profileJoined.innerText=

data.createdAt?.toDate?.()

?data.createdAt.toDate().toLocaleDateString()

:"-";

if(data.role==="admin"){

profileBadge.innerHTML="👑 Administrator";

profileBadge.className="member-badge admin";

upgradeBtn.style.display="none";

}
else if(data.membership==="premium"){

profileBadge.innerHTML="⭐ Premium Member";

profileBadge.className="member-badge premium";

upgradeBtn.style.display="none";

}
else{

profileBadge.innerHTML="🆓 Free Member";

profileBadge.className="member-badge free";

upgradeBtn.style.display="inline-flex";

}

});