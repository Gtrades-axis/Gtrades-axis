<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GTRADES-AXIS™ Admin – Members</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', sans-serif;
            background: #0b0d15;
            color: #e8edf5;
            padding: 30px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            font-size: 28px;
            margin-bottom: 20px;
        }
        .search-box {
            margin-bottom: 20px;
        }
        .search-box input {
            background: #1a1f2f;
            border: 1px solid #2a3450;
            border-radius: 8px;
            padding: 10px 16px;
            color: #fff;
            width: 300px;
            font-size: 14px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: #131724;
            border-radius: 12px;
            overflow: hidden;
        }
        th {
            background: #1a1f2f;
            padding: 14px 16px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #8ea2c0;
        }
        td {
            padding: 12px 16px;
            border-bottom: 1px solid #1a1f2f;
        }
        .user-cell {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .member-avatar-small {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #2a4b8c;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 16px;
            color: #fff;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: #2a3450;
            color: #b0c8ff;
        }
        .manage-btn {
            background: #4f7cff;
            border: none;
            color: #fff;
            padding: 6px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: 0.2s;
        }
        .manage-btn:hover {
            background: #3a66e0;
        }

        /* ===== MODAL ===== */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(4px);
            z-index: 999;
            justify-content: center;
            align-items: center;
        }
        .modal.active {
            display: flex;
        }
        .modal-content {
            background: #1a1f2f;
            border-radius: 16px;
            padding: 30px;
            max-width: 480px;
            width: 90%;
            border: 1px solid #2a3450;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            position: relative;
        }
        .close {
            position: absolute;
            top: 14px;
            right: 20px;
            font-size: 28px;
            cursor: pointer;
            color: #8ea2c0;
        }
        .close:hover {
            color: #fff;
        }
        .modal-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
        }
        .modal-avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #2a4b8c;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 700;
            color: #fff;
        }
        .modal-header h2 {
            font-size: 22px;
        }
        .modal-header p {
            color: #8ea2c0;
            font-size: 14px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #1a1f2f;
        }
        .detail-row .label {
            color: #8ea2c0;
            font-weight: 500;
        }
        .modal-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 24px;
        }
        .btn-action {
            padding: 8px 18px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: 0.2s;
            background: #2a3450;
            color: #b0c8ff;
        }
        .btn-action:hover {
            background: #3a4a6a;
        }
        .btn-warning {
            background: #f5a623;
            color: #0b0d15;
        }
        .btn-warning:hover {
            background: #e69500;
        }
        .btn-danger {
            background: #ff4766;
            color: #fff;
        }
        .btn-danger:hover {
            background: #e63555;
        }
        .btn-action:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
    </style>
