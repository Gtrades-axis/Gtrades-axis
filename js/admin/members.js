import { db } from "../firebase.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,F
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const table = document.getElementById("membersTable");

const totalMembers = document.getElementById("totalMembers");
const pendingMembers = document.getElementById("pendingMembers");
const premiumMembers = document.getElementById("premiumMembers");
const adminMembers = document.getElementById("adminMembers");

const searchBox = document.getElementById("searchMembers");

// Modal

const modal = document.getElementById("memberModal");

const closeModal = document.getElementById("closeModal");

const modalName = document.getElementById("modalName");
const modalEmail = document.getElementById("modalEmail");
const modalRole = document.getElementById("modalRole");
const modalPayment = document.getElementById("modalPayment");
const modalStatus = document.getElementById("modalStatus");

let members = [];
let selectedMember = null;
// =============================
// LOAD MEMBERS
// =============================

async function loadMembers() {

    try {

        const snapshot = await getDocs(collection(db, "users"));

        members = [];

        let total = 0;
        let pending = 0;
        let premium = 0;
        let admins = 0;

        snapshot.forEach((doc) => {

            const data = {

                id: doc.id,

                ...doc.data()

            };

            members.push(data);

            total++;

            if (data.active === false) pending++;

            if (data.premium === true) premium++;

            if (data.role === "admin") admins++;

        });

        totalMembers.textContent = total;
        pendingMembers.textContent = pending;
        premiumMembers.textContent = premium;
        adminMembers.textContent = admins;

        displayMembers(members);

    }

    catch (error) {

        console.error(error);

    }

}

// =============================
// DISPLAY TABLE
// =============================

function displayMembers(list) {

    table.innerHTML = "";

    list.forEach(member => {

        table.innerHTML += `

        <tr>

            <td>${member.name || "-"}</td>

            <td>${member.email || "-"}</td>

            <td>${member.role}</td>

            <td>${member.paymentStatus || "unpaid"}</td>

            <td>${member.active ? "Active" : "Pending"}</td>

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

    addManageEvents();

}

// =============================
// SEARCH
// =============================

searchBox.addEventListener("input", () => {

    const keyword = searchBox.value.toLowerCase();

    const filtered = members.filter(member =>

        member.name.toLowerCase().includes(keyword) ||

        member.email.toLowerCase().includes(keyword)

    );

    displayMembers(filtered);

});

// =============================
// MODAL
// =============================

function addManageEvents() {

    const buttons = document.querySelectorAll(".manage-btn");

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            const id = button.dataset.id;

            const member = members.find(user => user.id === id);
            selectedMember = member;

            if (!member) return;

            modal.style.display = "flex";

            modalName.textContent = member.name;

            modalEmail.textContent = member.email;

            modalRole.textContent = member.role;

            modalPayment.textContent = member.paymentStatus || "unpaid";

            modalStatus.textContent = member.active
                ? "Active"
                : "Pending";

        });

    });

}

// =============================
// CLOSE
// =============================

closeModal.onclick = () => {

    modal.style.display = "none";

}

window.onclick = (e) => {

    if (e.target == modal) {

        modal.style.display = "none";

    }

}

// =============================

loadMembers();
// ===================================
// APPROVE MEMBER
// ===================================

document.getElementById("approveBtn").onclick = async () => {

    if (!selectedMember) return;

    await updateDoc(doc(db, "users", selectedMember.id), {

        active: true,
        paymentStatus: "paid"

    });

    modal.style.display = "none";

    loadMembers();

};

// ===================================
// MAKE PREMIUM
// ===================================

document.getElementById("premiumBtn").onclick = async () => {

    if (!selectedMember) return;

    await updateDoc(doc(db, "users", selectedMember.id), {

        premium: true,
        role: "premium"

    });

    modal.style.display = "none";

    loadMembers();

};

// ===================================
// MAKE ADMIN
// ===================================

document.getElementById("adminBtn").onclick = async () => {

    if (!selectedMember) return;

    await updateDoc(doc(db, "users", selectedMember.id), {

        role: "admin",
        premium: true,
        active: true

    });

    modal.style.display = "none";

    loadMembers();

};

// ===================================
// SUSPEND
// ===================================

document.getElementById("suspendBtn").onclick = async () => {

    if (!selectedMember) return;

    await updateDoc(doc(db, "users", selectedMember.id), {

        active: false

    });

    modal.style.display = "none";

    loadMembers();

};

// ===================================
// DELETE MEMBER
// ===================================

document.getElementById("deleteBtn").onclick = async () => {

    if (!selectedMember) return;

    const confirmDelete = confirm(
        "Delete this member?"
    );

    if (!confirmDelete) return;

    await deleteDoc(
        doc(db, "users", selectedMember.id)
    );

    modal.style.display = "none";

    loadMembers();

};