import { db } from "../firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* =====================================
ELEMENTS
===================================== */
const form = document.getElementById("resourceForm");
const resourceListBody = document.getElementById("resourceTableBody");
const toggleFormBtn = document.getElementById("toggleResourceFormBtn");
const formContainer = document.getElementById("resourceFormContainer");
const cancelBtn = document.getElementById("cancelResourceBtn");
const formTitle = document.getElementById("resourceFormTitle");
const editingIdInput = document.getElementById("editingResourceId");
const chooseBtn = document.getElementById("chooseFileBtn");
const picker = document.getElementById("resourceFilePicker");
const filenameBox = document.getElementById("resourceFile");

let resources = [];
let editingId = null;

/* =====================================
FILE PICKER
===================================== */
if (chooseBtn && picker && filenameBox) {
  chooseBtn.addEventListener("click", () => picker.click());
  picker.addEventListener("change", () => {
    if (picker.files.length > 0) {
      filenameBox.value = picker.files[0].name;
    }
  });
}

/* =====================================
TOGGLE FORM
===================================== */
toggleFormBtn?.addEventListener("click", () => {
  const isHidden = formContainer.style.display === "none";
  formContainer.style.display = isHidden ? "block" : "none";
  if (isHidden) {
    formTitle.textContent = "Add New Resource";
    editingId = null;
    editingIdInput.value = "";
    form.reset();
    filenameBox.value = "";
    document.getElementById("saveResourceBtn").textContent = "Save Resource";
    toggleFormBtn.textContent = "✕ Cancel";
  } else {
    toggleFormBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Resource';
  }
});

cancelBtn?.addEventListener("click", () => {
  formContainer.style.display = "none";
  toggleFormBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Resource';
  form.reset();
  filenameBox.value = "";
  editingId = null;
  editingIdInput.value = "";
});

/* =====================================
LOAD RESOURCES
===================================== */
async function loadResources() {
  resources = [];
  const snapshot = await getDocs(collection(db, "resources"));
  snapshot.forEach(docSnap => {
    resources.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderResources();
}

/* =====================================
RENDER RESOURCE TABLE
===================================== */
function renderResources() {
  if (!resourceListBody) return;
  resourceListBody.innerHTML = "";

  if (resources.length === 0) {
    resourceListBody.innerHTML = `<tr><td colspan="4"><div class="empty-card">No resources uploaded.</div></td></tr>`;
    return;
  }

  resources.forEach(resource => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${resource.title}</strong><br><small style="color:var(--text-secondary);">${resource.description || ""}</small></td>
      <td><span class="badge">${resource.category}</span></td>
      <td>
        <span class="badge ${resource.premiumOnly ? 'premium' : 'free'}">
          ${resource.premiumOnly ? 'Premium' : 'Free'}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="manage-btn edit-resource" data-id="${resource.id}" style="color:var(--accent-blue);border-color:var(--accent-blue);">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="manage-btn toggle-premium" data-id="${resource.id}" style="color:var(--gold);border-color:var(--gold);">
            <i class="fa-solid fa-${resource.premiumOnly ? 'lock' : 'unlock'}"></i> ${resource.premiumOnly ? 'Make Free' : 'Make Premium'}
          </button>
          <button class="manage-btn delete-resource" data-id="${resource.id}" style="color:var(--red);border-color:var(--red);">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      </td>
    `;
    resourceListBody.appendChild(tr);
  });

  // Attach events
  document.querySelectorAll(".edit-resource").forEach(btn => {
    btn.addEventListener("click", () => editResource(btn.dataset.id));
  });
  document.querySelectorAll(".toggle-premium").forEach(btn => {
    btn.addEventListener("click", () => togglePremium(btn.dataset.id));
  });
  document.querySelectorAll(".delete-resource").forEach(btn => {
    btn.addEventListener("click", () => deleteResource(btn.dataset.id));
  });
}

/* =====================================
EDIT RESOURCE
===================================== */
function editResource(id) {
  const resource = resources.find(r => r.id === id);
  if (!resource) return;

  editingId = id;
  editingIdInput.value = id;
  document.getElementById("resourceTitle").value = resource.title || "";
  document.getElementById("resourceCategory").value = resource.category || "PDF";
  document.getElementById("resourceDescription").value = resource.description || "";
  document.getElementById("premiumOnly").checked = resource.premiumOnly || false;
  filenameBox.value = ""; // can't show existing file

  formTitle.textContent = "Edit Resource";
  document.getElementById("saveResourceBtn").textContent = "Update Resource";
  formContainer.style.display = "block";
  toggleFormBtn.textContent = "✕ Cancel";
}

/* =====================================
TOGGLE PREMIUM STATUS
===================================== */
async function togglePremium(id) {
  const resource = resources.find(r => r.id === id);
  if (!resource) return;

  const newStatus = !resource.premiumOnly;
  if (!confirm(`Mark this resource as ${newStatus ? 'Premium' : 'Free'}?`)) return;

  try {
    await updateDoc(doc(db, "resources", id), {
      premiumOnly: newStatus
    });
    await loadResources();
    alert("✅ Status updated.");
  } catch (error) {
    console.error(error);
    alert("Error updating status.");
  }
}

/* =====================================
DELETE RESOURCE
===================================== */
async function deleteResource(id) {
  const resource = resources.find(r => r.id === id);
  if (!resource) return;
  if (!confirm(`Delete "${resource.title}" permanently?`)) return;

  try {
    await deleteDoc(doc(db, "resources", id));
    await loadResources();
    alert("✅ Resource deleted.");
  } catch (error) {
    console.error(error);
    alert("Error deleting resource.");
  }
}

/* =====================================
SAVE RESOURCE (Add or Update)
===================================== */
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("resourceTitle").value.trim();
  const category = document.getElementById("resourceCategory").value;
  const description = document.getElementById("resourceDescription").value.trim();
  const filename = document.getElementById("resourceFile").value.trim();
  const premiumOnly = document.getElementById("premiumOnly").checked;
  const editingId = document.getElementById("editingResourceId").value;

  if (!title) {
    alert("Please enter a title.");
    return;
  }

  // For new resources, require a file
  if (!editingId && !filename) {
    alert("Please select a file.");
    return;
  }

  let link = "";
  if (!editingId) {
    const folder = category.toLowerCase() + "s";
    link = `https://gtrades-axis.github.io/Gtrades-axis/resources/${folder}/${filename}`;
  }

  const data = {
    title,
    category,
    description,
    premiumOnly,
    updatedAt: serverTimestamp(),
  };

  if (!editingId) {
    data.link = link;
    data.createdAt = serverTimestamp();
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, "resources", editingId), data);
      alert("✅ Resource updated.");
    } else {
      await addDoc(collection(db, "resources"), data);
      alert("✅ Resource added.");
    }
    await loadResources();
    form.reset();
    filenameBox.value = "";
    formContainer.style.display = "none";
    toggleFormBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Resource';
    editingIdInput.value = "";
  } catch (error) {
    console.error(error);
    alert("Error saving resource: " + error.message);
  }
});

/* =====================================
INIT
===================================== */
loadResources();

console.log("✅ Admin resources manager ready.");