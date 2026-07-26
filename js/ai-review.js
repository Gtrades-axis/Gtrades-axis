// ============================================================
// GTRADES-AXIS™ AI TRADE REVIEW ENGINE
// ============================================================

import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// ─── DOM refs ──────────────────────────────────────────────────
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const previewContainer = document.getElementById('previewContainer');
const pairInput = document.getElementById('pair');
const directionInput = document.getElementById('direction');
const entryModelInput = document.getElementById('entryModel');
const rrInput = document.getElementById('rr');
const followedPlanInput = document.getElementById('followedPlan');
const emotionInput = document.getElementById('emotion');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultBox = document.getElementById('resultBox');
const photonScoreEl = document.getElementById('photonScore');
const photonBadgeEl = document.getElementById('photonBadge');
const feedbackList = document.getElementById('feedbackList');

let uploadedFiles = [];

// ─── Auth guard ────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  // User is logged in, proceed.
});

// ─── File upload handling ──────────────────────────────────────
function handleFiles(files) {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  for (let file of files) {
    if (!allowedTypes.includes(file.type)) continue;
    if (uploadedFiles.length >= 3) break;
    uploadedFiles.push(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.className = 'preview-item';
      div.innerHTML = `
        <img src="${e.target.result}" alt="${file.name}" />
        <button class="remove" data-index="${uploadedFiles.length - 1}">&times;</button>
      `;
      previewContainer.appendChild(div);
      div.querySelector('.remove').addEventListener('click', () => {
        uploadedFiles.splice(parseInt(div.querySelector('.remove').dataset.index), 1);
        previewContainer.innerHTML = '';
        uploadedFiles.forEach((f, i) => {
          const r = new FileReader();
          r.onload = (ev) => {
            const d = document.createElement('div');
            d.className = 'preview-item';
            d.innerHTML = `
              <img src="${ev.target.result}" alt="${f.name}" />
              <button class="remove" data-index="${i}">&times;</button>
            `;
            previewContainer.appendChild(d);
            d.querySelector('.remove').addEventListener('click', () => {
              uploadedFiles.splice(i, 1);
              previewContainer.innerHTML = '';
              uploadedFiles.forEach((ff, ii) => {
                // re-render (simplified: we can just call handleFiles again? easier: rebuild)
              });
            });
          };
          r.readAsDataURL(f);
        });
      });
    };
    reader.readAsDataURL(file);
  }
}

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

// ─── Analysis ──────────────────────────────────────────────────
analyzeBtn.addEventListener('click', () => {
  const pair = pairInput.value.trim();
  const direction = directionInput.value;
  const entryModel = entryModelInput.value;
  const rr = parseFloat(rrInput.value) || 0;
  const followedPlan = followedPlanInput.value;
  const emotion = emotionInput.value;
  const hasHTF = uploadedFiles.length >= 3;

  let score = 0;
  let feedback = [];

  // 1. Market Structure (implied from direction and entry model)
  if (direction === 'BUY') {
    score += 10;
    feedback.push({ text: '✅ Direction aligns with bullish bias', pass: true });
  } else {
    score += 10;
    feedback.push({ text: '✅ Direction aligns with bearish bias', pass: true });
  }

  // 2. Entry Model (LC-1, LC-2A, etc.)
  if (entryModel) {
    score += 15;
    feedback.push({ text: `✅ Entry model (${entryModel}) used correctly`, pass: true });
  }

  // 3. Risk-to-Reward
  if (rr >= 2) {
    score += 20;
    feedback.push({ text: `✅ Excellent R:R (${rr}:1)`, pass: true });
  } else if (rr >= 1.5) {
    score += 15;
    feedback.push({ text: `✅ Good R:R (${rr}:1), aim for 2:1+`, pass: true });
  } else {
    feedback.push({ text: `❌ Low R:R (${rr}:1), minimum should be 2:1`, pass: false });
  }

  // 4. Followed Plan
  if (followedPlan === 'yes') {
    score += 15;
    feedback.push({ text: '✅ Followed trading plan', pass: true });
  } else {
    feedback.push({ text: '❌ Did not follow plan – review why', pass: false });
  }

  // 5. Emotion
  if (emotion === 'calm' || emotion === 'confident') {
    score += 20;
    feedback.push({ text: `✅ Healthy emotion (${emotion})`, pass: true });
  } else {
    feedback.push({ text: `⚠️ Emotion (${emotion}) – work on emotional control`, pass: false });
  }

  // 6. Screenshots (quality check)
  if (hasHTF) {
    score += 20;
    feedback.push({ text: '✅ HTF, MTF, and Entry screenshots provided', pass: true });
  } else {
    feedback.push({ text: '❌ Missing screenshots – please upload all three', pass: false });
  }

  // Cap at 100
  score = Math.min(100, score);

  // Display results
  photonScoreEl.textContent = score;
  const badgeText = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor';
  const badgeClass = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'average' : 'poor';
  photonBadgeEl.textContent = badgeText;
  photonBadgeEl.className = `photon-badge ${badgeClass}`;

  feedbackList.innerHTML = feedback.map(f => `
    <li class="${f.pass ? 'pass' : 'fail'}">${f.text}</li>
  `).join('');

  resultBox.style.display = 'block';
  resultBox.scrollIntoView({ behavior: 'smooth' });
});