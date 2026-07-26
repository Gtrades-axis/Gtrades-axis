import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const moduleId = urlParams.get("module");
const isFinal = urlParams.get("final") === "true";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadCertificate();
});

async function loadCertificate() {
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const userName = userDoc.exists() ? userDoc.data().name || "Trader" : "Trader";
    document.getElementById("userName").textContent = userName;

    let moduleTitle = "the GTRADES-AXIS™ Academy";
    if (!isFinal && moduleId) {
      const modDoc = await getDoc(doc(db, "academy_modules", moduleId));
      if (modDoc.exists()) {
        moduleTitle = modDoc.data().title || "Module";
      }
    }
    document.getElementById("moduleTitle").textContent = moduleTitle;

    const now = new Date();
    document.getElementById("issueDate").textContent =
      `Issued on ${now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
    document.getElementById("certId").textContent =
      `#GTRADES-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${currentUser.uid.slice(0, 6)}`;
  } catch (e) {
    console.error("Certificate load error:", e);
  }
}

document.getElementById("downloadPngBtn").addEventListener("click", function() {
  html2canvas(document.getElementById("certContainer"), {
    scale: 2,
    backgroundColor: "#070b12",
    useCORS: true,
    allowTaint: true,
  })
    .then((canvas) => {
      const link = document.createElement("a");
      link.download = `certificate-${moduleId || "final"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    })
    .catch((err) => console.error("PNG error:", err));
});

document.getElementById("downloadPdfBtn").addEventListener("click", function() {
  html2canvas(document.getElementById("certContainer"), {
    scale: 2,
    backgroundColor: "#070b12",
    useCORS: true,
    allowTaint: true,
  })
    .then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("landscape", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      pdf.save(`certificate-${moduleId || "final"}.pdf`);
    })
    .catch((err) => console.error("PDF error:", err));
});