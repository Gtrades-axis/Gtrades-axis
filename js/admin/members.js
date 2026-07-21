// ============================================================
// GTRADES AXIS™
// ADMIN MEMBERS MANAGEMENT
// PART 1
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


// ============================================================
// DOM ELEMENTS
// ============================================================

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


// ============================================================
// VARIABLES
// ============================================================

let selectedUser = null;

let unsubscribe = null;


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(date){

    if(!date) return "--";

    try{

        if(date.toDate){

            return date.toDate().toLocaleDateString();

        }

        if(date.seconds){

            return new Date(date.seconds*1000).toLocaleDateString();

        }

        return new Date(date).toLocaleDateString();

    }

    catch{

        return "--";

    }

}


// ============================================================
// AUTH CHECK
// ============================================================

onAuthStateChanged(auth, async(user)=>{

    if(!user){

        window.location.href="login.html";

        return;

    }

    try{

        const adminSnap=await getDoc(doc(db,"users",user.uid));

        if(!adminSnap.exists()){

            table.innerHTML=`
            <tr>
            <td colspan="6" style="padding:40px;text-align:center;">
            Admin profile not found.
            </td>
            </tr>`;

            return;

        }

        const admin=adminSnap.data();

        if(admin.role!=="admin"){

            table.innerHTML=`
            <tr>
            <td colspan="6" style="padding:40px;text-align:center;">
            Access denied.
            </td>
            </tr>`;

            return;

        }

        loadMembersRealtime();

    }

    catch(error){

        console.error(error);

        table.innerHTML=`
        <tr>
        <td colspan="6" style="padding:40px;text-align:center;color:red;">
        ${error.message}
        </td>
        </tr>`;

    }

});


// ============================================================
// LOAD MEMBERS
// ============================================================

function loadMembersRealtime(){

    if(unsubscribe){

        unsubscribe();

    }

    table.innerHTML=`
    <tr>
    <td colspan="6" style="padding:40px;text-align:center;">
    Loading Members...
    </td>
    </tr>`;

    unsubscribe=onSnapshot(

        collection(db,"users"),

        (snapshot)=>{

            if(snapshot.empty){

                table.innerHTML=`
                <tr>
                <td colspan="6" style="padding:40px;text-align:center;">
                No Members Found
                </td>
                </tr>`;

                return;

            }

            let html="";

            snapshot.forEach(member=>{

                const user=member.data();

                const initials=user.name
                ?user.name.charAt(0).toUpperCase()
                :"U";

                let status="pending";

                if(user.active===true){

                    status="active";

                }

                else if(user.status){

                    status=user.status;

                }

                else if(user.role==="pending"){

                    status="pending";

                }

                else{

                    status="inactive";

                }

                html+=`

<tr>

<td>

<div class="user-cell">

<div class="member-avatar-small">

${initials}

</div>

<div>

<strong>${user.name||"Unknown"}</strong>

<br>

<small>${user.email||""}</small>

</div>

</div>

</td>

<td>

<span class="badge ${user.role||"pending"}">

${user.role||"pending"}

</span>

</td>

<td>

<span class="badge ${status}">

${status}

</span>

</td>

<td>

${user.paymentStatus||"Unpaid"}

</td>

<td>

${formatDate(user.createdAt)}

</td>

<td>

<button
class="manage-btn"
data-id="${member.id}">

Manage

</button>

</td>

</tr>

`;

            });

            table.innerHTML=html;

            attachButtons();

        },

        (error)=>{

            console.error(error);

            table.innerHTML=`
            <tr>
            <td colspan="6" style="padding:40px;text-align:center;color:red;">
            ${error.message}
            </td>
            </tr>`;

        }

    );

}
// ============================================================
// ATTACH MANAGE BUTTONS
// ============================================================

function attachButtons() {

    document.querySelectorAll(".manage-btn").forEach(button => {

        button.addEventListener("click", () => {

            openMember(button.dataset.id);

        });

    });

}


// ============================================================
// SEARCH MEMBERS
// ============================================================

