// ======================================================
// GTRADES-AXIS™ PREMIUM ACADEMY
// academy.js
// ======================================================

// ======================================================
// LOAD / CREATE PROGRESS
// ======================================================

let progress = JSON.parse(localStorage.getItem("academyProgress"));

if (!progress) {

    progress = {

        completedModules: [1],

        currentModule: 2,

        completedLessons: 5

    };

}

// ======================================================
// SAVE
// ======================================================

function saveProgress() {

    localStorage.setItem(
        "academyProgress",
        JSON.stringify(progress)
    );

}

// ======================================================
// UPDATE DASHBOARD
// ======================================================

function updateDashboard() {

    const completed = progress.completedModules.length;

    const total = academyData.length;

    const percent = Math.round((completed / total) * 100);

    // Progress %

    const progressText = document.getElementById("overallProgress");

    if (progressText) {

        progressText.textContent = percent + "%";

    }

    // Completed Modules

    const completedModules = document.getElementById("completedModules");

    if (completedModules) {

        completedModules.textContent = `${completed} / ${total}`;

    }

    // Progress Circle

    const circle = document.querySelector(".progress-circle");

    if (circle) {

        circle.style.background = `
        radial-gradient(circle,#131c2d 60%,transparent 61%),
        conic-gradient(
            #1d9bf0 ${percent * 3.6}deg,
            #263447 0deg
        )`;

    }

}

// ======================================================
// LOAD MODULES
// ======================================================

function loadModules() {

    const container = document.getElementById("modulesGrid");

    if (!container) return;

    container.innerHTML = "";

    academyData.forEach(module => {

        const completed =
            progress.completedModules.includes(module.id);

        const current =
            progress.currentModule === module.id;

        const locked =
            !completed && !current;

        const card = document.createElement("div");

        card.className = `module-card ${locked ? "locked" : "unlocked"}`;

        card.dataset.module = module.id;

        card.innerHTML = `

            <div class="module-number">

                Module ${module.id}

            </div>

            <h3>${module.title}</h3>

            <p>

                ${module.description}

            </p>

            <small>

                ${module.lessons.length} Lessons

            </small>

            <br><br>

            <span class="module-status ${locked ? "" : "available"}">

                ${
                    completed
                    ? "Completed"
                    : current
                    ? "Continue"
                    : "Locked"
                }

            </span>

        `;

        if (!locked) {

            card.addEventListener("click", () => {

                openModule(module.id);

            });

        }

        container.appendChild(card);

    });

}

// ======================================================
// OPEN MODULE
// ======================================================

// ======================================================
// OPEN MODULE
// ======================================================

function openModule(id) {

    // Save current module
    localStorage.setItem("currentModule", id);

    // Open the lesson page
    location.href='module.html?module=${module.id}'

}

// ======================================================
// CONTINUE LEARNING
// ======================================================

// ======================================================
// CONTINUE LEARNING
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    const continueBtn = document.querySelector(".continue-btn");

    if (continueBtn) {

        continueBtn.addEventListener("click", () => {

            openModule(progress.currentModule);

        });

    }

});
// ======================================================
// COMPLETE MODULE
// ======================================================

function completeModule(moduleId) {

    if (!progress.completedModules.includes(moduleId)) {

        progress.completedModules.push(moduleId);

    }

    if (moduleId < academyData.length) {

        progress.currentModule = moduleId + 1;

    }

    saveProgress();

    updateDashboard();

    loadModules();

}

// ======================================================
// RESET ACADEMY
// ======================================================

function resetAcademy() {

    localStorage.removeItem("academyProgress");

    location.reload();

}

// ======================================================
// INIT
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    updateDashboard();

    loadModules();

    saveProgress();

});