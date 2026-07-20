// ============================================================
// GTRADES AXIS™ – ADMIN MEMBERS MANAGEMENT (FIXED)
// ============================================================

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

// ─── AUTH GUARD ─────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    console.log("🔥 members.js: onAuthStateChanged triggered. User:", user?.uid);

    if (!user) {
        console.warn("⛔ Not logged in – redirecting to login.");
        window.location.href = "login.html";
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        console.log("📄 Admin user document exists?", userDoc.exists());

        if (!userDoc.exists()) {
            console.warn("⛔ Admin user document not found.");
            table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ff4d4f;">Admin profile not found.</td></tr>`;
            return;
        }

        const userData = userDoc.data();
        console.log("👤 Admin data:", userData);

        if (userData.role !== "admin") {
            console.warn("⛔ User is not admin. Role:", userData.role);
            table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ff4d4f;">Access Denied. Admin only.</td></tr>`;
            return;
        }

        console.log("✅ Admin verified. Loading members...");
        loadMembersRealtime();

    } catch (error) {
        console.error("❌ Auth check error:", error);
        table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ff4d4f;">Error: ${error.message}</td></tr>`;
    }
});

// ─── LOAD MEMBERS ──────────────────────────────────────────────
function loadMembersRealtime() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }

    table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;">Loading members...</td></tr>`;

    unsubscribe = onSnapshot(collection(db, "users"),
        (snapshot) => {
            console.log(`📦 Received ${snapshot.size} users from Firestore.`);
            let html = "";
            if (snapshot.empty) {
                table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;">No members found.</td></tr>`;
                return;
            }
            snapshot.forEach(doc => {
                const user = doc.data();
                const initials = user.name ? user.name.charAt(0).toUpperCase() : "U";
                const statusClass = user.active === true ? "active" : (user.status || "pending");
                html += `
                    <tr>
                        <td>
                            <div class="user-cell">
                                <div class="member-avatar-small">${initials}</div>
                                <div><strong>${user.name || "Unknown"}</strong><br><small>${user.email || ""}</small></div>
                            </div>
                        </td>
                        <td><span class="badge ${user.role || "member"}">${user.role || "member"}</span></td>
                        <td><span class="badge ${statusClass}">${statusClass}</span></td>
                        <td>${user.payment || "Unpaid"}</td>
                        <td>${formatDate(user.createdAt)}</td>
                        <td><button class="manage-btn" data-id="${doc.id}">Manage</button></td>
                    </tr>
                `;
            });
            table.innerHTML = html;
            attachButtons();
        },
        (error) => {
            console.error("❌ Snapshot error:", error);
            table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ff4d4f;">Error loading members: ${error.message}</td></tr>`;
        }
    );
}

// ─── HELPERS ────────────────────────────────────────────────────
function formatDate(date) {
    if (!date) return "--";
    try {
        if (date.toDate) return date.toDate().toLocaleDateString();
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
        return new Date(date).toLocaleDateString();
    } catch { return "--"; }
}

function attachButtons() {
    document.querySelectorAll(".manage-btn").forEach(btn => {
        btn.addEventListener("click", () => openMember(btn.dataset.id));
    });
}

// ─── SEARCH ────────────────────────────────────────────────────
search?.addEventListener("input", () => {
    const term = search.value.toLowerCase();
    document.querySelectorAll("#membersTable tr").forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? "" : "none";
    });
});

// ─── OPEN MODAL ────────────────────────────────────────────────
async function openMember(id) {
    const snap = await getDoc(doc(db, "users", id));
    if (!snap.exists()) { alert("Member not found."); return; }
    selectedUser = { id, ...snap.data() };
    modalName.textContent = selectedUser.name || "Unknown";
    modalEmail.textContent = selectedUser.email || "--";
    modalRole.textContent = selectedUser.role || "Free";
    modalPayment.textContent = selectedUser.payment || "Unpaid";
    modalStatus.textContent = selectedUser.active ? "Active" : (selectedUser.status || "Pending");
    modalJoined.textContent = formatDate(selectedUser.createdAt);
    memberAvatar.textContent = (selectedUser.name || "U").charAt(0).toUpperCase();
    modal.style.display = "flex";
}

// ─── MODAL CLOSE ───────────────────────────────────────────────
closeModal?.addEventListener("click", () => modal.style.display = "none");
window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.style.display = "none"; });

// ─── ACTIONS ──────────────────────────────────────────────────
const actions = [
    { btn: approveBtn, label: "Approved", update: { active: true, status: "active" } },
    { btn: premiumBtn, label: "Premium", update: { role: "premium" } },
    { btn: adminBtn, label: "Admin", update: { role: "admin" } },
    { btn: suspendBtn, label: "Suspended", update: { active: false, status: "suspended" }, confirm: true },
];
actions.forEach(({ btn, label, update, confirm }) => {
    btn?.addEventListener("click", async () => {
        if (!selectedUser) return;
        if (confirm && !confirm(`Suspend ${selectedUser.name}?`)) return;
        try {
            await updateDoc(doc(db, "users", selectedUser.id), update);
            alert(`Member ${label}.`);
            modal.style.display = "none";
        } catch (e) {
            alert("Error: " + e.message);
        }
    });
});

deleteBtn?.addEventListener("click", async () => {
    if (!selectedUser) return;
    if (!confirm(`Delete ${selectedUser.name} permanently?`)) return;
    try {
        await deleteDoc(doc(db, "users", selectedUser.id));
        alert("Member deleted.");
        modal.style.display = "none";
    } catch (e) {
        alert("Error: " + e.message);
    }
});