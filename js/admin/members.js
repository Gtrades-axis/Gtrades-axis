// ============================================================
// GTRADES AXIS™ – ADMIN MEMBERS MANAGEMENT
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


// DOM
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
const suspendBtn = document.getElementById("suspendBtn");
const deleteBtn = document.getElementById("deleteBtn");


let selectedUser = null;
let unsubscribe = null;



// ============================================================
// ADMIN AUTH CHECK
// ============================================================

onAuthStateChanged(auth, async(user)=>{

    if(!user){

        window.location.href="../login.html";
        return;

    }


    const adminDoc = await getDoc(
        doc(db,"users",user.uid)
    );


    if(
        !adminDoc.exists() ||
        adminDoc.data().role !== "admin"
    ){

        table.innerHTML =
        `
        <tr>
        <td colspan="6">
        Access denied
        </td>
        </tr>
        `;

        return;

    }


    loadMembers();

});




// ============================================================
// LOAD MEMBERS
// ============================================================

function loadMembers(){


    if(unsubscribe){
        unsubscribe();
    }



    unsubscribe = onSnapshot(
        collection(db,"users"),
        (snapshot)=>{


            let html="";


            snapshot.forEach((docSnap)=>{


                const user = docSnap.data();



                const initials =
                user.name ?
                user.name.charAt(0).toUpperCase()
                :
                "U";


                const status =
                user.active === true
                ?
                "active"
                :
                (user.status || "pending");



                const membership =
                user.membership || "free";



                html += `

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
                ${user.role || "member"}
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
                data-id="${docSnap.id}">
                Manage
                </button>


                </td>


                </tr>

                `;


            });



            table.innerHTML = html;


            attachButtons();


        }

    );


}




// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(date){

    if(!date)
    return "--";


    try{

        if(date.toDate)
        return date.toDate().toLocaleDateString();


        return new Date(date)
        .toLocaleDateString();


    }
    catch{

        return "--";

    }

}




// ============================================================
// BUTTON EVENTS
// ============================================================

function attachButtons(){


document.querySelectorAll(".manage-btn")
.forEach(btn=>{


btn.onclick=()=>{

openMember(btn.dataset.id);

};


});


}




// ============================================================
// OPEN MEMBER
// ============================================================


async function openMember(id){


const snap =
await getDoc(
doc(db,"users",id)
);



if(!snap.exists()){

alert("Member not found");
return;

}



selectedUser =
{
id,
...snap.data()
};



modalName.textContent =
selectedUser.name || "Unknown";


modalEmail.textContent =
selectedUser.email || "--";


modalRole.textContent =
selectedUser.role || "member";



modalPayment.textContent =
selectedUser.payment || "Unpaid";



modalStatus.textContent =
selectedUser.active
?
"Active"
:
(selectedUser.status || "Pending");



modalJoined.textContent =
formatDate(selectedUser.createdAt);



memberAvatar.textContent =
(selectedUser.name || "U")
.charAt(0)
.toUpperCase();



modal.style.display="flex";


}





// ============================================================
// APPROVE MEMBER
// ============================================================

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
selectedUser.membership || "free"

}

);



alert(
"Member Approved"
);



modal.style.display="none";


loadMembers();


});




// ============================================================
// MAKE PREMIUM
// ============================================================

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



alert(
"Member upgraded to Premium"
);



modal.style.display="none";


loadMembers();


});





// ============================================================
// MAKE ADMIN
// ============================================================

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



alert(
"Administrator access granted"
);



modal.style.display="none";


loadMembers();


});





// ============================================================
// SUSPEND
// ============================================================

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



alert(
"Member suspended"
);



modal.style.display="none";


loadMembers();


});




// ============================================================
// DELETE
// ============================================================

deleteBtn?.addEventListener(
"click",
async()=>{


if(!selectedUser)
return;



if(!confirm("Delete member permanently?"))
return;



await deleteDoc(
doc(db,"users",selectedUser.id)
);



alert(
"Member deleted"
);



modal.style.display="none";


loadMembers();


});





// ============================================================
// CLOSE MODAL
// ============================================================

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




// ============================================================
// SEARCH
// ============================================================

search?.addEventListener(
"input",
()=>{


const term =
search.value.toLowerCase();



document.querySelectorAll(
"#membersTable tr"
)
.forEach(row=>{


row.style.display =
row.textContent
.toLowerCase()
.includes(term)
?
""
:
"none";


});


});