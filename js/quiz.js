// js/quiz.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const moduleId = urlParams.get('module');

if (!moduleId) {
  document.getElementById('quizContainer').innerHTML = '<div style="padding:40px;color:#ff4d4f;">No module specified.</div>';
  throw new Error('Missing module id');
}

let currentUser = null;
let moduleData = null;
let questions = [];
let progress = null;

const container = document.getElementById('quizContainer');
const titleEl = document.getElementById('quizTitle');

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  await loadQuiz();
});

async function loadQuiz() {
  try {
    // Load module
    const moduleRef = doc(db, "academy_modules", moduleId);
    const moduleSnap = await getDoc(moduleRef);
    if (!moduleSnap.exists()) {
      container.innerHTML = '<div style="padding:40px;color:#ff4d4f;">Module not found.</div>';
      return;
    }
    moduleData = moduleSnap.data();
    if (!moduleData.hasQuiz || !moduleData.quiz || !moduleData.quiz.questions) {
      container.innerHTML = '<div style="padding:40px;color:#94a3b8;">No quiz for this module.</div>';
      return;
    }
    titleEl.textContent = `Quiz: ${moduleData.title}`;
    questions = moduleData.quiz.questions;

    // Load progress
    const progressRef = doc(db, "user_progress", currentUser.uid);
    const progressSnap = await getDoc(progressRef);
    progress = progressSnap.exists() ? progressSnap.data() : { modules: {} };
    if (!progress.modules) progress.modules = {};
    if (!progress.modules[moduleId]) progress.modules[moduleId] = { completedLessons: [] };

    // Check if already passed
    const modProgress = progress.modules[moduleId];
    if (modProgress.quizPassed) {
      container.innerHTML = `
        <div class="result-box">
          <div class="score pass">✅ Quiz Passed!</div>
          <div class="details">Score: ${modProgress.quizScore || 0}%</div>
          <button onclick="window.location.href='certificate.html?module=${moduleId}'" class="btn-primary">Get Certificate</button>
          <button onclick="window.location.href='academy.html'" class="btn-secondary">Back to Academy</button>
        </div>
      `;
      return;
    }

    renderQuiz();
  } catch (e) {
    console.error("Quiz load error:", e);
    container.innerHTML = '<div style="padding:40px;color:#ff4d4f;">Error loading quiz.</div>';
  }
}

function renderQuiz() {
  let html = `<form id="quizForm">`;
  questions.forEach((q, index) => {
    html += `
      <div class="question-block">
        <div class="question-text">${index+1}. ${q.question}</div>
        <div class="options">
          ${q.options.map((opt, oi) => `
            <label>
              <input type="radio" name="q${index}" value="${oi}">
              ${opt}
            </label>
          `).join('')}
        </div>
      </div>
    `;
  });
  html += `<button type="submit" class="btn-primary">Submit Quiz</button></form>`;
  container.innerHTML = html;

  document.getElementById('quizForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitQuiz();
  });
}

async function submitQuiz() {
  const form = document.getElementById('quizForm');
  const inputs = form.querySelectorAll('input[type="radio"]:checked');
  if (inputs.length < questions.length) {
    alert('Please answer all questions.');
    return;
  }
  let correct = 0;
  questions.forEach((q, i) => {
    const selected = parseInt(document.querySelector(`input[name="q${i}"]:checked`).value);
    if (selected === q.correct) correct++;
  });
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= (moduleData.quiz.passingScore || 70);

  // Save progress
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
    console.error(e);
    alert('Error saving quiz result.');
  }

  // Show result
  container.innerHTML = `
    <div class="result-box">
      <div class="score ${passed ? 'pass' : 'fail'}">${score}%</div>
      <div class="${passed ? 'pass' : 'fail'}">${passed ? '✅ Passed!' : '❌ Not passed (needs ' + (moduleData.quiz.passingScore || 70) + '%)'}</div>
      <div class="details">Correct: ${correct}/${questions.length}</div>
      <div style="margin-top:8px;">
        <button onclick="window.location.href='academy.html'" class="btn-primary">Back to Academy</button>
        ${!passed ? `<button onclick="window.location.reload()" class="btn-secondary">Retry</button>` : ''}
        ${passed ? `<button onclick="window.location.href='certificate.html?module=${moduleId}'" class="btn-primary" style="background:linear-gradient(135deg,#ffb300,#f57c00);">Get Certificate</button>` : ''}
      </div>
    </div>
  `;
}