import { db } from "./firebase.js";

import {

collection,

getDocs,

doc,

updateDoc,

serverTimestamp

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const table=document.getElementById("paymentsTable");

const pending=document.getElementById("pendingCount");

const approved=document.getElementById("approvedCount");

const revenue=document.getElementById("revenue");

async function loadPayments(){

const snapshot=await getDocs(collection(db,"payments"));

let html="";

let pendingCount=0;

let approvedCount=0;

let totalRevenue=0;

snapshot.forEach(payment=>{

const p=payment.data();

if(p.status==="pending") pendingCount++;

if(p.status==="approved"){

approvedCount++;

totalRevenue+=Number(p.amount);

}

html+=`

<tr>

<td>${p.name}</td>

<td>${p.plan}</td>

<td>${p.paymentMethod}</td>

<td>$${p.amount}</td>

<td>${p.transactionId}</td>

<td>${p.status}</td>

<td>

<button

class="approve"

onclick="approvePayment('${payment.id}','${p.uid}')">

Approve

</button>

<button

class="reject"

onclick="rejectPayment('${payment.id}')">

Reject

</button>

</td>

</tr>

`;

});

table.innerHTML=html;

pending.textContent=pendingCount;

approved.textContent=approvedCount;

revenue.textContent="$"+totalRevenue;

}

window.approvePayment=async function(paymentId,userId){

await updateDoc(doc(db,"payments",paymentId),{

status:"approved",

approvedAt:serverTimestamp()

});

await updateDoc(doc(db,"users",userId),{

role:"premium",

membership:"premium",

payment:"paid",

active:true,

status:"active",

premiumSince:serverTimestamp()

});

alert("Premium activated.");

loadPayments();

}

window.rejectPayment=async function(paymentId){

await updateDoc(doc(db,"payments",paymentId),{

status:"rejected"

});

alert("Payment rejected.");

loadPayments();

}

loadPayments();