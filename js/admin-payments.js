/* ==========================================================
GTRADES-AXIS™
ADMIN PAYMENTS
PART 3A
========================================================== */

import { db } from "./firebase.js";

import {

collection,
onSnapshot,
doc,
updateDoc,
serverTimestamp

}
from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ==========================================================
ELEMENTS
========================================================== */

const paymentsGrid=document.getElementById("paymentsGrid");

const pendingCount=document.getElementById("pendingCount");

const approvedCount=document.getElementById("approvedCount");

const rejectedCount=document.getElementById("rejectedCount");

const revenue=document.getElementById("revenue");

const searchPayment=document.getElementById("searchPayment");

const statusFilter=document.getElementById("statusFilter");

/* ========================= MODAL ========================= */

const modal=document.getElementById("paymentModal");

const closeModal=document.getElementById("closeModal");

const mName=document.getElementById("mName");

const mEmail=document.getElementById("mEmail");

const mPlan=document.getElementById("mPlan");

const mAmount=document.getElementById("mAmount");

const mMethod=document.getElementById("mMethod");

const mTransaction=document.getElementById("mTransaction");

const mStatus=document.getElementById("mStatus");

const approveBtn=document.getElementById("approveBtn");

const rejectBtn=document.getElementById("rejectBtn");

/* ==========================================================
VARIABLES
========================================================== */

let payments=[];

let selectedPayment=null;

/* ==========================================================
LOAD PAYMENTS
========================================================== */

onSnapshot(

collection(db,"payments"),

(snapshot)=>{

payments=[];

snapshot.forEach(docSnap=>{

payments.push({

id:docSnap.id,

...docSnap.data()

});

});

renderPayments();

}

);

/* ==========================================================
RENDER PAYMENTS
========================================================== */

function renderPayments(){

paymentsGrid.innerHTML="";

let pending=0;

let approved=0;

let rejected=0;

let totalRevenue=0;

const keyword=

searchPayment.value.toLowerCase();

const filter=

statusFilter.value;

const filtered=

payments.filter(payment=>{

const matchesSearch=

(payment.name||"")

.toLowerCase()

.includes(keyword)

||

(payment.email||"")

.toLowerCase()

.includes(keyword)

||

(payment.transactionId||"")

.toLowerCase()

.includes(keyword);

const matchesStatus=

filter==="all"

||

payment.status===filter;

return matchesSearch && matchesStatus;

});

if(filtered.length===0){

paymentsGrid.innerHTML=`

<div class="empty">

<i class="fa-solid fa-credit-card"></i>

<h2>

No Payments Found

</h2>

<p>

No matching payment requests.

</p>

</div>

`;

updateStats(0,0,0,0);

return;

}

filtered.forEach(payment=>{

if(payment.status==="pending") pending++;

if(payment.status==="approved"){

approved++;

totalRevenue+=Number(payment.amount||0);

}

if(payment.status==="rejected") rejected++;

let card=document.createElement("div");

card.className="payment-card";

card.innerHTML=`

<div class="payment-header">

<div class="payment-user">

<div class="payment-avatar">

<i class="fa-solid fa-user"></i>

</div>

<div class="payment-name">

<h3>

${payment.name||"Unknown"}

</h3>

<p>

${payment.email||""}

</p>

</div>

</div>

<span class="plan">

${payment.plan||"Premium"}

</span>

</div>

<div class="payment-info">

<div class="payment-box">

<span>

Amount

</span>

<b>

$${payment.amount||0}

</b>

</div>

<div class="payment-box">

<span>

Method

</span>

<b>

${payment.paymentMethod||"-"}

</b>

</div>

<div class="payment-box">

<span>

Transaction

</span>

<b>

${payment.transactionId||"-"}

</b>

</div>

<div class="payment-box">

<span>

Status

</span>

<b class="status ${payment.status}">

${payment.status}

</b>

</div>

</div>

<div class="payment-buttons">

<button class="view">

View

</button>

<button class="approve">

Approve

</button>

<button class="reject">

Reject

</button>

</div>

`;

paymentsGrid.appendChild(card);

/* =========================
VIEW BUTTON
========================= */

card.querySelector(".view").onclick=()=>{

selectedPayment=payment;

mName.textContent=payment.name||"-";

mEmail.textContent=payment.email||"-";

mPlan.textContent=payment.plan||"-";

mAmount.textContent="$"+(payment.amount||0);

mMethod.textContent=payment.paymentMethod||"-";

mTransaction.textContent=payment.transactionId||"-";

mStatus.textContent=payment.status||"-";

modal.style.display="flex";

};

/* =========================
APPROVE BUTTON
========================= */

card.querySelector(".approve").onclick=()=>{

selectedPayment=payment;

approvePayment();

};

/* =========================
REJECT BUTTON
========================= */

card.querySelector(".reject").onclick=()=>{

selectedPayment=payment;

rejectPayment();

};

});

updateStats(

pending,

approved,

rejected,

totalRevenue

);

}

