import { db } from "./firebase.js";

import {
collection,
getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
approveMember,
makePremium,
removePremium,
suspendMember,
deleteMember
} from "./memberActions.js";

export async function loadMembers(){

const tbody=document.getElementById("membersTable");

tbody.innerHTML="";

const snapshot=await getDocs(collection(db,"users"));

let total=0;
let premium=0;
let pending=0;

snapshot.forEach((document)=>{

const user=document.data();

const id=document.id;

total++;

if(user.premium===true){

premium++;

}

if(user.active===false){

pending++;

}

const premiumBadge=user.premium
?'<span class="badge premium">Premium</span>'
:'<span class="badge free">Free</span>';

const statusBadge=user.active
?'<span class="badge active">Active</span>'
:'<span class="badge pending">Pending</span>';

tbody.innerHTML+=`

<tr>

<td>${user.name}</td>

<td>${user.email}</td>

<td>${premiumBadge}</td>

<td>${statusBadge}</td>

<td>

<button class="approveBtn" data-id="${id}">
Approve
</button>

<button class="premiumBtn" data-id="${id}">
Premium
</button>

<button class="removePremiumBtn" data-id="${id}">
Remove
</button>

<button class="suspendBtn" data-id="${id}">
Suspend
</button>

<button class="deleteBtn" data-id="${id}">
Delete
</button>

</td>

</tr>

`;

});

document.getElementById("totalUsers").textContent=total;

document.getElementById("premiumUsers").textContent=premium;

document.getElementById("pendingUsers").textContent=pending;

attachEvents();

}

function attachEvents(){

document.querySelectorAll(".approveBtn").forEach(btn=>{

btn.onclick=()=>approveMember(btn.dataset.id);

});

document.querySelectorAll(".premiumBtn").forEach(btn=>{

btn.onclick=()=>makePremium(btn.dataset.id);

});

document.querySelectorAll(".removePremiumBtn").forEach(btn=>{

btn.onclick=()=>removePremium(btn.dataset.id);

});

document.querySelectorAll(".suspendBtn").forEach(btn=>{

btn.onclick=()=>suspendMember(btn.dataset.id);

});

document.querySelectorAll(".deleteBtn").forEach(btn=>{

btn.onclick=()=>deleteMember(btn.dataset.id);

});

}
