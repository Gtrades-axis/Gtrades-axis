import { db } from "../firebase.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const table = document.getElementById("membersTable");

const nameEl = document.getElementById("modalName");
const emailEl = document.getElementById("modalEmail");
const roleEl = document.getElementById("modalRole");
const paymentEl = document.getElementById("modalPayment");
const statusEl = document.getElementById("modalStatus");

let selectedMember = null;

async function loadMembers() {

    const snapshot = await getDocs(collection(db, "users"));

    table.innerHTML = "";

    snapshot.forEach((userDoc) => {

        const user = userDoc.data();

        table.innerHTML += `
        <tr>
            <td>${user.name || ""}</td>
            <td>${user.email || ""}</td>
            <td>${user.role || ""}</td>
            <td>${user.paymentStatus || "unpaid"}</td>
            <td>${user.active ? "Active" : "Pending"}</td>
            <td>
                <button
                    class="approve-btn"
                    onclick="selectMember(
                        '${userDoc.id}',
                        '${user.name}',
                        '${user.email}',
                        '${user.role}',
                        '${user.paymentStatus}',
                        '${user.active}'
                    )">
                    Manage
                </button>
            </td>
        </tr>
        `;
    });

}

loadMembers();

window.selectMember = function (
    id,
    name,
    email,
    role,
    payment,
    active
) {

    selectedMember = id;

    document.getElementById("modalName").textContent = name;
    document.getElementById("modalEmail").textContent = email;
    document.getElementById("modalRole").textContent = role;
    document.getElementById("modalPayment").textContent = payment;
    document.getElementById("modalStatus").textContent =
        active === "true" || active === true
            ? "Active"
            : "Pending";

    document.getElementById("memberModal").style.display = "flex";

};

document.getElementById("approveBtn").onclick = async () => {

    if (!selectedMember) {

        alert("Select a member first.");

        return;

    }

    await updateDoc(doc(db, "users", selectedMember), {

        role: "premium",
        premium: true,
        active: true,
        paymentStatus: "paid"

    });

    alert("Member Approved");

    loadMembers();

};
document.getElementById("closeModal").onclick = () => {

    document.getElementById("memberModal").style.display = "none";

};

window.onclick = (event) => {

    const modal = document.getElementById("memberModal");

    if (event.target === modal) {

        modal.style.display = "none";

    }

};