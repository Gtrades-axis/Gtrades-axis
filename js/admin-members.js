import { auth, db } from "../firebase.js";
import { collection, doc, getDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let allMembers = [];
let filteredMembers = [];
let currentMember = null;

const membersGrid = document.getElementById("membersGrid");
const searchInput = document.getElementById("searchInput");
const roleFilter = document.getElementById("roleFilter");
const statusFilter = document.getElementById("statusFilter");
const totalMembersEl = document.getElementById("totalMembers");
const freeMembersEl = document.getElementById("freeMembers");
const premiumMembersEl = document.getElementById("premiumMembers");
const adminMembersEl = document.getElementById("adminMembers");
const suspendedMembersEl = document.getElementById("suspendedMembers");
const modal = document.getElementById("memberModal");
const closeModal = document.getElementById("closeModal");

const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function formatDate(value) {
  if (!value) return "N/A";
  try {
    if (typeof value?.toDate === "function") return value.toDate().toLocaleDateString("en-US", {year:"numeric",month:"short",day:"numeric"});
    if (value?.seconds) return new Date(value.seconds * 1000).toLocaleDateString("en-US", {year:"numeric",month:"short",day:"numeric"});
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-US", {year:"numeric",month:"short",day:"numeric"});
  } catch { return "N/A"; }
}

function updateStatistics() {
  const total = allMembers.length;
  const premium = allMembers.filter(m => String(m.membership || "").toLowerCase() === "premium").length;
  const admins = allMembers.filter(m => m.role === "admin").length;
  const free = total - premium - admins;
  const suspended = allMembers.filter(m => m.status === "suspended").length;
  if (totalMembersEl) totalMembersEl.textContent = total;
  if (freeMembersEl) freeMembersEl.textContent = Math.max(0, free);
  if (premiumMembersEl) premiumMembersEl.textContent = premium;
  if (adminMembersEl) adminMembersEl.textContent = admins;
  if (suspendedMembersEl) suspendedMembersEl.textContent = suspended;
}

function applyFilters() {
  const search = String(searchInput?.value || "").trim().toLowerCase();
  const role = roleFilter?.value || "all";
  const status = statusFilter?.value || "all";
  filteredMembers = allMembers.filter(member => {
    const haystack = `${member.name || ""} ${member.fullName || ""} ${member.email || ""}`.toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (role === "free" && (member.role === "admin" || String(member.membership || "").toLowerCase() === "premium")) return false;
    if (role === "premium" && String(member.membership || "").toLowerCase() !== "premium") return false;
    if (role === "admin" && member.role !== "admin") return false;
    if (status === "active" && member.status === "suspended") return false;
    if (status === "suspended" && member.status !== "suspended") return false;
    return true;
  });
  renderMembers();
}

function renderMembers() {
  if (!membersGrid) return;
  if (!filteredMembers.length) {
    membersGrid.innerHTML = `<div class="empty-state"><h3>No Members Found</h3><p>No users match the current filters.</p></div>`;
    return;
  }
  membersGrid.innerHTML = filteredMembers.map(member => {
    const name = member.name || member.fullName || "Unknown User";
    const membership = String(member.membership || "free").toLowerCase();
    const role = member.role || "user";
    const status = member.status === "suspended" ? "Suspended" : (member.active === false ? "Pending" : "Active");
    const avatar = esc(name.charAt(0).toUpperCase());
    return `<div class="member-card" data-id="${esc(member.id)}">
      <div class="member-card-header"><div class="avatar">${avatar}</div><div><h3>${esc(name)}</h3><p>${esc(member.email || "")}</p></div></div>
      <div class="member-card-meta"><span class="badge ${role === "admin" ? "badge-admin" : membership === "premium" ? "badge-premium" : "badge-member"}">${esc(role === "admin" ? "Admin" : membership === "premium" ? "Premium" : "Free")}</span><span class="status-badge ${status === "Suspended" ? "status-suspended" : status === "Active" ? "status-active" : "status-pending"}">${status}</span></div>
      <div class="member-card-footer"><small>Joined ${esc(formatDate(member.createdAt || member.joinedAt))}</small><div><button class="btn-view" data-view="${esc(member.id)}">View</button><button class="btn-manage" data-view="${esc(member.id)}">Manage</button></div></div>
    </div>`;
  }).join("");
  membersGrid.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => openMember(btn.dataset.view)));
}

