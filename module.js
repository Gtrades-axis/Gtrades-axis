// ======================================================
// GTRADES-AXIS™ PREMIUM ACADEMY
// MODULE PAGE
// PART 1
// ======================================================

"use strict";

/* ======================================================
   URL PARAMETERS
====================================================== */

const params=new URLSearchParams(

    window.location.search

);

const moduleId=

parseInt(

    params.get("id")

)||1;

/* ======================================================
   HTML ELEMENTS
====================================================== */

const moduleTitle=

document.getElementById(

    "moduleTitle"

);

const moduleDescription=

document.getElementById(

    "moduleDescription"

);

const totalLessons=

document.getElementById(

    "totalLessons"

);

const moduleDuration=

document.getElementById(

    "moduleDuration"

);

const moduleDifficulty=

document.getElementById(

    "moduleDifficulty"

);

const progressBar=

document.getElementById(

    "moduleProgressBar"

);

const progressText=

document.getElementById(

    "moduleProgressText"

);

const lessonList=

document.getElementById(

    "lessonList"

);

const backButton=

document.getElementById(

    "backButton"

);

/* ======================================================
   LOAD MODULE
====================================================== */

const currentModule=

Academy.getModule(

    moduleId

);

/* ======================================================
   VALIDATE MODULE
====================================================== */

if(!currentModule){

    alert(

        "Module not found."

    );

    window.location.href=

    "premium-academy.html";

    throw new Error(

        "Invalid Module"

    );

}

/* ======================================================
   SET CURRENT MODULE
====================================================== */

Academy.setCurrentModule(

    moduleId

);

/* ======================================================
   LOAD MODULE INFORMATION
====================================================== */

function loadModule(){

    moduleTitle.textContent=

    currentModule.title;

    moduleDescription.textContent=

    currentModule.description;

    totalLessons.textContent=

    currentModule.lessons.length;

    moduleDuration.textContent=

    currentModule.duration+

    " min";

    if(moduleDifficulty){

        moduleDifficulty.textContent=

        currentModule.difficulty;

    }

    updateProgress();

    renderLessons();

}

/* ======================================================
   UPDATE PROGRESS
====================================================== */

function updateProgress(){

    const progress=

    Academy.getModuleProgress(

        moduleId

    );

    if(progressBar){

        progressBar.style.width=

        progress+"%";

    }

    if(progressText){

        progressText.textContent=

        progress+

        "% Completed";

    }

}

/* ======================================================
   LESSON COUNT
====================================================== */

function completedLessons(){

    return currentModule.lessons.filter(

        lesson=>Academy.lessonCompleted(

            moduleId,

            lesson.id

        )

    ).length;

}
/* ======================================================
   RENDER LESSONS
====================================================== */