/* ==========================================================
UPDATE STATISTICS
========================================================== */

function updateStats(

pending,

approved,

rejected,

money

){

pendingCount.innerText=pending;

approvedCount.innerText=approved;

rejectedCount.innerText=rejected;

revenue.innerText="$"+money;

}
/* ==========================================================
CONTINUE FROM PART 3A
PART 3B
========================================================== */

import {
doc,
updateDoc,
serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ==========================================================
APPROVE PAYMENT
========================================================== */

async function approvePayment(){

if(!selectedPayment) return;

try{

// Update payment
await updateDoc(

doc(db,"payments",selectedPayment.id),

{

status:"approved",

approvedAt:serverTimestamp()

}

);

// Upgrade user
await updateDoc(

doc(db,"users",selectedPayment.uid),

{

role:"premium",

membership:"premium",

premium:true,

payment:"paid",

paymentStatus:"paid",

plan:selectedPayment.plan||"Premium",

approvedAt:serverTimestamp()

}

);

alert("Payment Approved Successfully.");

modal.style.display="none";

}
catch(error){

console.error(error);

alert(error.message);

}

}

/* ==========================================================
REJECT PAYMENT
========================================================== */

async function rejectPayment(){

if(!selectedPayment) return;

if(!confirm("Reject this payment?")) return;

try{

await updateDoc(

doc(db,"payments",selectedPayment.id),

{

status:"rejected",

rejectedAt:serverTimestamp()

}

);

await updateDoc(

doc(db,"users",selectedPayment.uid),

{

payment:"unpaid",

paymentStatus:"unpaid"

}

);

alert("Payment Rejected.");

modal.style.display="none";

}
catch(error){

console.error(error);

alert(error.message);

}

}

/* ==========================================================
MODAL BUTTONS
========================================================== */

approveBtn.onclick=()=>{

approvePayment();

};

rejectBtn.onclick=()=>{

rejectPayment();

};

/* ==========================================================
SEARCH
========================================================== */

searchPayment.addEventListener(

"input",

()=>{

renderPayments();

}

);

/* ==========================================================
STATUS FILTER
========================================================== */

statusFilter.addEventListener(

"change",

()=>{

renderPayments();

}

);

/* ==========================================================
MODAL CLOSE
========================================================== */

closeModal.onclick=()=>{

modal.style.display="none";

};

window.addEventListener(

"click",

(e)=>{

if(e.target===modal){

modal.style.display="none";

}

}

);

/* ==========================================================
ESC CLOSE
========================================================== */

window.addEventListener(

"keydown",

(e)=>{

if(e.key==="Escape"){

modal.style.display="none";

}

}

);

/* ==========================================================
AUTO REFRESH
========================================================== */

setInterval(()=>{

renderPayments();

},15000);

/* ==========================================================
PAYMENT SUMMARY
========================================================== */

function calculateRevenue(){

let amount=0;

payments.forEach(payment=>{

if(payment.status==="approved"){

amount+=Number(payment.amount||0);

}

});

revenue.innerText="$"+amount;

}

calculateRevenue();

/* ==========================================================
CONSOLE
========================================================== */

console.log("======================================");

console.log("GTRADES-AXIS™ Admin Payments Loaded");

console.log("Realtime Payment Verification Active");

console.log("======================================");
