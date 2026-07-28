// ============================================================
// GTRADES AXIS™ – ADMIN MEMBERS MANAGEMENT FINAL
// ============================================================

import { db, auth } from "../firebase.js";

import {
    collection,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";


// ================= DOM =================

const table = document.getElementById("membersTable");
const search = document.getElementById("memberSearch");

const modal = document.getElementById("memberModal");
const closeModal = document.getElementById("closeModal");

const modalName = document.getElementById("modalName");
const modalEmail = document.getElementById("modalEmail");
const modalRole = document.getElementById("modalRole");
const modalPayment = document.getElementById("modalPayment");
const modalStatus = document.getElementById("modalStatus");
const modalJoined = document.getElementById("modalJoined");
const memberAvatar = document.getElementById("memberAvatar");


const approveBtn = document.getElementById("approveBtn");
const premiumBtn = document.getElementById("premiumBtn");
const adminBtn = document.getElementById("adminBtn");
const memberBtn = document.getElementById("memberBtn");
const suspendBtn = document.getElementById("suspendBtn");
const deleteBtn = document.getElementById("deleteBtn");


let selectedUser = null;
let unsubscribe = null;



// ================= ADMIN CHECK =================


onAuthStateChanged(auth, async(user)=>{


if(!user){

window.location.href="../login.html";
return;

}


const snap =
await getDoc(
doc(db,"users",user.uid)
);



if(!snap.exists() || snap.data().role !== "admin"){

table.innerHTML =
`
<tr>
<td colspan="6">
Access Denied
</td>
</tr>
`;

return;

}


loadMembers();


});





// ================= LOAD MEMBERS =================


function loadMembers(){


if(unsubscribe)
unsubscribe();



unsubscribe =
onSnapshot(
collection(db,"users"),
(snapshot)=>{


let html="";


snapshot.forEach((item)=>{


const user=item.data();



const role =
user.role || "member";


const membership =
user.membership || "free";


const status =
user.active === true
?
"active"
:
(user.status || "pending");



const initials =
(user.name || "U")
.charAt(0)
.toUpperCase();




html +=

`

<tr>


<td>

<div class="user-cell">

<div class="member-avatar-small">
${initials}
</div>


<div>

<strong>
${user.name || "Unknown"}
</strong>

<br>

<small>
${user.email || ""}
</small>


</div>

</div>

</td>



<td>

<span class="badge">
${role}
</span>

</td>




<td>

<span class="badge">
${membership}
</span>

</td>




<td>

<span class="badge">
${status}
</span>

</td>




<td>

${user.payment || "Unpaid"}

</td>



<td>

${formatDate(user.createdAt)}

</td>



<td>

<button
class="manage-btn"
data-id="${item.id}">
Manage
</button>

</td>


</tr>


`;



});



table.innerHTML=html;


attachButtons();


});

}



// ================= DATE =================


function formatDate(date){

if(!date)
return "--";


try{

if(date.toDate)
return date.toDate()
.toLocaleDateString();


return new Date(date)
.toLocaleDateString();


}
catch{

return "--";

}

}




// ================= OPEN MEMBER =================


function attachButtons(){


document.querySelectorAll(".manage-btn")
.forEach(btn=>{


btn.onclick=()=>{

openMember(btn.dataset.id);

};


});


}





async function openMember(id){


const snap =
await getDoc(
doc(db,"users",id)
);



selectedUser =
{
id,
...snap.data()
};



modalName.textContent =
selectedUser.name || "";


modalEmail.textContent =
selectedUser.email || "";


modalRole.textContent =
selectedUser.role || "member";


modalPayment.textContent =
selectedUser.payment || "Unpaid";


modalStatus.textContent =
selectedUser.membership || "free";


modalJoined.textContent =
formatDate(selectedUser.createdAt);



memberAvatar.textContent =
(selectedUser.name || "U")
.charAt(0)
.toUpperCase();



modal.style.display="flex";


}




// ================= APPROVE =================


approveBtn?.addEventListener(
"click",
async()=>{


if(!selectedUser)
return;



await updateDoc(
doc(db,"users",selectedUser.id),
{

active:true,

status:"active",

membership:
selectedUser.membership || "free",

role:
selectedUser.role || "member"

}

);



alert("Member approved");


modal.style.display="none";


loadMembers();


});






// ================= MAKE PREMIUM =================


premiumBtn?.addEventListener(
"click",
async()=>{


if(!selectedUser)
return;



await updateDoc(
doc(db,"users",selectedUser.id),
{

membership:"premium",

active:true,

status:"active"

}

);



alert("Premium activated");


modal.style.display="none";


loadMembers();


});






// ================= MAKE ADMIN =================


adminBtn?.addEventListener(
"click",
async()=>{


if(!selectedUser)
return;



await updateDoc(
doc(db,"users",selectedUser.id),
{

role:"admin"

}

);



alert("User is now Admin");


modal.style.display="none";


loadMembers();


});






// ================= REMOVE ADMIN =================

<button id="memberBtn">
Remove Admin / Make Member
</button>

memberBtn?.addEventListener(
"click",
async()=>{


if(!selectedUser)
return;



await updateDoc(
doc(db,"users",selectedUser.id),
{

role:"member"

}

);



alert("Admin removed");


modal.style.display="none";


loadMembers();


});






// ================= SUSPEND =================


suspendBtn?.addEventListener(
"click",
async()=>{


if(!selectedUser)
return;



await updateDoc(
doc(db,"users",selectedUser.id),
{

active:false,

status:"suspended"

}

);



alert("Member suspended");


modal.style.display="none";


loadMembers();


});






// ================= DELETE =================


deleteBtn?.addEventListener(
"click",
async()=>{


if(!selectedUser)
return;



if(!confirm("Delete member?"))
return;



await deleteDoc(
doc(db,"users",selectedUser.id)
);



alert("Deleted");


modal.style.display="none";


loadMembers();


});






// ================= SEARCH =================


search?.addEventListener(
"input",
()=>{


const value =
search.value.toLowerCase();



document.querySelectorAll("#membersTable tr")
.forEach(row=>{


row.style.display =
row.textContent
.toLowerCase()
.includes(value)
?
""
:
"none";


});


});





// ================= CLOSE =================


closeModal?.addEventListener(
"click",
()=>{

modal.style.display="none";

}
);


window.onclick=(e)=>{

if(e.target===modal)
modal.style.display="none";

};