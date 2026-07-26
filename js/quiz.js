import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const moduleId = urlParams.get("module");
if (!moduleId) {
  document.getElementById("quizContainer").innerHTML = `<div style="padding:40px;color:#ff4d4f;">No module specified.</div>`;
  throw new Error("Missing module id");
}

let currentUser = null;
let moduleData = null;
let questions = [];
let progress = null;
const titleEl = document.getElementById("quizTitle");
const moduleTitleEl = document.getElementById("quizModule");
const container = document.getElementById("quizContainer");

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  await loadProgress();
  await loadQuiz();
});

async function loadProgress() {
  try {
    const docRef = doc(db, "user_progress", currentUser.uid);
    const docSnap = await getDoc(docRef);
    progress = docSnap.exists() ? docSnap.data() : { modules: {} };
  } catch (e) { console.error("Progress error:", e); progress = { modules: {} }; }
}

async function loadQuiz() {
  try {
    const docRef = doc(db, "academy_modules", moduleId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      container.innerHTML = `<div style="padding:40px;color:#ff4d4f;">Module not found.</div>`;
      return;
    }
    moduleData = docSnap.data();
    moduleTitleEl.textContent = moduleData.title || "Module";
    titleEl.textContent = `Quiz: ${moduleData.title || "Module"}`;
    if (!moduleData.hasQuiz || !moduleData.quiz || !moduleData.quiz.questions) {
      container.innerHTML = `<div style="padding:40px;color:#aab7c8;">No quiz for this module.</div>`;
      return;
    }
    questions = moduleData.quiz.questions;
    const modProgress = progress.modules[moduleId] || {};
    if (modProgress.quizPassed) {
      container.innerHTML = `
        <div class="result-box">
          <div class="score pass">✅ Quiz Passed!</div>
          <div class="details">Score: ${modProgress.quizScore || 0}%</div>
          <button onclick="window.location.href='premium-academy.html'" class="btn btn-primary" style="margin-top:10px;">Back to Academy</button>
        </div>
      `;
      return;
    }
    renderQuiz();
  } catch (e) {
    console.error("Load quiz error:", e);
    container.innerHTML = `<div style="padding:40px;color:#ff4d4f;">Error loading quiz.</div>`;
  }
}

function renderQuiz() {
  let html = `<form id="quizForm">`;
  questions.forEach((q, idx) => {
    html += `
      <div class="question-block">
        <div class="question-text">${idx+1}. ${q.question}</div>
        <div class="options">
          ${q.options.map((opt, oi) => `
            <label><input type="radio" name="q${idx}" value="${oi}" /> ${opt}</label>
          `).join('')}
        </div>
      </div>
    `;
  });
  html += `<button type="submit" class="btn btn-primary" style="width:100%;padding:14px;margin-top:12px;">Submit Quiz</button></form>`;
  container.innerHTML = html;
  document.getElementById("quizForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitQuiz();
  });
}

async function submitQuiz() {
  const form = document.getElementById("quizForm");
  const inputs = form.querySelectorAll('input[type="radio"]:checked');
  if (inputs.length < questions.length) {
    alert("Please answer all questions.");
    return;
  }
  let correct = 0;
  questions.forEach((q, i) => {
    const selected = parseInt(document.querySelector(`input[name="q${i}"]:checked`).value);
    if (selected === q.correct) correct++;
  });
  const total = questions.length;
  const score = Math.round((correct / total) * 100);
  const passingScore = moduleData.quiz.passingScore || 70;
  const passed = score >= passingScore;
  try {
    const progressRef = doc(db, "user_progress", currentUser.uid);
    const progressSnap = await getDoc(progressRef);
    let data = progressSnap.exists() ? progressSnap.data() : { modules: {} };
    if (!data.modules) data.modules = {};
    if (!data.modules[moduleId]) data.modules[moduleId] = { completedLessons: [] };
    data.modules[moduleId].quizScore = score;
    data.modules[moduleId].quizPassed = passed;
    await setDoc(progressRef, data, { merge: true });
    progress = data;
  } catch (e) {
    console.error("Save quiz error:", e);
    alert("Error saving quiz result.");
  }
  container.innerHTML = `
    <div class="result-box">
      <div class="score ${passed ? 'pass' : 'fail'}">${score}%</div>
      <div class="${passed ? 'pass' : 'fail'}">${passed ? '✅ Passed!' : '❌ Not passed (needs ' + passingScore + '%)'}</div>
      <div class="details">Correct: ${correct}/${total}</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px;">
        <button onclick="window.location.href='premium-academy.html'" class="btn btn-primary">Back to Academy</button>
        ${!passed ? `<button onclick="window.location.reload()" class="btn-secondary">Retry</button>` : ''}
        ${passed ? `<button onclick="window.location.href='certificate.html?module=${moduleId}'" class="btn btn-primary" style="background:linear-gradient(135deg,#ffb300,#f57c00);">Get Certificate</button>` : ''}
      </div>
    </div>
  `;
}