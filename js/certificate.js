// js/certificate.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const moduleId = urlParams.get('module');

if (!moduleId) {
  document.getElementById('moduleTitle').textContent = "Module not specified";
}

let currentUser = null;
let moduleTitle = "";

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  await loadCertificate();
});

async function loadCertificate() {
  try {
    // Get user name
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const userName = userDoc.exists() ? userDoc.data().name || "Trader" : "Trader";
    document.getElementById('userName').textContent = userName;

    // Get module title
    if (moduleId && moduleId !== 'final') {
      const moduleRef = doc(db, "academy_modules", moduleId);
      const moduleSnap = await getDoc(moduleRef);
      if (moduleSnap.exists()) {
        moduleTitle = moduleSnap.data().title || "Module";
      } else {
        moduleTitle = "Module";
      }
    } else {
      moduleTitle = "GTRADES-AXIS™ Academy";
    }
    document.getElementById('moduleTitle').textContent = moduleTitle;

    // Issue date
    const now = new Date();
    document.getElementById('issueDate').textContent = `Issued on ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    document.getElementById('certId').textContent = `#GTRADES-${String(now.getFullYear()).slice(2)}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${currentUser.uid.slice(0,6)}`;
  } catch (e) {
    console.error("Certificate load error:", e);
  }
}

// Download PNG
document.getElementById('downloadPngBtn')?.addEventListener('click', function() {
  html2canvas(document.getElementById('certContainer'), { scale: 2, backgroundColor: '#0a0e17', useCORS: true, allowTaint: true })
    .then(canvas => {
      const link = document.createElement('a');
      link.download = `certificate-${moduleId || 'final'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    })
    .catch(err => console.error('PNG generation error:', err));
});

// Download PDF
document.getElementById('downloadPdfBtn')?.addEventListener('click', function() {
  html2canvas(document.getElementById('certContainer'), { scale: 2, backgroundColor: '#0a0e17', useCORS: true, allowTaint: true })
    .then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`certificate-${moduleId || 'final'}.pdf`);
    })
    .catch(err => console.error('PDF generation error:', err));
});