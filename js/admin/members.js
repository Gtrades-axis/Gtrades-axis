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

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${user.name || "-"}</td>
            <td>${user.email || "-"}</td>
            <td>${user.role || "pending"}</td>
            <td>${user.paymentStatus || "unpaid"}</td>
            <td>${user.active ? "Active" : "Pending"}</td>
            <td>
                <button class="approve-btn"
                    data-id="${userDoc.id}">
                    Approve
                </button>
            </td>
        `;

        row.querySelector(".approve-btn").addEventListener("click", async () => {

            await updateDoc(doc(db, "users", userDoc.id), {

                active: true,
                premium: true,
                paymentStatus: "paid",
                role: "premium"

            });

            alert("Member Approved");

            loadMembers();

        });

        table.appendChild(row);

    });

}

loadMembers();