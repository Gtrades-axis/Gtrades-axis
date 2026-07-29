// ============================================================
// GTRADES-AXIS™ ADMIN MEMBERS — TABLE + FUNCTIONAL MODAL
// ============================================================

import { auth, db } from "../firebase.js";

import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ============================================================
// GLOBAL STATE
// ============================================================

let allMembers = [];
let filteredMembers = [];

let currentFilter = "all";
let currentSearch = "";

// ============================================================
// DOM ELEMENTS
// ============================================================

const membersContainer = document.getElementById("membersTable");
const searchInput = document.getElementById("memberSearch");
const filterButtons = document.querySelectorAll("[data-filter]");

const totalMembersEl = document.getElementById("totalMembers");
const premiumMembersEl = document.getElementById("premiumMembers");
const adminMembersEl = document.getElementById("adminMembers");
const pendingMembersEl = document.getElementById("pendingMembers");
const suspendedMembersEl = document.getElementById("suspendedMembers");

// ============================================================
// AUTHENTICATION CHECK
// ============================================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../login.html";
        return;
    }

    try {
        const adminRef = doc(db, "users", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {
            await signOut(auth);
            window.location.href = "../login.html";
            return;
        }

        const adminData = adminSnap.data();

        if (adminData.role !== "admin") {
            await signOut(auth);
            window.location.href = "../index.html";
            return;
        }

        loadMembers();
    } catch (error) {
        console.error("Admin verification error:", error);
    }
});

// ============================================================
// LOAD MEMBERS REALTIME
// ============================================================

function loadMembers() {
    const usersRef = collection(db, "users");

    onSnapshot(
        usersRef,
        snapshot => {
            allMembers = [];

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                allMembers.push({
                    id: docSnap.id,
                    ...data
                });
            });

            updateStatistics();
            applyFilters();
        },
        error => {
            console.error("Members listener error:", error);
            showError("Unable to load members");
        }
    );
}

// ============================================================
// STATISTICS
// ============================================================

function updateStatistics() {
    const total = allMembers.length;
    const premium = allMembers.filter(m => m.membership === "premium").length;
    const admins = allMembers.filter(m => m.role === "admin").length;
    const pending = allMembers.filter(m => !m.active || m.status === "pending").length;
    const suspended = allMembers.filter(m => m.status === "suspended").length;

    if (totalMembersEl) totalMembersEl.textContent = total;
    if (premiumMembersEl) premiumMembersEl.textContent = premium;
    if (adminMembersEl) adminMembersEl.textContent = admins;
    if (pendingMembersEl) pendingMembersEl.textContent = pending;
    if (suspendedMembersEl) suspendedMembersEl.textContent = suspended;
}

// ============================================================
// FILTER SYSTEM
// ============================================================

function applyFilters() {
    filteredMembers = allMembers.filter(member => {
        let matchesSearch = true;

        if (currentSearch) {
            const search = currentSearch.toLowerCase();
            matchesSearch =
                (member.name?.toLowerCase().includes(search) ||
                member.email?.toLowerCase().includes(search));
        }

        let matchesFilter = true;

        switch (currentFilter) {
            case "premium":
                matchesFilter = member.membership === "premium";
                break;
            case "admin":
                matchesFilter = member.role === "admin";
                break;
            case "pending":
                matchesFilter = !member.active || member.status === "pending";
                break;
            case "suspended":
                matchesFilter = member.status === "suspended";
                break;
            case "active":
                matchesFilter = member.active === true;
                break;
            default:
                matchesFilter = true;
        }

        return matchesSearch && matchesFilter;
    });

    renderMembers();
}

// ============================================================
// SEARCH EVENT
// ============================================================

if (searchInput) {
    searchInput.addEventListener("input", e => {
        currentSearch = e.target.value;
        applyFilters();
    });
}

// ============================================================
// FILTER BUTTON EVENTS
// ============================================================

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        filterButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        currentFilter = button.dataset.filter;
        applyFilters();
    });
});

// ============================================================
// RENDER MEMBERS — TABLE
// ============================================================

