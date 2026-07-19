import { db } from "../firebase.js";

import {
collection,
getDocs,
doc,
getDoc,
updateDoc,
deleteDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
/* ===========================================
ELEMENTS
=========================================== */

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

/* ===========================================
DATA
=========================================== */

let members = [];

let filteredMembers = [];

let selectedUser = null;

/* ===========================================
LOAD MEMBERS
=========================================== */

loadMembers();

async function loadMembers(){

    table.innerHTML=`

    <tr>

        <td colspan="6" style="text-align:center;padding:40px;">

            Loading members...

        </td>

    </tr>

    `;

    members=[];

    const snapshot = await getDocs(collection(db,"users"));

    snapshot.forEach(doc=>{

        members.push({

            id:doc.id,

            ...doc.data()

        });

    });

    filteredMembers=[...members];

    renderMembers();

}

/* ===========================================
RENDER TABLE
=========================================== */

function renderMembers(){

    table.innerHTML="";

    if(filteredMembers.length===0){

        table.innerHTML=`

        <tr>

            <td colspan="6" style="text-align:center;padding:40px;">

                No members found.

            </td>

        </tr>

        `;

        return;

    }

    filteredMembers.forEach(user=>{

        const initials =

        user.name ?

        user.name.charAt(0).toUpperCase()

        :"U";

        table.innerHTML+=`

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

                <span class="badge ${user.role || "free"}">

                    ${user.role || "free"}

                </span>

            </td>

            <td>

                <span class="badge ${user.status || "pending"}">

                    ${user.status || "pending"}

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

                data-id="${user.id}">

                Manage

                </button>

            </td>

        </tr>

        `;

    });

    attachButtons();

}

/* ===========================================
DATE
=========================================== */

function formatDate(date){

    if(!date) return "--";

    try{

        return date.toDate().toLocaleDateString();

    }

    catch{

        return "--";

    }

}
/* ===========================================
PART 4B
SEARCH + MODAL
=========================================== */

/* ==========================
SEARCH
========================== */

search.addEventListener("input",()=>{

    const value=search.value.toLowerCase().trim();

    filteredMembers=members.filter(user=>{

        return(

            (user.name || "").toLowerCase().includes(value) ||

            (user.email || "").toLowerCase().includes(value) ||

            (user.role || "").toLowerCase().includes(value)

        );

    });

    renderMembers();

});

/* ==========================
MANAGE BUTTONS
========================== */

function attachButtons(){

    const buttons=document.querySelectorAll(".manage-btn");

    buttons.forEach(button=>{

        button.addEventListener("click",()=>{

            const id=button.dataset.id;

            openMember(id);

        });

    });

}

/* ==========================
OPEN MEMBER
========================== */

async function openMember(id){

    const ref=doc(db,"users",id);

    const snap=await getDoc(ref);

    if(!snap.exists()){

        alert("Member not found.");

        return;

    }

    selectedUser={

        id:id,

        ...snap.data()

    };

    modalName.textContent=selectedUser.name || "Unknown";

    modalEmail.textContent=selectedUser.email || "--";

    modalRole.textContent=selectedUser.role || "Free";

    modalPayment.textContent=selectedUser.payment || "Unpaid";

    modalStatus.textContent=selectedUser.status || "Pending";

    modalJoined.textContent=formatDate(selectedUser.createdAt);

    memberAvatar.textContent=

        (selectedUser.name || "U")

        .charAt(0)

        .toUpperCase();

    modal.style.display="flex";

}

/* ==========================
CLOSE MODAL
========================== */

closeModal.addEventListener("click",()=>{

    modal.style.display="none";

});

window.addEventListener("click",(e)=>{

    if(e.target===modal){

        modal.style.display="none";

    }

});

/* ==========================
ESC KEY
========================== */

window.addEventListener("keydown",(e)=>{

    if(e.key==="Escape"){

        modal.style.display="none";

    }

});
/* ===========================================
PART 4C
MEMBER ACTIONS
=========================================== */


/* ==========================
BUTTONS
========================== */

const approveBtn=document.getElementById("approveBtn");
const premiumBtn=document.getElementById("premiumBtn");
const adminBtn=document.getElementById("adminBtn");
const suspendBtn=document.getElementById("suspendBtn");
const deleteBtn=document.getElementById("deleteBtn");

/* ==========================
APPROVE MEMBER
========================== */

approveBtn.addEventListener("click",async()=>{

    if(!selectedUser) return;

    await updateDoc(doc(db,"users",selectedUser.id),{

        status:"active"

    });

    alert("Member Approved Successfully.");

    modal.style.display="none";

    loadMembers();

});

/* ==========================
MAKE PREMIUM
========================== */

premiumBtn.addEventListener("click",async()=>{

    if(!selectedUser) return;

    await updateDoc(doc(db,"users",selectedUser.id),{

        role:"premium"

    });

    alert("Member is now Premium.");

    modal.style.display="none";

    loadMembers();

});

/* ==========================
MAKE ADMIN
========================== */

adminBtn.addEventListener("click",async()=>{

    if(!selectedUser) return;

    await updateDoc(doc(db,"users",selectedUser.id),{

        role:"admin"

    });

    alert("Member promoted to Administrator.");

    modal.style.display="none";

    loadMembers();

});

/* ==========================
SUSPEND
========================== */

suspendBtn.addEventListener("click",async()=>{

    if(!selectedUser) return;

    if(!confirm("Suspend this member?")) return;

    await updateDoc(doc(db,"users",selectedUser.id),{

        status:"suspended"

    });

    alert("Member Suspended.");

    modal.style.display="none";

    loadMembers();

});

/* ==========================
DELETE
========================== */

deleteBtn.addEventListener("click",async()=>{

    if(!selectedUser) return;

    const confirmDelete=confirm(

        "Delete this member permanently?\n\nThis cannot be undone."

    );

    if(!confirmDelete) return;

    await deleteDoc(

        doc(db,"users",selectedUser.id)

    );

    alert("Member Deleted.");

    modal.style.display="none";

    loadMembers();

});