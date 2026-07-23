import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ─── Resource list ─────────────────────────────────────────────
const resources = [
  { id: "trading-plan", title: "Trading Plan", desc: "Structured trading plan template.", category: "PDF", icon: "fa-file-pdf", url: "resources/trading-plan.pdf" },
  { id: "checklist", title: "Trading Checklist", desc: "Pre-trade checklist for consistency.", category: "PDF", icon: "fa-file-pdf", url: "resources/checklist.pdf" },
  { id: "journal-pdf", title: "Journal PDF", desc: "Printable trading journal.", category: "PDF", icon: "fa-file-pdf", url: "resources/journal.pdf" },
  { id: "risk-calculator", title: "Risk Calculator", desc: "Calculate position size and risk.", category: "Tool", icon: "fa-calculator", url: "resources/risk-calculator.html" },
  { id: "templates", title: "Trading Templates", desc: "Excel and Notion templates.", category: "Tool", icon: "fa-file-excel", url: "resources/templates.zip" },
  { id: "wallpapers", title: "Wallpapers", desc: "Trading desk backgrounds.", category: "Media", icon: "fa-image", url: "resources/wallpapers.zip" },
  { id: "cheat-sheets", title: "Cheat Sheets", desc: "Quick reference guides.", category: "PDF", icon: "fa-file-pdf", url: "resources/cheat-sheets.pdf" }
];

// ─── Auth guard ────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  // Optional: check if user is premium (role check)
  // For now, we assume premium because the page is linked from premium area.
  document.getElementById('userRole').textContent = "Premium";
  renderResources();
});

// ─── Render resources ──────────────────────────────────────────
function renderResources() {
  const container = document.getElementById('resourcesContainer');
  container.innerHTML = "";
  resources.forEach(res => {
    container.innerHTML += `
      <div class="resource-card">
        <div class="icon"><i class="fa-solid ${res.icon}"></i></div>
        <div class="category-tag">${res.category}</div>
        <div class="title">${res.title}</div>
        <div class="desc">${res.desc}</div>
        <a href="${res.url}" class="btn-download" download><i class="fa-solid fa-download"></i> Download</a>
      </div>
    `;
  });
}