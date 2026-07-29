// ============================================================
// GTRADES-AXIS™
// ADMIN MEMBERS MANAGEMENT — TABLE VERSION
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
// RENDER MEMBERS — TABLE VERSION
// ============================================================

function renderMembers() {
    if (!membersContainer) return;

    // Build the full table HTML (header + rows)
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
// MEMBER ROW — TABLE ROW
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

    // Payment indicator: show a check or dash based on membership
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
// REFRESH FUNCTION
// ============================================================

window.refreshMembers = function () {
    updateStatistics();
    applyFilters();
};


// ============================================================
// MEMBER ACTION EVENT HANDLER
// ============================================================

document.addEventListener("click", async (e) => {
    const target = e.target;

    if (target.classList.contains("btn-manage") || target.classList.contains("btn-view")) {
        const id = target.dataset.id;
        openMemberModal(id);
    }
});


// ============================================================
// MEMBER MODAL
// ============================================================

function openMemberModal(id) {
    const member = allMembers.find(m => m.id === id);
    if (!member) return;

    let modal = document.getElementById("memberModal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "memberModal";
        modal.className = "member-modal";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-box">
            <button class="close-modal">×</button>
            <h2>Member Management</h2>
            <div class="modal-profile">
                <h3>${member.name || "Unknown"}</h3>
                <p>${member.email || ""}</p>
            </div>
            <div class="modal-details">
                <p>Role: <strong>${member.role || "member"}</strong></p>
                <p>Membership: <strong>${member.membership || "free"}</strong></p>
                <p>Status: <strong>${member.active ? "Active" : "Inactive"}</strong></p>
            </div>
            <div class="modal-actions">
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

    modal.style.display = "flex";

    modal.querySelector(".close-modal").onclick = () => {
        modal.style.display = "none";
    };
}


// ============================================================
// MODAL BUTTON ACTIONS
// ============================================================

document.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("approve-btn")) {
        await approveMember(id);
    } else if (e.target.classList.contains("premium-btn")) {
        await makePremium(id);
    } else if (e.target.classList.contains("remove-premium-btn")) {
        await removePremium(id);
    } else if (e.target.classList.contains("admin-btn")) {
        await makeAdmin(id);
    } else if (e.target.classList.contains("demote-btn")) {
        await demoteMember(id);
    } else if (e.target.classList.contains("suspend-btn")) {
        await suspendMember(id);
    } else if (e.target.classList.contains("activate-btn")) {
        await activateMember(id);
    } else if (e.target.classList.contains("delete-btn")) {
        await deleteMember(id);
    }
});


// ============================================================
// APPROVE MEMBER
// ============================================================

async function approveMember(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            active: true,
            status: "active",
            approvedAt: serverTimestamp()
        });
        notify("Member approved");
    } catch (error) {
        console.error(error);
    }
}


// ============================================================
// MAKE PREMIUM
// ============================================================

async function makePremium(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            membership: "premium",
            active: true,
            updatedAt: serverTimestamp()
        });
        notify("Premium membership activated");
    } catch (error) {
        console.error(error);
    }
}


// ============================================================
// REMOVE PREMIUM
// ============================================================

async function removePremium(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            membership: "member",
            updatedAt: serverTimestamp()
        });
        notify("Premium removed");
    } catch (error) {
        console.error(error);
    }
}


// ============================================================
// MAKE ADMIN
// ============================================================

async function makeAdmin(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            role: "admin",
            updatedAt: serverTimestamp()
        });
        notify("Admin privileges granted");
    } catch (error) {
        console.error(error);
    }
}


// ============================================================
// DEMOTE MEMBER
// ============================================================

async function demoteMember(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            role: "member",
            updatedAt: serverTimestamp()
        });
        notify("User demoted");
    } catch (error) {
        console.error(error);
    }
}


// ============================================================
// SUSPEND MEMBER
// ============================================================

async function suspendMember(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            active: false,
            status: "suspended",
            updatedAt: serverTimestamp()
        });
        notify("Member suspended");
    } catch (error) {
        console.error(error);
    }
}


// ============================================================
// ACTIVATE MEMBER
// ============================================================

async function activateMember(id) {
    try {
        await updateDoc(doc(db, "users", id), {
            active: true,
            status: "active",
            updatedAt: serverTimestamp()
        });
        notify("Member activated");
    } catch (error) {
        console.error(error);
    }
}


// ============================================================
// DELETE MEMBER
// ============================================================

async function deleteMember(id) {
    const confirmDelete = confirm("Are you sure you want to delete this member?");
    if (!confirmDelete) return;

    try {
        await updateDoc(doc(db, "users", id), {
            deleted: true,
            active: false,
            status: "deleted",
            updatedAt: serverTimestamp()
        });
        notify("Member removed");
    } catch (error) {
        console.error("Delete error:", error);
    }
}


// ============================================================
// CSV EXPORT
// ============================================================

window.exportMembersCSV = function () {
    if (allMembers.length === 0) {
        notify("No members available");
        return;
    }

    let csv = "Name,Email,Role,Membership,Status,Created\n";

    allMembers.forEach(member => {
        csv +=
            `"${member.name || ""}",` +
            `"${member.email || ""}",` +
            `"${member.role || "member"}",` +
            `"${member.membership || "free"}",` +
            `"${member.status || "active"}",` +
            `"${formatDate(member.createdAt)}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gtrades-members.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};


// ============================================================
// SORT SYSTEM
// ============================================================

window.sortMembers = function (type) {
    switch (type) {
        case "name":
            filteredMembers.sort((a, b) =>
                (a.name || "").localeCompare(b.name || "")
            );
            break;
        case "date":
            filteredMembers.sort((a, b) =>
                getTime(b.createdAt) - getTime(a.createdAt)
            );
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


// ============================================================
// TIME HELPER
// ============================================================

function getTime(value) {
    if (!value) return 0;
    if (value.seconds) return value.seconds * 1000;
    return new Date(value).getTime();
}


// ============================================================
// NOTIFICATION SYSTEM
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

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


// ============================================================
// CLOSE MODAL OUTSIDE CLICK
// ============================================================

document.addEventListener("click", (e) => {
    const modal = document.getElementById("memberModal");
    if (modal && e.target.classList.contains("modal-overlay")) {
        modal.style.display = "none";
    }
});


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


// ============================================================
// INITIAL LOG
// ============================================================

console.log("GTRADES-AXIS™ Admin Members Loaded (Table Version)");

// ============================================================
// END ADMIN-MEMBERS.JS
// ============================================================