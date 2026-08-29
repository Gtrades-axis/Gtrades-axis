import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/login";
    return;
  }
  currentUser = user;
});

// ─── File Upload Previews ──────────────────────────────────────
document.getElementById("htfFile").addEventListener("change", function(e) {
  previewFile(e.target, "htfPreview");
});
document.getElementById("mtfFile").addEventListener("change", function(e) {
  previewFile(e.target, "mtfPreview");
});
document.getElementById("entryFile").addEventListener("change", function(e) {
  previewFile(e.target, "entryPreview");
});

function previewFile(input, previewId) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById(previewId);
    preview.src = e.target.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);
}

// ─── Analyze Button ─────────────────────────────────────────────
document.getElementById("analyzeBtn").addEventListener("click", function() {
  const htf = document.getElementById("htfFile").files[0];
  const mtf = document.getElementById("mtfFile").files[0];
  const entry = document.getElementById("entryFile").files[0];

  if (!htf || !mtf || !entry) {
    alert("Please upload all three screenshots (HTF, MTF, Entry).");
    return;
  }

  this.disabled = true;
  this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

  // Simulate AI analysis (in production, you'd send images to a backend)
  setTimeout(() => {
    const result = generateAIAnalysis();
    displayResults(result);
    this.disabled = false;
    this.innerHTML = 'Analyze Trade';
  }, 1500);
});

// ─── Simulated AI Analysis ─────────────────────────────────────
function generateAIAnalysis() {
  // In a real implementation, these would be computed from image analysis.
  // For now, we simulate realistic scores based on typical student trades.
  const scores = {
    structure: Math.floor(Math.random() * 40) + 60, // 60-100
    liquidity: Math.floor(Math.random() * 40) + 50,
    supplyDemand: Math.floor(Math.random() * 40) + 55,
    entry: Math.floor(Math.random() * 40) + 50,
    risk: Math.floor(Math.random() * 40) + 60,
    psychology: Math.floor(Math.random() * 40) + 55,
  };
  const total = Object.values(scores).reduce((a,b) => a+b, 0);
  const photon = Math.round(total / 6);

  // Suggestions based on scores
  const suggestions = [];
  if (scores.structure < 70) suggestions.push("📉 Review market structure – ensure you're trading with the trend.");
  if (scores.liquidity < 70) suggestions.push("🔍 Identify liquidity pools before entering.");
  if (scores.supplyDemand < 70) suggestions.push("📊 Only trade from fresh supply/demand zones.");
  if (scores.entry < 70) suggestions.push("🎯 Wait for confirmation (LC-1, LC-2A, LTF RE).");
  if (scores.risk < 70) suggestions.push("💰 Reduce risk per trade and set proper stop losses.");
  if (scores.psychology < 70) suggestions.push("🧠 Stay disciplined – stick to your trading plan.");

  return { scores, photon, suggestions };
}

function displayResults(result) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.classList.add("visible");

  document.getElementById("photonScore").textContent = result.photon + "%";

  const scoreMap = {
    scoreStructure: result.scores.structure,
    scoreLiquidity: result.scores.liquidity,
    scoreSupplyDemand: result.scores.supplyDemand,
    scoreEntry: result.scores.entry,
    scoreRisk: result.scores.risk,
    scorePsychology: result.scores.psychology,
  };

  Object.entries(scoreMap).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value + "%";
    el.className = "score";
    if (value >= 70) el.classList.add("score-good");
    else if (value >= 50) el.classList.add("score-warning");
    else el.classList.add("score-bad");
  });

  const list = document.getElementById("suggestionList");
  list.innerHTML = "";
  if (result.suggestions.length === 0) {
    list.innerHTML = `<li><i class="fas fa-check-circle"></i> Excellent trade! Keep up the good work.</li>`;
  } else {
    result.suggestions.forEach(s => {
      list.innerHTML += `<li><i class="fas fa-lightbulb"></i> ${s}</li>`;
    });
  }
}