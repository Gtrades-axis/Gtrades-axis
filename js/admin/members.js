// js/admin/members.js
import { db, auth } from "../firebase.js";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

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

// Action buttons
const approveBtn = document.getElementById("approveBtn");
const premiumBtn = document.getElementById("premiumBtn");
const adminBtn = document.getElementById("adminBtn");
const suspendBtn = document.getElementById("suspendBtn");
const deleteBtn = document.getElementById("deleteBtn");

let members = [];
let filteredMembers = [];
let selectedUser = null;

// ============================================================
// 1. AUTH GUARD – load only if admin
// ============================================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            window.location.href = "login.html";
            return;
        }

        const userData = userDoc.data();
        if (userData.role !== "admin") {
            table.innerHTML = `
                <tr><td colspan="6" style="text-align:center;padding:40px;color:#ff4d4f;">
                    <i class="fa-solid fa-lock" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                    Access Denied. Admin only.
                </td></tr>
            `;
            return;
        }

        // User is admin – load members
        loadMembersRealtime();
    } catch (error) {
        console.error("Auth check failed:", error);
        table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ff4d4f;">Error loading members: ${error.message}</td></tr>`;
    }
});

// ============================================================
// 2. LOAD MEMBERS (real-time)
// ============================================================
function loadMembersRealtime() {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;">Loading members...</td></tr>`;

    onSnapshot(collection(db, "users"), (snapshot) => {
        members = [];
        snapshot.forEach(doc => {
            members.push({ id: doc.id, ...doc.data() });
        });
        filteredMembers = [...members];
        renderMembers();
    }, (error) => {
        console.error("Snapshot error:", error);
        table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ff4d4f;">
            Error loading members: ${error.message}
        </td></tr>`;
    });
}

// ============================================================
// 3. RENDER TABLE
// ============================================================
function renderMembers() {
    table.innerHTML = "";

    if (filteredMembers.length === 0) {
        table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;">No members found.</td></tr>`;
        return;
    }

    filteredMembers.forEach(user => {
        const initials = user.name ? user.name.charAt(0).toUpperCase() : "U";
        const statusClass = user.active === true ? "active" : (user.status || "pending");
        const roleClass = user.role || "member";

        table.innerHTML += `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="member-avatar-small">${initials}</div>
                        <div>
                            <strong>${user.name || "Unknown"}</strong>
                            <br>
                            <small>${user.email || ""}</small>
                        </div>
                    </div>
                </td>
                <td><span class="badge ${roleClass}">${roleClass}</span></td>
                <td><span class="badge ${statusClass}">${statusClass}</span></td>
                <td>${user.payment || "Unpaid"}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td>
                    <button class="manage-btn" data-id="${user.id}">Manage</button>
                </td>
            </tr>
        `;
    });

    attachButtons();
}

// ============================================================
// 4. DATE FORMATTER
// ============================================================
function formatDate(date) {
    if (!date) return "--";
    try {
        if (date.toDate) return date.toDate().toLocaleDateString();
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
        return new Date(date).toLocaleDateString();
    } catch {
        return "--";
    }
}

// ============================================================
// 5. SEARCH
// ============================================================
search.addEventListener("input", () => {
    const value = search.value.toLowerCase().trim();
    filteredMembers = members.filter(user => {
        return (
            (user.name || "").toLowerCase().includes(value) ||
            (user.email || "").toLowerCase().includes(value) ||
            (user.role || "").toLowerCase().includes(value)
        );
    });
    renderMembers();
});

// ============================================================
// 6. MANAGE BUTTONS
// ============================================================
function attachButtons() {
    document.querySelectorAll(".manage-btn").forEach(button => {
        button.addEventListener("click", () => {
            const id = button.dataset.id;
            openMember(id);
        });
    });
}

// ============================================================
// 7. OPEN MEMBER MODAL
// ============================================================
async function openMember(id) {
    const ref = doc(db, "users", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        alert("Member not found.");
        return;
    }

    selectedUser = { id: id, ...snap.data() };

    modalName.textContent = selectedUser.name || "Unknown";
    modalEmail.textContent = selectedUser.email || "--";
    modalRole.textContent = selectedUser.role || "Free";
    modalPayment.textContent = selectedUser.payment || "Unpaid";
    modalStatus.textContent = selectedUser.active ? "Active" : (selectedUser.status || "Pending");
    modalJoined.textContent = formatDate(selectedUser.createdAt);
    memberAvatar.textContent = (selectedUser.name || "U").charAt(0).toUpperCase();

    modal.style.display = "flex";
}

// ============================================================
// 8. MODAL CLOSE
// ============================================================
closeModal.addEventListener("click", () => { modal.style.display = "none"; });
window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.style.display = "none"; });

// ============================================================
// 9. ACTION BUTTONS
// ============================================================
approveBtn.addEventListener("click", async () => {
    if (!selectedUser) return;
    await updateDoc(doc(db, "users", selectedUser.id), { active: true, status: "active" });
    alert("Member Approved Successfully.");
    modal.style.display = "none";
});

premiumBtn.addEventListener("click", async () => {
    if (!selectedUser) return;
    await updateDoc(doc(db, "users", selectedUser.id), { role: "premium" });
    alert("Member is now Premium.");
    modal.style.display = "none";
});

adminBtn.addEventListener("click", async () => {
    if (!selectedUser) return;
    await updateDoc(doc(db, "users", selectedUser.id), { role: "admin" });
    alert("Member promoted to Administrator.");
    modal.style.display = "none";
});

suspendBtn.addEventListener("click", async () => {
    if (!selectedUser) return;
    if (!confirm("Suspend this member?")) return;
    await updateDoc(doc(db, "users", selectedUser.id), { active: false, status: "suspended" });
    alert("Member Suspended.");
    modal.style.display = "none";
});

deleteBtn.addEventListener("click", async () => {
    if (!selectedUser) return;
    if (!confirm("Delete this member permanently?\n\nThis cannot be undone.")) return;
    await deleteDoc(doc(db, "users", selectedUser.id));
    alert("Member Deleted.");
    modal.style.display = "none";
});