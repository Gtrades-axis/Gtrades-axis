import { db } from "../firebase.js";

import {
collection,
getDocs,
query,
orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const table=document.getElementById("membersTable");

let members=[];

async function loadMembers(){

members=[];

table.innerHTML="";

const q=query(
collection(db,"users"),
orderBy("createdAt","desc")
);

const snapshot=await getDocs(q);

let total=0;
let admins=0;
let premium=0;
let pending=0;

snapshot.forEach(doc=>{

const user=doc.data();

members.push({

id:doc.id,

...user

});

total++;

if(user.role==="admin") admins++;

if(user.role==="premium") premium++;

if(user.active===false) pending++;

table.innerHTML+=`

<tr>

<td>${user.name}</td>

<td>${user.email}</td>

<td>${user.role}</td>

<td>${user.paymentStatus}</td>

<td>${user.active?"Active":"Pending"}</td>

<td>

<button
class="approve-btn"
onclick="manageMember('${doc.id}')">

Manage

</button>

</td>

</tr>

`;

});

updateCards(total,premium,pending,admins);

}

function updateCards(total,premium,pending,admins){

document.getElementById("totalMembers").innerHTML=total;

document.getElementById("premiumMembers").innerHTML=premium;

document.getElementById("pendingMembers").innerHTML=pending;

document.getElementById("adminMembers").innerHTML=admins;

}

window.manageMember=function(id){

const member=members.find(m=>m.id===id);

if(!member)return;

selectedMember=member;

document.getElementById("modalName").textContent=member.name;

document.getElementById("modalEmail").textContent=member.email;

document.getElementById("modalRole").textContent=member.role;

document.getElementById("modalPayment").textContent=member.paymentStatus;

document.getElementById("modalStatus").textContent=
member.active?"Active":"Pending";

document.getElementById("memberModal").style.display="flex";

}

loadMembers();