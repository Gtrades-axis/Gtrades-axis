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
const videoForm = document.getElementById("videoForm");
const videoListBody = document.getElementById("videoTableBody");
const toggleFormBtn = document.getElementById("toggleVideoFormBtn");
const formContainer = document.getElementById("videoFormContainer");
const cancelBtn = document.getElementById("cancelVideoBtn");
const formTitle = document.getElementById("videoFormTitle");
const editingIdInput = document.getElementById("editingVideoId");

let videos = [];
let editingId = null;

/* =====================================
TOGGLE FORM
===================================== */
toggleFormBtn?.addEventListener("click", () => {
  const isHidden = formContainer.style.display === "none";
  formContainer.style.display = isHidden ? "block" : "none";
  if (isHidden) {
    formTitle.textContent = "Add New Video";
    editingId = null;
    editingIdInput.value = "";
    videoForm.reset();
    document.getElementById("videoThumbnail").value = "📹";
    document.getElementById("saveVideoBtn").textContent = "Save Video";
    toggleFormBtn.textContent = "✕ Cancel";
  } else {
    toggleFormBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Video';
  }
});

cancelBtn?.addEventListener("click", () => {
  formContainer.style.display = "none";
  toggleFormBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Video';
  videoForm.reset();
  editingId = null;
  editingIdInput.value = "";
});

/* =====================================
LOAD VIDEOS
===================================== */
async function loadVideos() {
  videos = [];
  const snapshot = await getDocs(collection(db, "videos"));
  snapshot.forEach(docSnap => {
    videos.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderVideos();
}

/* =====================================
RENDER VIDEO TABLE
===================================== */
function renderVideos() {
  if (!videoListBody) return;
  videoListBody.innerHTML = "";

  if (videos.length === 0) {
    videoListBody.innerHTML = `<tr><td colspan="5"><div class="empty-card">No videos uploaded.</div></td></tr>`;
    return;
  }

  videos.forEach(video => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${video.title}</strong></td>
      <td><span class="badge">${video.category}</span></td>
      <td>${video.duration || "—"}</td>
      <td>
        <span class="badge ${video.premiumOnly ? 'premium' : 'free'}">
          ${video.premiumOnly ? 'Premium' : 'Free'}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="manage-btn edit-video" data-id="${video.id}" style="color:var(--accent-blue);border-color:var(--accent-blue);">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="manage-btn toggle-video-premium" data-id="${video.id}" style="color:var(--gold);border-color:var(--gold);">
            <i class="fa-solid fa-${video.premiumOnly ? 'lock' : 'unlock'}"></i> ${video.premiumOnly ? 'Make Free' : 'Make Premium'}
          </button>
          <button class="manage-btn delete-video" data-id="${video.id}" style="color:var(--red);border-color:var(--red);">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      </td>
    `;
    videoListBody.appendChild(tr);
  });

  // Attach events
  document.querySelectorAll(".edit-video").forEach(btn => {
    btn.addEventListener("click", () => editVideo(btn.dataset.id));
  });
  document.querySelectorAll(".toggle-video-premium").forEach(btn => {
    btn.addEventListener("click", () => toggleVideoPremium(btn.dataset.id));
  });
  document.querySelectorAll(".delete-video").forEach(btn => {
    btn.addEventListener("click", () => deleteVideo(btn.dataset.id));
  });
}

/* =====================================
EDIT VIDEO
===================================== */
function editVideo(id) {
  const video = videos.find(v => v.id === id);
  if (!video) return;

  editingId = id;
  editingIdInput.value = id;
  document.getElementById("videoTitle").value = video.title || "";
  document.getElementById("videoCategory").value = video.category || "Market Structure";
  document.getElementById("videoDuration").value = video.duration || "";
  document.getElementById("videoYoutubeId").value = video.youtubeId || "";
  document.getElementById("videoThumbnail").value = video.thumbnail || "📹";
  document.getElementById("videoPremiumOnly").checked = video.premiumOnly || false;

  formTitle.textContent = "Edit Video";
  document.getElementById("saveVideoBtn").textContent = "Update Video";
  formContainer.style.display = "block";
  toggleFormBtn.textContent = "✕ Cancel";
}

/* =====================================
TOGGLE PREMIUM STATUS
===================================== */
async function toggleVideoPremium(id) {
  const video = videos.find(v => v.id === id);
  if (!video) return;

  const newStatus = !video.premiumOnly;
  if (!confirm(`Mark this video as ${newStatus ? 'Premium' : 'Free'}?`)) return;

  try {
    await updateDoc(doc(db, "videos", id), { premiumOnly: newStatus });
    await loadVideos();
    alert("✅ Video status updated.");
  } catch (error) {
    console.error(error);
    alert("Error updating status.");
  }
}

/* =====================================
DELETE VIDEO
===================================== */
async function deleteVideo(id) {
  const video = videos.find(v => v.id === id);
  if (!video) return;
  if (!confirm(`Delete "${video.title}" permanently?`)) return;

  try {
    await deleteDoc(doc(db, "videos", id));
    await loadVideos();
    alert("✅ Video deleted.");
  } catch (error) {
    console.error(error);
    alert("Error deleting video.");
  }
}

/* =====================================
SAVE VIDEO (Add or Update)
===================================== */
videoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("videoTitle").value.trim();
  const category = document.getElementById("videoCategory").value;
  const duration = document.getElementById("videoDuration").value.trim();
  const youtubeId = document.getElementById("videoYoutubeId").value.trim();
  const thumbnail = document.getElementById("videoThumbnail").value.trim() || "📹";
  const premiumOnly = document.getElementById("videoPremiumOnly").checked;
  const editingId = document.getElementById("editingVideoId").value;

  if (!title || !duration || !youtubeId) {
    alert("Please fill in all required fields.");
    return;
  }

  const data = {
    title,
    category,
    duration,
    youtubeId,
    thumbnail,
    premiumOnly,
    updatedAt: serverTimestamp(),
  };

  if (!editingId) {
    data.createdAt = serverTimestamp();
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, "videos", editingId), data);
      alert("✅ Video updated.");
    } else {
      await addDoc(collection(db, "videos"), data);
      alert("✅ Video added.");
    }
    await loadVideos();
    videoForm.reset();
    document.getElementById("videoThumbnail").value = "📹";
    formContainer.style.display = "none";
    toggleFormBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Video';
    editingIdInput.value = "";
  } catch (error) {
    console.error(error);
    alert("Error saving video: " + error.message);
  }
});

/* =====================================
INIT
===================================== */
loadVideos();

console.log("✅ Admin video manager ready.");