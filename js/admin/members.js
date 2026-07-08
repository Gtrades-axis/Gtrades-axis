import { db } from "../firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const table = document.getElementById("membersTable");

async function loadMembers() {

    const snapshot = await getDocs(collection(db, "users"));
    console.log("Users:", snapshot.size);

    table.innerHTML = "";

    snapshot.forEach(doc => {

        const data = doc.data();

        table.innerHTML += `

        <tr>

            <td>${data.name}</td>

            <td>${data.email}</td>

            <td>${data.role}</td>

            <td>${data.paymentStatus || "unpaid"}</td>

            <td>${data.active ? "Active" : "Pending"}</td>

            <td>

                <button class="approve-btn">

                    Manage

                </button>

            </td>

        </tr>

        `;

    });

}

loadMembers();
