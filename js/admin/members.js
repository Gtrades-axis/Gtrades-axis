import { db } from "../firebase.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const table = document.getElementById("membersTable");

async function loadMembers() {

    const snapshot = await getDocs(collection(db, "users"));

    table.innerHTML = "";

    snapshot.forEach((userDoc) => {

        const user = userDoc.data();

        table.innerHTML += `

        <tr>

            <td>${user.name}</td>

            <td>${user.email}</td>

            <td>${user.role}</td>

            <td>${user.paymentStatus}</td>

            <td>${user.active ? "Active" : "Pending"}</td>

            <td>

                <button class="approve-btn"

                onclick="approveMember('${userDoc.id}')">

                Approve

                </button>

            </td>

        </tr>

        `;

    });

}

window.approveMember = async function(uid){

    await updateDoc(doc(db,"users",uid),{

        role:"premium",

        active:true,

        premium:true,

        paymentStatus:"paid"

    });

    alert("Member Approved!");

    loadMembers();

}

loadMembers();