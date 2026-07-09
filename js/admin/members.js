import { db } from "../firebase.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const table = document.getElementById("membersTable");
const searchMember = document.getElementById("searchMember");

let allMembers = [];

// Stats
const totalMembers = document.getElementById("totalMembers");
const pendingMembers = document.getElementById("pendingMembers");
const premiumMembers = document.getElementById("premiumMembers");
const adminMembers = document.getElementById("adminMembers");

// Modal
const modal = document.getElementById("memberModal");

const closeModal = document.getElementById("closeModal");

const modalName = document.getElementById("modalName");
const modalEmail = document.getElementById("modalEmail");
const modalRole = document.getElementById("modalRole");
const modalPayment = document.getElementById("modalPayment");
const modalStatus = document.getElementById("modalStatus");

let selectedMember = null;

async function loadMembers(){

    const q = query(
        collection(db,"users"),
        orderBy("createdAt","desc")
    );

    const snapshot = await getDocs(q);

    table.innerHTML="";

allMembers=[];

    let total=0;
    let pending=0;
    let premium=0;
    let admins=0;

    snapshot.forEach((member)=>{

        
        allMembers.push({

    id:member.id,

    ...member.data()

});
        const data=member.data();

        total++;

        if(data.role==="pending") pending++;

        if(data.role==="premium") premium++;

        if(data.role==="admin") admins++;

       const badge =
data.role==="admin"
?
'<span class="badge adminBadge">ADMIN</span>'
:
data.role==="premium"
?
'<span class="badge premiumBadge">PREMIUM</span>'
:
'<span class="badge pendingBadge">PENDING</span>';

const status =
data.active
?
'<span class="status activeStatus">ACTIVE</span>'
:
'<span class="status pendingStatus">PENDING</span>';

table.innerHTML+=`

<tr>

<td>${data.name}</td>

<td>${data.email}</td>

<td>${badge}</td>

<td>${data.paymentStatus}</td>

<td>${status}</td>

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

    totalMembers.textContent=total;
    pendingMembers.textContent=pending;
    premiumMembers.textContent=premium;
    adminMembers.textContent=admins;

    document.querySelectorAll(".manage-btn").forEach(btn=>{

        btn.onclick=()=>{

            const id=btn.dataset.id;

            snapshot.forEach((member)=>{

                if(member.id===id){

                    selectedMember={
                        id,
                        ...member.data()
                    };

                }

            });

            modalName.textContent=selectedMember.name;
            modalEmail.textContent=selectedMember.email;
            modalRole.textContent=selectedMember.role;
            modalPayment.textContent=selectedMember.paymentStatus;
            modalStatus.textContent=
                selectedMember.active ? "Active":"Pending";

            modal.style.display="flex";

        };

    });

}

closeModal.onclick=()=>{

    modal.style.display="none";

};

window.onclick=(e)=>{

    if(e.target===modal){

        modal.style.display="none";

    }

};

document.getElementById("approveBtn").onclick=async()=>{

    if(!selectedMember) return;

    await updateDoc(doc(db,"users",selectedMember.id),{

        active:true,

        paymentStatus:"paid"

    });

    modal.style.display="none";

    loadMembers();

};

document.getElementById("premiumBtn").onclick=async()=>{

    if(!selectedMember) return;

    await updateDoc(doc(db,"users",selectedMember.id),{

        role:"premium",

        premium:true

    });

    modal.style.display="none";

    loadMembers();

};

document.getElementById("adminBtn").onclick=async()=>{

    if(!selectedMember) return;

    await updateDoc(doc(db,"users",selectedMember.id),{

        role:"admin",

        premium:true,

        active:true

    });

    modal.style.display="none";

    loadMembers();

};

document.getElementById("suspendBtn").onclick=async()=>{

    if(!selectedMember) return;

    await updateDoc(doc(db,"users",selectedMember.id),{

        active:false

    });

    modal.style.display="none";

    loadMembers();

};

document.getElementById("deleteBtn").onclick=async()=>{

    if(!selectedMember) return;

    if(!confirm("Delete this member?")) return;

    await deleteDoc(doc(db,"users",selectedMember.id));

    modal.style.display="none";

    loadMembers();

};

loadMembers();
searchMember.addEventListener("keyup",()=>{

const keyword=searchMember.value.toLowerCase();

const rows=document.querySelectorAll("#membersTable tr");

rows.forEach(row=>{

const text=row.innerText.toLowerCase();

row.style.display=
text.includes(keyword)
?
""
:
"none";

});

});