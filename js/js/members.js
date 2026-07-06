import { db } from "./firebase.js";

import {

collection,

getDocs

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

export async function loadMembers(){

const tbody=document.getElementById("membersTable");

tbody.innerHTML="";

const snapshot=await getDocs(collection(db,"users"));

let total=0;

let premium=0;

let pending=0;

snapshot.forEach(doc=>{

const user=doc.data();

total++;

if(user.premium) premium++;

if(!user.active) pending++;

tbody.innerHTML+=`

<tr>

<td>${user.name}</td>

<td>${user.email}</td>

<td>${user.premium?"✅":"❌"}</td>

<td>${user.active?"Active":"Pending"}</td>

<td>

<button class="approve-btn">

Manage

</button>

</td>

</tr>

`;

});

document.getElementById("totalUsers").textContent=total;

document.getElementById("premiumUsers").textContent=premium;

document.getElementById("pendingUsers").textContent=pending;

}