search?.addEventListener("input", () => {

    const keyword = search.value.trim().toLowerCase();

    document.querySelectorAll("#membersTable tr").forEach(row => {

        const text = row.innerText.toLowerCase();

        row.style.display = text.includes(keyword)
            ? ""
            : "none";

    });

});


// ============================================================
// OPEN MEMBER
// ============================================================

async function openMember(id) {

    try {

        const snap = await getDoc(doc(db, "users", id));

        if (!snap.exists()) {

            alert("Member not found.");

            return;

        }

        selectedUser = {

            id,
            ...snap.data()

        };

        modalName.textContent =
            selectedUser.name || "Unknown";

        modalEmail.textContent =
            selectedUser.email || "--";

        modalRole.textContent =
            selectedUser.role || "Pending";

        modalPayment.textContent =
            selectedUser.paymentStatus || "Unpaid";

        if (selectedUser.active === true) {

            modalStatus.textContent = "Active";

        }
        else if (selectedUser.status) {

            modalStatus.textContent =
                selectedUser.status;

        }
        else {

            modalStatus.textContent = "Pending";

        }

        modalJoined.textContent =
            formatDate(selectedUser.createdAt);

        memberAvatar.textContent =
            (selectedUser.name || "U")
            .charAt(0)
            .toUpperCase();

        modal.style.display = "flex";

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}


// ============================================================
// CLOSE MODAL
// ============================================================

closeModal?.addEventListener("click", () => {

    modal.style.display = "none";

});

window.addEventListener("click", (event) => {

    if (event.target === modal) {

        modal.style.display = "none";

    }

});

window.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        modal.style.display = "none";

    }

});
// ============================================================
// MEMBER ACTIONS
// ============================================================

const actions = [

{
    btn: approveBtn,

    update: {

        active: true,

        role: "member",

        status: "active"

    },

    message: "Member Approved"

},

{

    btn: premiumBtn,

    update: {

        active: true,

        role: "premium",

        status: "active"

    },

    message: "Member Upgraded to Premium"

},

{

    btn: adminBtn,

    update: {

        active: true,

        role: "admin",

        status: "active"

    },

    message: "Administrator Assigned"

},

{

    btn: suspendBtn,

    update: {

        active: false,

        status: "suspended"

    },

    message: "Member Suspended",

    confirmAction: true

}

];

actions.forEach(action=>{

action.btn?.addEventListener("click",async()=>{

if(!selectedUser)return;

if(action.confirmAction){

const ok=window.confirm(

`Suspend ${selectedUser.name}?`

);

if(!ok)return;

}

try{

await updateDoc(

doc(db,"users",selectedUser.id),

action.update

);

modal.style.display="none";

selectedUser=null;

alert(action.message);

}

catch(error){

console.error(error);

alert(error.message);

}

});

});


// ============================================================
// DELETE MEMBER
// ============================================================

deleteBtn?.addEventListener("click",async()=>{

if(!selectedUser)return;

const ok=window.confirm(

`Delete ${selectedUser.name} permanently?\n\nThis action cannot be undone.`

);

if(!ok)return;

try{

await deleteDoc(

doc(db,"users",selectedUser.id)

);

modal.style.display="none";

selectedUser=null;

alert("Member deleted successfully.");

}

catch(error){

console.error(error);

alert(error.message);

}

});


// ============================================================
// AUTO CLOSE MODAL
// ============================================================

window.addEventListener("usersUpdated",()=>{

if(!selectedUser)return;

const row=document.querySelector(

`button[data-id="${selectedUser.id}"]`

);

if(!row){

modal.style.display="none";

selectedUser=null;

}

});


// ============================================================
// REFRESH EVENT
// ============================================================

window.addEventListener("focus",()=>{

if(typeof loadMembersRealtime==="function"){

loadMembersRealtime();

}

});


// ============================================================
// CLEANUP
// ============================================================

window.addEventListener("beforeunload",()=>{

if(unsubscribe){

unsubscribe();

}

});


// ============================================================
// MEMBERS.JS LOADED
// ============================================================

console.log("✅ GTRADES AXIS MEMBERS MANAGER LOADED");