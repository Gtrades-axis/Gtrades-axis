import { db } from "../firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* =====================================
   SAMPLE VIDEOS DATA
===================================== */
const SAMPLE_VIDEOS = [
  { title: "Market Structure Basics (BOS & CHoCH)", category: "Market Structure", duration: "12:45", youtubeId: "dQw4w9WgXcQ", thumbnail: "🎯", premiumOnly: false },
  { title: "Supply & Demand Zone Refinement", category: "Supply & Demand", duration: "15:10", youtubeId: "dQw4w9WgXcQ", thumbnail: "📊", premiumOnly: false },
  { title: "Liquidity Grabs Explained", category: "Liquidity", duration: "08:22", youtubeId: "dQw4w9WgXcQ", thumbnail: "💧", premiumOnly: false },
  { title: "Perfect Entry Checklist", category: "Entries", duration: "10:05", youtubeId: "dQw4w9WgXcQ", thumbnail: "✅", premiumOnly: false },
  { title: "Mastering Trading Psychology", category: "Psychology", duration: "18:30", youtubeId: "dQw4w9WgXcQ", thumbnail: "🧠", premiumOnly: false },
  { title: "Break of Structure (BOS) in Trend", category: "Market Structure", duration: "09:15", youtubeId: "dQw4w9WgXcQ", thumbnail: "📈", premiumOnly: false },
  { title: "Change of Character (CHoCH) Deep Dive", category: "Market Structure", duration: "14:50", youtubeId: "dQw4w9WgXcQ", thumbnail: "🔄", premiumOnly: false },
  { title: "Liquidity Sweep Before Entry", category: "Liquidity", duration: "07:40", youtubeId: "dQw4w9WgXcQ", thumbnail: "💦", premiumOnly: false },
  { title: "How to Draw Supply & Demand Zones", category: "Supply & Demand", duration: "20:15", youtubeId: "dQw4w9WgXcQ", thumbnail: "✏️", premiumOnly: false },
  { title: "Risk Management for Prop Firms", category: "Entries", duration: "11:25", youtubeId: "dQw4w9WgXcQ", thumbnail: "🛡️", premiumOnly: false },
  { title: "Overcoming Fear & Greed", category: "Psychology", duration: "16:00", youtubeId: "dQw4w9WgXcQ", thumbnail: "🧘", premiumOnly: false },
  { title: "Session Timing: London vs NY", category: "Entries", duration: "13:55", youtubeId: "dQw4w9WgXcQ", thumbnail: "🕒", premiumOnly: false }
];

/* =====================================
   ADD SAMPLE VIDEOS
===================================== */
async function addSampleVideos() {
  if (!confirm("This will add 12 sample videos to your Firestore. Continue?")) return;

  try {
    // Check if any videos already exist to avoid duplicates
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
    await loadVideos(); // refresh the table
  } catch (error) {
    console.error(error);
    alert("Error adding sample videos: " + error.message);
  }
}

/* =====================================
   ELEMENTS & EVENT LISTENERS
===================================== */
// ... (your existing code: DOM refs, loadVideos, renderVideos, form submit, etc.)

// Add event listener for the "Add Sample Videos" button
document.getElementById("addSampleVideosBtn")?.addEventListener("click", addSampleVideos);

// ... rest of your existing code (toggle form, edit, delete, etc.)