function renderMembers() {
    if (!membersContainer) return;

    let html = `
        <table class="members-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Membership</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (filteredMembers.length === 0) {
        html += `
            <tr>
                <td colspan="6" class="empty-state">
                    <h3>No Members Found</h3>
                    <p>No users match the current filter.</p>
                </td>
            </tr>
        `;
    } else {
        filteredMembers.forEach(member => {
            html += createMemberRow(member);
        });
    }

    html += `
            </tbody>
        </table>
    `;

    membersContainer.innerHTML = html;
}

// ============================================================
// MEMBER ROW
// ============================================================

function createMemberRow(member) {
    const avatar = member.name ? member.name.charAt(0).toUpperCase() : "U";
    const displayName = member.name || "Unknown User";
    const email = member.email || "";

    let membershipBadge = "Member";
    let membershipClass = "badge-member";

    if (member.role === "admin") {
        membershipBadge = "Admin";
        membershipClass = "badge-admin";
    } else if (member.membership === "premium") {
        membershipBadge = "Premium";
        membershipClass = "badge-premium";
    }

    let statusText = member.active ? "Active" : "Pending";
    let statusClass = member.active ? "status-active" : "status-pending";

    if (member.status === "suspended") {
        statusText = "Suspended";
        statusClass = "status-suspended";
    } else if (member.status === "deleted") {
        statusText = "Deleted";
        statusClass = "status-deleted";
    }

    const paymentIcon = (member.membership === "premium" || member.role === "admin")
        ? '<span class="payment-paid">✓</span>'
        : '<span class="payment-free">—</span>';

    const joinedDate = formatDate(member.createdAt);

    return `
        <tr data-id="${member.id}">
            <td class="user-cell">
                <div class="user-avatar">${avatar}</div>
                <div class="user-info">
                    <div class="user-name">${displayName}</div>
                    <div class="user-email">${email}</div>
                </div>
            </td>
            <td><span class="badge ${membershipClass}">${membershipBadge}</span></td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${paymentIcon}</td>
            <td>${joinedDate}</td>
            <td>
                <button class="btn-view" data-id="${member.id}">View</button>
                <button class="btn-manage" data-id="${member.id}">Manage</button>
            </td>
        </tr>
    `;
}

// ============================================================
// DATE FORMATTER
// ============================================================

function formatDate(timestamp) {
    if (!timestamp) return "N/A";

    try {
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric"
            });
        }
        return new Date(timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    } catch {
        return "N/A";
    }
}

// ============================================================
// ERROR DISPLAY
// ============================================================

function showError(message) {
    if (!membersContainer) return;

    membersContainer.innerHTML = `
        <table class="members-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Membership</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="6" class="error-state">
                        <h3>Error</h3>
                        <p>${message}</p>
                    </td>
                </tr>
            </tbody>
        </table>
    `;
}

// ============================================================
// SINGLE CLICK HANDLER (table + modal buttons)
// ============================================================

document.addEventListener("click", async (e) => {
    // Table View / Manage
    const actionBtn = e.target.closest(".btn-view, .btn-manage");
    if (actionBtn) {
        const id = actionBtn.dataset.id;
        if (id) openMemberModal(id);
        return;
    }

    // Modal action buttons
    const modalBtn = e.target.closest("button[data-id]");
    if (!modalBtn) return;

    const id = modalBtn.dataset.id;
    if (!id) return;

    if (modalBtn.classList.contains("approve-btn")) await approveMember(id);
    else if (modalBtn.classList.contains("premium-btn")) await makePremium(id);
    else if (modalBtn.classList.contains("remove-premium-btn")) await removePremium(id);
    else if (modalBtn.classList.contains("admin-btn")) await makeAdmin(id);
    else if (modalBtn.classList.contains("demote-btn")) await demoteMember(id);
    else if (modalBtn.classList.contains("suspend-btn")) await suspendMember(id);
    else if (modalBtn.classList.contains("activate-btn")) await activateMember(id);
    else if (modalBtn.classList.contains("delete-btn")) await deleteMember(id);
});

// ============================================================
// MEMBER MODAL — CLEAN & SIMPLE (no profile design)
// ============================================================

function openMemberModal(id) {
    const member = allMembers.find(m => m.id === id);
    if (!member) return;

    // Remove old modal if any
    const existingModal = document.getElementById("memberModal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "memberModal";
    modal.className = "member-modal";

    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-box">
            <button class="close-modal">×</button>

            <div class="modal-header">
                <div class="modal-avatar">${member.name ? member.name.charAt(0).toUpperCase() : "U"}</div>
                <div>
                    <h2>${member.name || "Unknown User"}</h2>
                    <p>${member.email || ""}</p>
                    <span class="status-badge ${member.active ? "status-active" : "status-pending"}">
                        ${member.active ? "Active" : "Pending"}
                    </span>
                </div>
            </div>

            <div class="modal-info">
                <p><strong>Role:</strong> ${member.role || "member"}</p>
                <p><strong>Membership:</strong> ${member.membership || "free"}</p>
                <p><strong>Joined:</strong> ${formatDate(member.createdAt)}</p>
            </div>

            <div class="modal-actions-grid">
                <button class="approve-btn" data-id="${member.id}">Approve</button>
                <button class="premium-btn" data-id="${member.id}">Make Premium</button>
                <button class="remove-premium-btn" data-id="${member.id}">Remove Premium</button>
                <button class="admin-btn" data-id="${member.id}">Make Admin</button>
                <button class="demote-btn" data-id="${member.id}">Demote</button>
                <button class="suspend-btn" data-id="${member.id}">Suspend</button>
                <button class="activate-btn" data-id="${member.id}">Activate</button>
                <button class="delete-btn danger" data-id="${member.id}">Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = "flex";

    modal.querySelector(".close-modal").onclick = () => { modal.style.display = "none"; };
    modal.querySelector(".modal-overlay").onclick = () => { modal.style.display = "none"; };
}

// ============================================================
// CRUD FUNCTIONS (with toast notifications)
// ============================================================

async function approveMember(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            active: true,
            status: "active",
            approvedAt: serverTimestamp()
        });
        notify("✅ Member approved");
    } catch (error) {
        console.error(error);
        notify("❌ Error approving member");
    }
}

async function makePremium(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            membership: "premium",
            active: true,
            updatedAt: serverTimestamp()
        });
        notify("⭐ Premium activated");
    } catch (error) {
        console.error(error);
        notify("❌ Error upgrading");
    }
}

async function removePremium(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            membership: "member",
            updatedAt: serverTimestamp()
        });
        notify("⬇️ Premium removed");
    } catch (error) {
        console.error(error);
        notify("❌ Error removing premium");
    }
}

async function makeAdmin(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            role: "admin",
            updatedAt: serverTimestamp()
        });
        notify("🛠️ Admin granted");
    } catch (error) {
        console.error(error);
        notify("❌ Error making admin");
    }
}

async function demoteMember(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            role: "member",
            updatedAt: serverTimestamp()
        });
        notify("⬇️ User demoted");
    } catch (error) {
        console.error(error);
        notify("❌ Error demoting");
    }
}

async function suspendMember(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            active: false,
            status: "suspended",
            updatedAt: serverTimestamp()
        });
        notify("⛔ Suspended");
    } catch (error) {
        console.error(error);
        notify("❌ Error suspending");
    }
}

async function activateMember(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            active: true,
            status: "active",
            updatedAt: serverTimestamp()
        });
        notify("✅ Activated");
    } catch (error) {
        console.error(error);
        notify("❌ Error activating");
    }
}

async function deleteMember(id) {
    if (!confirm("Delete this member?")) return;
    try {
        await updateDoc(doc(db, "users", id), {
            deleted: true,
            active: false,
            status: "deleted",
            updatedAt: serverTimestamp()
        });
        notify("🗑️ Deleted");
    } catch (error) {
        console.error(error);
        notify("❌ Error deleting");
    }
}

// ============================================================
// CSV EXPORT
// ============================================================

window.exportMembersCSV = function () {
    if (allMembers.length === 0) {
        notify("No members");
        return;
    }
    let csv = "Name,Email,Role,Membership,Status,Created\n";
    allMembers.forEach(m => {
        csv += `"${m.name || ""}","${m.email || ""}","${m.role || "member"}","${m.membership || "free"}","${m.status || "active"}","${formatDate(m.createdAt)}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "gtrades-members.csv";
    link.click();
    URL.revokeObjectURL(link.href);
};

