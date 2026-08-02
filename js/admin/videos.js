import { db, auth } from "../firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

/* =====================================
   SAMPLE VIDEOS DATA (with placeholder images)
===================================== */
const SAMPLE_VIDEOS = [
  { title: "Market Structure Basics (BOS & CHoCH)", category: "Market Structure", duration: "12:45", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/4f7cff?text=MS", premiumOnly: false },
  { title: "Supply & Demand Zone Refinement", category: "Supply & Demand", duration: "15:10", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/00c897?text=SD", premiumOnly: false },
  { title: "Liquidity Grabs Explained", category: "Liquidity", duration: "08:22", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/f5a623?text=LIQ", premiumOnly: false },
  { title: "Perfect Entry Checklist", category: "Entries", duration: "10:05", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/ff4766?text=ENT", premiumOnly: false },
  { title: "Mastering Trading Psychology", category: "Psychology", duration: "18:30", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/9c27b0?text=PSY", premiumOnly: false },
  { title: "Break of Structure (BOS) in Trend", category: "Market Structure", duration: "09:15", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/4f7cff?text=BOS", premiumOnly: false },
  { title: "Change of Character (CHoCH) Deep Dive", category: "Market Structure", duration: "14:50", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/4f7cff?text=CHoCH", premiumOnly: false },
  { title: "Liquidity Sweep Before Entry", category: "Liquidity", duration: "07:40", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/f5a623?text=SWEEP", premiumOnly: false },
  { title: "How to Draw Supply & Demand Zones", category: "Supply & Demand", duration: "20:15", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/00c897?text=SND", premiumOnly: false },
  { title: "Risk Management for Prop Firms", category: "Entries", duration: "11:25", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/ff4766?text=RISK", premiumOnly: false },
  { title: "Overcoming Fear & Greed", category: "Psychology", duration: "16:00", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/9c27b0?text=FG", premiumOnly: false },
  { title: "Session Timing: London vs NY", category: "Entries", duration: "13:55", youtubeId: "dQw4w9WgXcQ", thumbnail: "https://via.placeholder.com/320x180/0f172a/ff4766?text=SESS", premiumOnly: false }
];

/* =====================================
   DOM REFS
===================================== */
const videoForm = document.getElementById("videoForm");
const videoListBody = document.getElementById("videoTableBody");
const toggleFormBtn = document.getElementById("toggleVideoFormBtn");
const formContainer = document.getElementById("videoFormContainer");
const cancelBtn = document.getElementById("cancelVideoBtn");
const formTitle = document.getElementById("videoFormTitle");
const editingIdInput = document.getElementById("editingVideoId");
const thumbnailFileInput = document.getElementById("videoThumbnailFile");
const thumbnailPreview = document.getElementById("thumbnailPreview");
const thumbnailPreviewImg = document.getElementById("thumbnailPreviewImg");
const existingThumbnailUrl = document.getElementById("existingThumbnailUrl");

const storage = getStorage();
let videos = [];
let editingId = null;

/* =====================================
   THUMBNAIL PREVIEW
===================================== */
thumbnailFileInput?.addEventListener("change", () => {
  const file = thumbnailFileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      thumbnailPreviewImg.src = e.target.result;
      thumbnailPreview.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    thumbnailPreview.style.display = "none";
  }
});

/* =====================================
   ADD SAMPLE VIDEOS
===================================== */
async function addSampleVideos() {
  if (!confirm("This will add 12 sample videos to your Firestore. Continue?")) return;

  try {
    const existing = await getDocs(collection(db, "videos"));
    if (!existing.empty) {
      if (!confirm("You already have videos. Adding samples will create duplicates. Continue?")) return;
    }

    let count = 0;
    for (const video of SAMPLE_VIDEOS) {
      await addDoc(collection(db, "videos"), {
        ...video,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      count++;
    }
    alert(`✅ ${count} sample videos added successfully!`);
    await loadVideos();
  } catch (error) {
    console.error(error);
    alert("Error adding sample videos: " + error.message);
  }
}

document.getElementById("addSampleVideosBtn")?.addEventListener("click", addSampleVideos);

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
    existingThumbnailUrl.value = "";
    thumbnailPreview.style.display = "none";
    videoForm.reset();
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
  thumbnailPreview.style.display = "none";
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
    videoListBody.innerHTML = `<tr><td colspan="6"><div class="empty-card">No videos uploaded.</div></td></tr>`;
    return;
  }

  videos.forEach(video => {
    const tr = document.createElement("tr");
    const thumbHtml = video.thumbnail
      ? `<img src="${video.thumbnail}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" />`
      : `<span style="color:var(--text-secondary);font-size:1.5rem;">📹</span>`;

    tr.innerHTML = `
      <td>${thumbHtml}</td>
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
  existingThumbnailUrl.value = video.thumbnail || "";
  document.getElementById("videoTitle").value = video.title || "";
  document.getElementById("videoCategory").value = video.category || "Market Structure";
  document.getElementById("videoDuration").value = video.duration || "";
  document.getElementById("videoYoutubeId").value = video.youtubeId || "";
  document.getElementById("videoPremiumOnly").checked = video.premiumOnly || false;

  // Show existing thumbnail preview
  if (video.thumbnail) {
    thumbnailPreviewImg.src = video.thumbnail;
    thumbnailPreview.style.display = "block";
  } else {
    thumbnailPreview.style.display = "none";
  }

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
   UPLOAD THUMBNAIL TO STORAGE
===================================== */
async function uploadThumbnail(file, userId) {
  const storageRef = ref(storage, `thumbnails/${userId}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
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
  const premiumOnly = document.getElementById("videoPremiumOnly").checked;
  const editingId = document.getElementById("editingVideoId").value;
  const existingThumb = document.getElementById("existingThumbnailUrl").value;
  const file = thumbnailFileInput.files[0];

  if (!title || !duration || !youtubeId) {
    alert("Please fill in all required fields.");
    return;
  }

  let thumbnailUrl = existingThumb;

  // Upload new thumbnail if a file was selected
  if (file) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in.");
      thumbnailUrl = await uploadThumbnail(file, user.uid);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading thumbnail: " + error.message);
      return;
    }
  }

  const data = {
    title,
    category,
    duration,
    youtubeId,
    thumbnail: thumbnailUrl || "",
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
    thumbnailPreview.style.display = "none";
    formContainer.style.display = "none";
    toggleFormBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Video';
    editingIdInput.value = "";
    existingThumbnailUrl.value = "";
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