function renderLessons(){

    lessonList.innerHTML="";

    currentModule.lessons.forEach((lesson,index)=>{

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

                <div class="lesson-details">

                    <h3>

                        ${lesson.title}

                    </h3>

                    <p>

                        ${lesson.description}

                    </p>

                    <div class="lesson-meta">

                        <span>

                            <i class="fas fa-clock"></i>

                            ${lesson.duration} min

                        </span>

                    </div>

                </div>

            </div>

            <div class="lesson-right">

                ${
                    completed
                    ?

                    `<span class="lesson-status completed">

                        <i class="fas fa-circle-check"></i>

                        Completed

                    </span>`

                    :

                    locked

                    ?

                    `<span class="lesson-status locked">

                        <i class="fas fa-lock"></i>

                        Locked

                    </span>`

                    :

                    `<button

                        class="lesson-button"

                        onclick="openLesson(${lesson.id})">

                        Start Lesson

                    </button>`
                }

            </div>

        `;

        lessonList.appendChild(card);

    });

}

/* ======================================================
   OPEN LESSON
====================================================== */

function openLesson(lessonId){

    if(

        Academy.lessonLocked(

            moduleId,

            lessonId

        )

    ){

        showToast(

            "Complete the previous lesson first.",

            "error"

        );

        return;

    }

    Academy.setCurrentLesson(

        moduleId,

        lessonId

    );

    window.location.href=

    `lesson.html?module=${moduleId}&lesson=${lessonId}`;

}

/* ======================================================
   NEXT AVAILABLE LESSON
====================================================== */

function nextLesson(){

    for(

        const lesson of currentModule.lessons

    ){

        if(

            !Academy.lessonCompleted(

                moduleId,

                lesson.id

            )

        ){

            openLesson(

                lesson.id

            );

            return;

        }

    }

}

/* ======================================================
   MODULE STATUS
====================================================== */

function moduleCompleted(){

    return Academy.moduleCompleted(

        moduleId

    );

}
/* ======================================================
   TOAST NOTIFICATION
====================================================== */

function showToast(message,type="success"){

    const oldToast=document.querySelector(".academy-toast");

    if(oldToast){

        oldToast.remove();

    }

    const toast=document.createElement("div");

    toast.className=`academy-toast ${type}`;

    toast.innerHTML=`

        <div class="toast-icon">

            <i class="fas ${type==="success"

            ? "fa-circle-check"

            : "fa-circle-exclamation"}"></i>

        </div>

        <div class="toast-message">

            ${message}

        </div>

    `;

    document.body.appendChild(toast);

    setTimeout(()=>{

        toast.classList.add("show");

    },100);

    setTimeout(()=>{

        toast.classList.remove("show");

    },2500);

    setTimeout(()=>{

        toast.remove();

    },3000);

}

/* ======================================================
   CONTINUE LEARNING
====================================================== */

function continueLearning(){

    const next=currentModule.lessons.find(

        lesson=>

        !Academy.lessonCompleted(

            moduleId,

            lesson.id

        )

    );

    if(next){

        openLesson(next.id);

        return;

    }

    showToast(

        "Module already completed."

    );

}

/* ======================================================
   MODULE SUMMARY
====================================================== */

function updateSummary(){

    const completed=

    completedLessons();

    const total=

    currentModule.lessons.length;

    const completedElement=

    document.getElementById(

        "completedLessons"

    );

    if(completedElement){

        completedElement.textContent=

        completed+"/"+total;

    }

}

/* ======================================================
   MODULE BADGE
====================================================== */

function updateBadge(){

    const badge=

    document.getElementById(

        "moduleBadge"

    );

    if(!badge) return;

    if(moduleCompleted()){

        badge.innerHTML=`

            <i class="fas fa-award"></i>

            Completed

        `;

    }

    else{

        badge.innerHTML=`

            <i class="fas fa-book-open"></i>

            ${currentModule.difficulty}

        `;

    }

}

/* ======================================================
   MODULE IMAGE
====================================================== */

function loadThumbnail(){

    const image=

    document.getElementById(

        "moduleThumbnail"

    );

    if(!image) return;

    image.src=

    currentModule.thumbnail;

    image.onerror=function(){

        this.src=

        "images/module-placeholder.png";

    };

}

/* ======================================================
   STUDY TIMER
====================================================== */

let studyStart=

Date.now();

window.addEventListener(

    "beforeunload",

    ()=>{

        const minutes=

        Math.round(

            (Date.now()-studyStart)

            /60000

        );

        if(minutes>0){

            Academy.addStudyTime(

                minutes

            );

        }

    }

);

/* ======================================================
   REFRESH MODULE
====================================================== */

function refreshModule(){

    updateProgress();

    updateSummary();

    updateBadge();

    renderLessons();

}
/* ======================================================
   BACK BUTTON
====================================================== */

if(backButton){

    backButton.addEventListener(

        "click",

        ()=>{

            window.location.href=

            "premium-academy.html";

        }

    );

}

/* ======================================================
   MODULE COMPLETION MESSAGE
====================================================== */

function checkModuleCompletion(){

    if(

        Academy.moduleCompleted(moduleId)

    ){

        showToast(

            "🎉 Module Completed Successfully!"

        );

    }

}

/* ======================================================
   KEYBOARD SHORTCUTS
====================================================== */

document.addEventListener(

    "keydown",

    function(e){

        // ESC → Back

        if(e.key==="Escape"){

            window.location.href=

            "premium-academy.html";

        }

        // ENTER → Continue Learning

        if(e.key==="Enter"){

            continueLearning();

        }

    }

);

/* ======================================================
   PAGE INITIALIZATION
====================================================== */

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        Academy.init();

        loadModule();

        updateSummary();

        updateBadge();

        loadThumbnail();

        checkModuleCompletion();

    }

);

/* ======================================================
   REFRESH WHEN TAB BECOMES ACTIVE
====================================================== */

window.addEventListener(

    "focus",

    ()=>{

        refreshModule();

    }

);

window.addEventListener(

    "storage",

    ()=>{

        refreshModule();

    }

);

/* ======================================================
   GLOBAL FUNCTIONS
====================================================== */

window.openLesson=openLesson;

window.continueLearning=continueLearning;

window.refreshModule=refreshModule;

/* ======================================================
   MODULE READY
====================================================== */

console.log(

    "GTRADES-AXIS™ Module Loaded",

    currentModule.title

);

/* ======================================================
   END OF FILE
====================================================== */