// ============================================================
// SORT SYSTEM
// ============================================================

window.sortMembers = function (type) {
    switch (type) {
        case "name":
            filteredMembers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            break;
        case "date":
            filteredMembers.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
            break;
        case "premium":
            filteredMembers.sort((a, b) => {
                if (a.membership === "premium") return -1;
                if (b.membership === "premium") return 1;
                return 0;
            });
            break;
    }
    renderMembers();
};

function getTime(v) {
    if (!v) return 0;
    return v.seconds ? v.seconds * 1000 : new Date(v).getTime();
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================

function notify(message) {
    let toast = document.getElementById("gtradesToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "gtradesToast";
        toast.className = "gtrades-toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const modal = document.getElementById("memberModal");
        if (modal) modal.style.display = "none";
    }
});

// ============================================================
// LIVE SEARCH CLEAR
// ============================================================

window.clearMemberSearch = function () {
    if (searchInput) {
        searchInput.value = "";
        currentSearch = "";
        applyFilters();
    }
};

// ============================================================
// MANUAL REFRESH
// ============================================================

window.reloadMembers = function () {
    loadMembers();
};

// ============================================================
// SECURITY CHECK
// ============================================================

window.checkAdminAccess = async function () {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = "../login.html";
        return false;
    }
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists() || snap.data().role !== "admin") {
        await signOut(auth);
        window.location.href = "../login.html";
        return false;
    }
    return true;
};

// ============================================================
// RESPONSIVE HELPERS
// ============================================================

function handleResponsive() {
    const width = window.innerWidth;
    if (width < 768) {
        document.body.classList.add("mobile-admin");
    } else {
        document.body.classList.remove("mobile-admin");
    }
}
window.addEventListener("resize", handleResponsive);
handleResponsive();

// ============================================================
// GLOBAL DEBUG
// ============================================================

window.GTRADES_ADMIN = {
    members: () => allMembers,
    filtered: () => filteredMembers,
    refresh: reloadMembers,
    export: exportMembersCSV
};

console.log("✅ GTRADES-AXIS™ Admin Members Loaded (modal fixed)");