</head>
<body>

    <div class="container">
        <h1>👥 Member Management</h1>

        <div class="search-box">
            <input type="text" id="memberSearch" placeholder="Search members...">
        </div>

        <table>
            <thead>
                <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Membership</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Joined</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody id="membersTable">
                <!-- populated by JS -->
            </tbody>
        </table>
    </div>

    <!-- ===== MODAL ===== -->
    <div id="memberModal" class="modal">
        <div class="modal-content">
            <span id="closeModal" class="close">&times;</span>
            <div class="modal-header">
                <div class="modal-avatar" id="memberAvatar">U</div>
                <div>
                    <h2 id="modalName">User Name</h2>
                    <p id="modalEmail">user@email.com</p>
                </div>
            </div>

            <div class="modal-body">
                <div class="detail-row">
                    <span class="label">Role</span>
                    <span id="modalRole">member</span>
                </div>
                <div class="detail-row">
                    <span class="label">Membership</span>
                    <span id="modalStatus">free</span>
                </div>
                <div class="detail-row">
                    <span class="label">Payment</span>
                    <span id="modalPayment">Unpaid</span>
                </div>
                <div class="detail-row">
                    <span class="label">Joined</span>
                    <span id="modalJoined">--</span>
                </div>
            </div>

            <div class="modal-actions">
                <button id="approveBtn" class="btn-action">✅ Approve</button>
                <button id="premiumBtn" class="btn-action">⭐ Make Premium</button>
                <button id="adminBtn" class="btn-action">👑 Make Admin</button>
                <button id="memberBtn" class="btn-action">👤 Remove Admin</button>
                <button id="demoteBtn" class="btn-action btn-warning">⬇️ Demote to Premium Member</button>
                <button id="suspendBtn" class="btn-action btn-danger">⛔ Suspend</button>
                <button id="deleteBtn" class="btn-action btn-danger">🗑️ Delete</button>
            </div>
        </div>
    </div>

    <!-- ===== JAVASCRIPT (all in one file) ===== -->
    <script type="module">
        // ============================================================
        // GTRADES AXIS™ – ADMIN MEMBERS MANAGEMENT
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
        import {
            onAuthStateChanged
        } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

        // ================= DOM =================

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
        const memberBtn = document.getElementById("memberBtn");
        const demoteBtn = document.getElementById("demoteBtn");
        const suspendBtn = document.getElementById("suspendBtn");
        const deleteBtn = document.getElementById("deleteBtn");

        let selectedUser = null;
        let unsubscribe = null;

        // ================= ADMIN CHECK =================

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = "../login.html";
                return;
            }

            const snap = await getDoc(doc(db, "users", user.uid));

            if (!snap.exists() || snap.data().role !== "admin") {
                table.innerHTML = `<tr><td colspan="6">Access Denied</td></tr>`;
                return;
            }

            loadMembers();
        });

        // ================= LOAD MEMBERS =================

        function loadMembers() {
            if (unsubscribe) unsubscribe();

            unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
                let html = "";

                snapshot.forEach((item) => {
                    const user = item.data();

                    const role = user.role || "member";
                    const membership = user.membership || "free";
                    const status = user.active === true ? "active" : (user.status || "pending");

                    const initials = (user.name || "U").charAt(0).toUpperCase();

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
                            <td><span class="badge">${role}</span></td>
                            <td><span class="badge">${membership}</span></td>
                            <td><span class="badge">${status}</span></td>
                            <td>${user.payment || "Unpaid"}</td>
                            <td>${formatDate(user.createdAt)}</td>
                            <td>
                                <button class="manage-btn" data-id="${item.id}">Manage</button>
                            </td>
                        </tr>
                    `;
                });

                table.innerHTML = html;
                attachButtons();
            });
        }

        // ================= DATE =================

        function formatDate(date) {
            if (!date) return "--";
            try {
                if (date.toDate) return date.toDate().toLocaleDateString();
                return new Date(date).toLocaleDateString();
            } catch {
                return "--";
            }
        }

        // ================= OPEN MEMBER =================

        function attachButtons() {
            document.querySelectorAll(".manage-btn").forEach(btn => {
                btn.onclick = () => openMember(btn.dataset.id);
            });
        }

        async function openMember(id) {
            const snap = await getDoc(doc(db, "users", id));
            selectedUser = { id, ...snap.data() };

            modalName.textContent = selectedUser.name || "";
            modalEmail.textContent = selectedUser.email || "";
            modalRole.textContent = selectedUser.role || "member";
            modalPayment.textContent = selectedUser.payment || "Unpaid";
            modalStatus.textContent = selectedUser.membership || "free";
            modalJoined.textContent = formatDate(selectedUser.createdAt);
            memberAvatar.textContent = (selectedUser.name || "U").charAt(0).toUpperCase();

            modal.style.display = "flex";
        }

        // ================= APPROVE =================

        approveBtn?.addEventListener("click", async () => {
            if (!selectedUser) return;

            await updateDoc(doc(db, "users", selectedUser.id), {
                active: true,
                status: "active",
                membership: selectedUser.membership || "free",
                role: selectedUser.role || "member"
            });

            alert("Member approved");
            modal.style.display = "none";
            loadMembers();
        });

        // ================= MAKE PREMIUM =================

        premiumBtn?.addEventListener("click", async () => {
            if (!selectedUser) return;

            await updateDoc(doc(db, "users", selectedUser.id), {
                membership: "premium",
                active: true,
                status: "active"
            });

            alert("Premium activated");
            modal.style.display = "none";
            loadMembers();
        });

        // ================= MAKE ADMIN =================

        adminBtn?.addEventListener("click", async () => {
            if (!selectedUser) return;

            await updateDoc(doc(db, "users", selectedUser.id), {
                role: "admin"
            });

            alert("User is now Admin");
            modal.style.display = "none";
            loadMembers();
        });

        // ================= REMOVE ADMIN (MAKE MEMBER) =================

        memberBtn?.addEventListener("click", async () => {
            if (!selectedUser) return;

            await updateDoc(doc(db, "users", selectedUser.id), {
                role: "member"
            });

            alert("Admin removed. User is now a member.");
            modal.style.display = "none";
            loadMembers();
        });

        // ================= DEMOTE TO PREMIUM MEMBER =================

        demoteBtn?.addEventListener("click", async () => {
            if (!selectedUser) return;

            await updateDoc(doc(db, "users", selectedUser.id), {
                role: "member",
                membership: "premium",
                active: true,
                status: "active"
            });

            alert("User demoted to Premium Member (role: member, membership: premium)");
            modal.style.display = "none";
            loadMembers();
        });

        // ================= SUSPEND =================

        suspendBtn?.addEventListener("click", async () => {
            if (!selectedUser) return;

            await updateDoc(doc(db, "users", selectedUser.id), {
                active: false,
                status: "suspended"
            });

            alert("Member suspended");
            modal.style.display = "none";
            loadMembers();
        });

        // ================= DELETE =================

        deleteBtn?.addEventListener("click", async () => {
            if (!selectedUser) return;
            if (!confirm("Delete member?")) return;

            await deleteDoc(doc(db, "users", selectedUser.id));
            alert("Deleted");
            modal.style.display = "none";
            loadMembers();
        });

        // ================= SEARCH =================

        search?.addEventListener("input", () => {
            const value = search.value.toLowerCase();
            document.querySelectorAll("#membersTable tr").forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(value) ? "" : "none";
            });
        });

        // ================= CLOSE =================

        closeModal?.addEventListener("click", () => {
            modal.style.display = "none";
        });

        window.onclick = (e) => {
            if (e.target === modal) modal.style.display = "none";
        };
    </script>
</body>
</html>