function openMember(id) {
  currentMember = allMembers.find(m => m.id === id) || null;
  if (!currentMember || !modal) return;
  document.getElementById("modalName").textContent = currentMember.name || currentMember.fullName || "Member";
  document.getElementById("modalEmail").textContent = currentMember.email || "";
  document.getElementById("modalRole").textContent = currentMember.role || "user";
  document.getElementById("modalStatus").textContent = currentMember.status === "suspended" ? "Suspended" : (currentMember.active === false ? "Pending" : "Active");
  document.getElementById("modalPayment").textContent = String(currentMember.membership || "free").toLowerCase() === "premium" || currentMember.role === "admin" ? "Premium / Paid" : "Free";
  document.getElementById("modalJoined").textContent = formatDate(currentMember.createdAt || currentMember.joinedAt);
  const demote = document.getElementById("demoteBtn");
  if (demote) demote.style.display = currentMember.role === "admin" ? "inline-block" : "none";
  modal.classList.add("show");
}

function closeMemberModal() { modal?.classList.remove("show"); currentMember = null; }

async function updateMember(patch, message) {
  if (!currentMember) return;
  const id = currentMember.id;
  try {
    await updateDoc(doc(db, "users", id), {...patch, updatedAt: serverTimestamp()});
    alert(message);
    closeMemberModal();
  } catch (error) {
    console.error("Member update failed", error);
    alert(`Could not update member: ${error.message}`);
  }
}

document.getElementById("makeFree")?.addEventListener("click", () => updateMember({membership:"free"}, "Member changed to Free."));
document.getElementById("makePremium")?.addEventListener("click", () => updateMember({membership:"premium", active:true}, "Member upgraded to Premium."));
document.getElementById("makeAdmin")?.addEventListener("click", () => updateMember({role:"admin", active:true}, "Member promoted to Admin."));
document.getElementById("demoteBtn")?.addEventListener("click", () => updateMember({role:"user"}, "Administrator demoted to Member."));
document.getElementById("suspendUser")?.addEventListener("click", () => updateMember({status:"suspended", active:false}, "Member suspended."));
document.getElementById("deleteUser")?.addEventListener("click", async () => {
  if (!currentMember || !confirm("Delete this member profile from Firestore? This does not delete their Firebase Authentication account.")) return;
  try { await deleteDoc(doc(db, "users", currentMember.id)); alert("Member profile deleted."); closeMemberModal(); }
  catch (error) { console.error(error); alert(`Could not delete member: ${error.message}`); }
});
closeModal?.addEventListener("click", closeMemberModal);
modal?.addEventListener("click", e => { if (e.target === modal) closeMemberModal(); });
searchInput?.addEventListener("input", applyFilters);
roleFilter?.addEventListener("change", applyFilters);
statusFilter?.addEventListener("change", applyFilters);
document.getElementById("logoutBtn")?.addEventListener("click", async () => { await signOut(auth); location.href = "/login"; });

onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "/login"; return; }
  try {
    const me = await getDoc(doc(db, "users", user.uid));
    if (!me.exists() || me.data().role !== "admin") { location.href = "/dashboard"; return; }
    onSnapshot(collection(db, "users"), snapshot => {
      allMembers = snapshot.docs.map(d => ({id:d.id, ...d.data()}));
      updateStatistics();
      applyFilters();
    }, error => {
      console.error("Members listener error", error);
      if (membersGrid) membersGrid.innerHTML = `<div class="empty-state"><h3>Unable to load members</h3><p>${esc(error.message)}</p></div>`;
    });
  } catch (error) { console.error(error); location.href = "/dashboard"; }
});
