// ======================================================
// GTRADES-AXIS™
// MODULE PAGE
// PART 1
// ======================================================

// =============================================
// GET MODULE ID
// =============================================

const params = new URLSearchParams(window.location.search);

const moduleId = parseInt(params.get("module")) || 1;

// =============================================
// HTML ELEMENTS
// =============================================

const moduleTitle = document.getElementById("moduleTitle");

const moduleDescription = document.getElementById("moduleDescription");

const totalLessons = document.getElementById("totalLessons");

const moduleDuration = document.getElementById("moduleDuration");

const lessonList = document.getElementById("lessonList");

const progressBar = document.getElementById("moduleProgressBar");

const progressText = document.getElementById("moduleProgressText");

// =============================================
// MODULE DATA
// =============================================

const currentModule =
academyData.find(
module => module.id === moduleId
);


// =============================================
// CURRENT MODULE
// =============================================

const currentModule = academyModules[moduleId];
// ======================================================
// LOAD MODULE INFORMATION
// ======================================================

function loadModule(){

    if(!currentModule){

        moduleTitle.textContent="Module Not Found";

        moduleDescription.textContent="The requested module does not exist.";

        return;

    }

    moduleTitle.textContent=currentModule.title;

    moduleDescription.textContent=currentModule.description;

    totalLessons.textContent=currentModule.lessons.length;

    moduleDuration.textContent=currentModule.duration;

    renderLessons();

    updateProgress();

}

// ======================================================
// RENDER LESSONS
// ======================================================

function renderLessons(){

    lessonList.innerHTML="";

    // Progress saved for this module
    const completedLessons=

    JSON.parse(

    localStorage.getItem(

    `module_${moduleId}_progress`

    )

    ) || [];

    currentModule.lessons.forEach((lesson,index)=>{

        const completed=

        completedLessons.includes(lesson.id);

        // Lesson unlock logic
        let locked=false;

        if(index>0){

            locked=

            !completedLessons.includes(

            currentModule.lessons[index-1].id

            );

        }

        let cardClass="";

        let buttonText="Start Lesson";

        if(completed){

            cardClass="completed";

            buttonText="Review Lesson";

        }

        if(locked){

            cardClass="locked";

            buttonText="Locked";

        }

        lessonList.innerHTML+=`

        <div class="lesson-card ${cardClass}">

            <div class="lesson-left">

                <div class="lesson-number">

                    ${lesson.id}

                </div>

                <div class="lesson-info">

                    <h3>

                        ${lesson.title}

                    </h3>

                    <p>

                        ${lesson.description}

                    </p>

                    <div class="lesson-meta">

                        <span class="lesson-badge">

                            ⏱ ${lesson.duration}

                        </span>

                    </div>

                </div>

            </div>

            <div class="lesson-right">

                <button

                class="lesson-btn"

                ${locked ? "disabled" : ""}

                onclick="openLesson(${lesson.id})">

                ${buttonText}

                </button>

            </div>

        </div>

        `;

    });

}

// ======================================================
// UPDATE PROGRESS
// ======================================================

function updateProgress(){

    const completedLessons=

    JSON.parse(

    localStorage.getItem(

    `module_${moduleId}_progress`

    )

    ) || [];

    const total=currentModule.lessons.length;

    const completed=completedLessons.length;

    const percent=

    total===0 ? 0 :

    Math.round(

    (completed/total)*100

    );

    progressBar.style.width=

    percent+"%";

    progressText.textContent=

    percent+"% Completed";

}

// ======================================================
// OPEN LESSON
// ======================================================

function openLesson(lessonId){

    window.location.href=

    `lesson.html?module=${moduleId}&lesson=${lessonId}`;

}

// ======================================================
// INITIALIZE
// ======================================================

loadModule();