import { auth, db } from "./firebase.js";

import {
addDoc,
collection,
serverTimestamp,
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

let selectedPlan = "";

// ===============================
// PLAN SELECTION
// ===============================

document.querySelectorAll(".plan-btn").forEach(btn=>{

btn.addEventListener("click",()=>{

selectedPlan=btn.innerText.includes("Lifetime")
?"Lifetime"
:"Monthly";

document.getElementById("selectedPlan").value=selectedPlan;

document.querySelectorAll(".plan").forEach(card=>{

card.classList.remove("selected");

});

btn.parentElement.classList.add("selected");

});

});

// ===============================
// SUBMIT PAYMENT
// ===============================

document.getElementById("paymentForm").addEventListener("submit",async(e)=>{

e.preventDefault();

const user=auth.currentUser;

if(!user){

alert("Please login first.");

return;

}

if(selectedPlan===""){

alert("Please select a membership plan.");

return;

}

try{

const userSnap=await getDoc(doc(db,"users",user.uid));

const userData=userSnap.data();

await addDoc(collection(db,"payments"),{

uid:user.uid,

name:userData.name,

email:user.email,

plan:selectedPlan,

amount:Number(document.getElementById("amount").value),

paymentMethod:document.getElementById("paymentMethod").value,

transactionId:document.getElementById("transactionId").value.trim(),

notes:document.getElementById("notes").value.trim(),

status:"pending",

submittedAt:serverTimestamp()

});

alert("Payment submitted successfully.\nYour membership will be upgraded after admin verification.");

window.location.href="dashboard.html";

}catch(error){

console.error(error);

alert(error.message);

}

});