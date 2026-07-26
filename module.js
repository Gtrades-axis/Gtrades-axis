/* ======================================================
   GTRADES-AXIS™
   MODULE PAGE
====================================================== */

const params = new URLSearchParams(window.location.search);

const moduleId = parseInt(params.get("module")) || 1;

Academy.init();

const module = Academy.getModule(moduleId);

/* ======================================================
   HTML ELEMENTS
====================================================== */

const moduleTitle = document.getElementById("moduleTitle");
const moduleDescription = document.getElementById("moduleDescription");

const totalLessons = document.getElementById("totalLessons");
const moduleDuration = document.getElementById("moduleDuration");

const lessonList = document.getElementById("lessonList");

const progressBar = document.getElementById("moduleProgressBar");
const progressText = document.getElementById("moduleProgressText");

/* ======================================================
   LOAD MODULE
====================================================== */

function loadModule(){

    if(!module){

        moduleTitle.textContent="Module Not Found";

        return;

    }

    moduleTitle.textContent=module.title;

    moduleDescription.textContent=module.description;

    totalLessons.textContent=module.lessons.length;

    moduleDuration.textContent=module.duration+" min";

    updateProgress();

    renderLessons();

}

/* ======================================================
   PROGRESS
====================================================== */

function updateProgress(){

    const progress=

    Academy.moduleProgress(moduleId);

    progressBar.style.width=

    progress+"%";

    progressText.textContent=

    progress+"% Completed";

}

/* ======================================================
   LESSONS
====================================================== */

function renderLessons(){

    lessonList.innerHTML="";

    module.lessons.forEach(lesson=>{

        const completed=

        Academy.lessonCompleted(

            moduleId,

            lesson.id

        );

        const locked=

        Academy.lessonLocked(

            moduleId,

            lesson.id

        );

        const card=

        document.createElement("div");

        card.className="lesson-card";

        if(completed){

            card.classList.add("completed");

        }

        if(locked){

            card.classList.add("locked");

        }

        card.innerHTML=`

            <div class="lesson-left">

                <div class="lesson-number">

                    ${lesson.id}

                </div>

                <div class="lesson-info">

                    <h3>

                        ${lesson.title}

                    </h3>

                    <p>

                        Duration:

                        ${lesson.duration} mins

                    </p>

                </div>

            </div>

            <button

            class="lesson-btn"

            ${locked?"disabled":""}>

                ${completed?"Review":"Start"}

            </button>

        `;

        if(!locked){

            card.querySelector("button")

            .onclick=()=>{

                Academy.setContinueLesson(

                    moduleId,

                    lesson.id

                );

                location.href=

                `lesson.html?module=${moduleId}&lesson=${lesson.id}`;

            };

        }

        lessonList.appendChild(card);

    });

}

/* ======================================================
   AUTO REFRESH
====================================================== */

window.addEventListener(

    "storage",

    ()=>{

        updateProgress();

        renderLessons();

    }

);

/* ======================================================
   INIT
====================================================== */

loadModule();

console.log(

    "✅ Module Loaded"

);