// ============================================================
// GTRADES AXIS™ – ADMIN MEMBERS MANAGEMENT (DEBUG)
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

let selectedUser = null;
let unsubscribeMembers = null;

// ============================================================
// 1. AUTH GUARD – load only if admin
// ============================================================
onAuthStateChanged(auth, async (user) => {
    console.log("🔐 members.js: auth state changed", user ? user.uid : "null");
    if (!user) {
        console.warn("⚠️ members.js: No user, redirecting to login");
        window.location.href = "login.html";
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        console.log("📄 members.js: admin user doc exists?", userDoc.exists());
        if (!userDoc.exists()) {
            console.warn("⚠️ members.js: Admin user doc missing, redirecting to login");
            window.location.href = "login.html";
            return;
        }

        const userData = userDoc.data();
        console.log("👤 members.js: Admin user data:", userData);
        if (userData.role !== "admin") {
            console.warn("⚠️ members.js: User role is not admin:", userData.role);
            table.innerHTML = `
                <tr><td colspan="6" style="text-align:center;padding:40px;color:#ff4d4f;">
                    <i class="fa-solid fa-lock" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                    Access Denied. Admin only.
                </td></tr>
            `;
            return;
        }

        console.log("✅ members.js: Admin verified, loading members...");
        loadMembersRealtime();
    } catch (error) {
        console.error("❌ members.js: Auth check failed:", error);
        table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ff4d4f;">Error loading members: ${error.message}</td></tr>`;
    }
});

// ============================================================
// 2. LOAD MEMBERS (real-time)
// ============================================================
function loadMembersRealtime() {
    if (unsubscribeMembers) {
        unsubscribeMembers();
        unsubscribeMembers = null;
    }

    table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;">Loading members...</td></tr>`;

    console.log("🔄 members.js: Setting up onSnapshot for users collection");
    unsubscribeMembers = onSnapshot(collection(db, "users"), (snapshot) => {
        console.log(`📋 members.js: Snapshot received, ${snapshot.size} documents`);
        let html = "";
        if (snapshot.empty) {
            console.warn("⚠️ members.js: No users found");
            table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;">No members found.</td></tr>`;
            return;
        }
        snapshot.forEach(doc => {
            const user = doc.data();
            console.log(`👤 members.js: User: ${user.name} (${user.email}), active: ${user.active}, role: ${user.role}`);
            const initials = user.name ? user.name.charAt(0).toUpperCase() : "U";
            const statusClass = user.active === true ? "active" : (user.status || "pending");
            const roleClass = user.role || "member";

            html += `
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
                        <button class="manage-btn" data-id="${doc.id}">Manage</button>
                    </td>
                </tr>
            `;
        });
        table.innerHTML = html;
        console.log("✅ members.js: Table rendered");
        attachButtons();
    }, (error) => {
        console.error("❌ members.js: Snapshot error:", error);
        table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ff4d4f;">
            Error loading members: ${error.message}
        </td></tr>`;
    });
}

// ============================================================
// 3. DATE FORMATTER
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
// 4. SEARCH
// ============================================================
search.addEventListener("input", () => {
    const value = search.value.toLowerCase().trim();
    const rows = document.querySelectorAll("#membersTable tr");
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(value) ? "" : "none";
    });
});

// ============================================================
// 5. MANAGE BUTTONS
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
// 6. OPEN MEMBER MODAL
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
// 7. MODAL CLOSE
// ============================================================
closeModal.addEventListener("click", () => { modal.style.display = "none"; });
window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.style.display = "none"; });

// ============================================================
// 8. ACTION BUTTONS
// ============================================================
approveBtn.addEventListener("click", async () => {
    if (!selectedUser) {
        alert("No member selected.");
        return;
    }

    try {
        const userRef = doc(db, "users", selectedUser.id);
        await updateDoc(userRef, {
            active: true,
            status: "active"
        });
        alert("Member Approved Successfully.");
        modal.style.display = "none";
        // No need to call loadMembersRealtime() because onSnapshot updates automatically
    } catch (error) {
        console.error("Approval error:", error);
        alert("Failed to approve: " + error.message);
    }
});

premiumBtn.addEventListener("click", async () => {
    if (!selectedUser) return;
    try {
        await updateDoc(doc(db, "users", selectedUser.id), { role: "premium" });
        alert("Member is now Premium.");
        modal.style.display = "none";
    } catch (error) {
        alert("Error: " + error.message);
    }
});

adminBtn.addEventListener("click", async () => {
    if (!selectedUser) return;
    try {
        await updateDoc(doc(db, "users", selectedUser.id), { role: "admin" });
        alert("Member promoted to Administrator.");
        modal.style.display = "none";
    } catch (error) {
        alert("Error: " + error.message);
    }
});

suspendBtn.addEventListener("click", async () => {
    if (!selectedUser) return;
    if (!confirm("Suspend this member?")) return;
    try {
        await updateDoc(doc(db, "users", selectedUser.id), {
            active: false,
            status: "suspended"
        });
        alert("Member Suspended.");
        modal.style.display = "none";
    } catch (error) {
        alert("Error: " + error.message);
    }
});

deleteBtn.addEventListener("click", async () => {
    if (!selectedUser) return;
    if (!confirm("Delete this member permanently?\n\nThis cannot be undone.")) return;
    try {
        await deleteDoc(doc(db, "users", selectedUser.id));
        alert("Member Deleted.");
        modal.style.display = "none";
    } catch (error) {
        alert("Error: " + error.message);
    }
});