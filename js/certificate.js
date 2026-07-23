import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const moduleId = urlParams.get('module');

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  await loadCertificate();
});

async function loadCertificate() {
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const userName = userDoc.exists() ? userDoc.data().name || "Trader" : "Trader";
    document.getElementById('userName').textContent = userName;

    // Load module title (from academyData – we can either fetch from Firestore or use the static data)
    // For simplicity, we'll import ALL_MODULES and find the module.
    const { ALL_MODULES } = await import('./academyData.js');
    const mod = ALL_MODULES.find(m => m.id === moduleId);
    const moduleTitle = mod ? mod.title : "Module";
    document.getElementById('moduleTitle').textContent = moduleTitle;

    const now = new Date();
    document.getElementById('issueDate').textContent = `Issued on ${now.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`;
    document.getElementById('certId').textContent = `#GTRADES-${String(now.getFullYear()).slice(2)}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${currentUser.uid.slice(0,6)}`;
  } catch (e) {
    console.error("Certificate load error:", e);
  }
}

// ─── Download PNG ──────────────────────────────────────────────
document.getElementById('downloadPngBtn').addEventListener('click', function() {
  const container = document.getElementById('certContainer');
  html2canvas(container, {
    scale: 2,
    backgroundColor: '#0a0e17',
    useCORS: true,
    allowTaint: true
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = `certificate-${moduleId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(err => console.error('PNG generation error:', err));
});

// ─── Download PDF ──────────────────────────────────────────────
document.getElementById('downloadPdfBtn').addEventListener('click', function() {
  const container = document.getElementById('certContainer');
  html2canvas(container, {
    scale: 2,
    backgroundColor: '#0a0e17',
    useCORS: true,
    allowTaint: true
  }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`certificate-${moduleId}.pdf`);
  }).catch(err => console.error('PDF generation error:', err));
});