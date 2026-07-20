import { db, auth } from "../firebase.js";
import { collection, doc, getDoc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
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

// ─── Auth guard ─────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists() || userDoc.data().role !== "admin") {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ff4d4f;">Access Denied. Admin only.</td></tr>`;
    return;
  }
  loadMembers();
});

// ─── Load members ──────────────────────────────────────────────
function loadMembers() {
  if (unsubscribe) unsubscribe();
  table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;">Loading...</td></tr>`;
  unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
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
    document.querySelectorAll(".manage-btn").forEach(btn => {
      btn.addEventListener("click", () => openMember(btn.dataset.id));
    });
  });
}

function formatDate(date) {
  if (!date) return "--";
  try {
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    return new Date(date).toLocaleDateString();
  } catch { return "--"; }
}

// ─── Search ────────────────────────────────────────────────────
search?.addEventListener("input", () => {
  const term = search.value.toLowerCase();
  document.querySelectorAll("#membersTable tr").forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(term) ? "" : "none";
  });
});

// ─── Open modal ────────────────────────────────────────────────
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

// ─── Modal close ───────────────────────────────────────────────
closeModal?.addEventListener("click", () => modal.style.display = "none");
window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.style.display = "none"; });

// ─── Actions ──────────────────────────────────────────────────
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