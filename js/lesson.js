// ======================================================
// GTRADES-AXIS™ PREMIUM ACADEMY
// LESSON PLAYER
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

    params.get("module")

)||1;

const lessonId=

parseInt(

    params.get("lesson")

)||1;

/* ======================================================
   HTML ELEMENTS
====================================================== */

const moduleName=

document.getElementById(

    "moduleName"

);

const lessonSidebar=

document.getElementById(

    "lessonSidebar"

);

const lessonNumber=

document.getElementById(

    "lessonNumber"

);

const lessonTitle=

document.getElementById(

    "lessonTitle"

);

const lessonDescription=

document.getElementById(

    "lessonDescription"

);

const lessonVideo=

document.getElementById(

    "lessonVideo"

);

const lessonNotes=

document.getElementById(

    "lessonNotes"

);

const downloadPDF=

document.getElementById(

    "downloadPDF"

);

const previousLesson=

document.getElementById(

    "previousLesson"

);

const nextLesson=

document.getElementById(

    "nextLesson"

);

const completeLesson=

document.getElementById(

    "completeLesson"

);

/* ======================================================
   LOAD DATA
====================================================== */

const currentModule=

Academy.getModule(

    moduleId

);

if(!currentModule){

    window.location.href=

    "premium-academy.html";

    throw new Error(

        "Module not found."

    );

}

const currentLesson=

Academy.getLesson(

    moduleId,

    lessonId

);

if(!currentLesson){

    window.location.href=

    `module.html?id=${moduleId}`;

    throw new Error(

        "Lesson not found."

    );

}

/* ======================================================
   SAVE CURRENT LESSON
====================================================== */

Academy.setCurrentLesson(

    moduleId,

    lessonId

);

/* ======================================================
   LOAD LESSON
====================================================== */

function loadLesson(){

    moduleName.textContent=

    currentModule.title;

    lessonNumber.textContent=

    "Lesson "+lessonId;

    lessonTitle.textContent=

    currentLesson.title;

    lessonDescription.textContent=

    currentLesson.description;

    loadVideo();

    loadNotes();

}

/* ======================================================
   LOAD VIDEO
====================================================== */

function loadVideo(){

    if(

        currentLesson.video &&

        currentLesson.video!=="" 

    ){

        lessonVideo.src=

        currentLesson.video;

    }

    else{

        lessonVideo.src="";

    }

}

/* ======================================================
   LOAD NOTES
====================================================== */

function loadNotes(){

    if(

        currentLesson.notes &&

        currentLesson.notes!=="" 

    ){

        lessonNotes.innerHTML=

        currentLesson.notes;

    }

    else{

        lessonNotes.innerHTML=`

            <h3>

                Lesson Notes

            </h3>

            <p>

                Lesson notes have not yet been uploaded.

            </p>

            <br>

            <p>

                They will appear here automatically after
                being uploaded from the Admin Portal.

            </p>

        `;

    }

}
/* ======================================================
   BUILD LESSON SIDEBAR
====================================================== */

function buildSidebar(){

    lessonSidebar.innerHTML="";

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

        const active=

        lesson.id===lessonId;

        const item=

        document.createElement("div");

        item.className="lesson-sidebar-item";

        if(active)

            item.classList.add("active");

        if(completed)

            item.classList.add("completed");

        if(locked)

            item.classList.add("locked");

        item.innerHTML=`

            <div class="lesson-sidebar-header">

                <span>

                    Lesson ${lesson.id}

                </span>

                ${completed

                    ?

                    `<i class="fas fa-circle-check"></i>`

                    :

                    locked

                    ?

                    `<i class="fas fa-lock"></i>`

                    :

                    `<i class="fas fa-play"></i>`

                }

            </div>

            <p>

                ${lesson.title}

            </p>

        `;

        if(!locked){

            item.onclick=()=>{

                goLesson(

                    lesson.id

                );

            };

        }

        lessonSidebar.appendChild(item);

    });

}

/* ======================================================
   OPEN LESSON
====================================================== */

function goLesson(id){

    window.location.href=

    `lesson.html?module=${moduleId}&lesson=${id}`;

}

/* ======================================================
   PREVIOUS LESSON
====================================================== */

previousLesson.onclick=function(){

    if(lessonId<=1)

        return;

    goLesson(

        lessonId-1

    );

};

/* ======================================================
   NEXT LESSON
====================================================== */

nextLesson.onclick=function(){

    if(

        !Academy.lessonCompleted(

            moduleId,

            lessonId

        )

    ){

        showToast(

            "Complete this lesson before continuing.",

            "error"

        );

        return;

    }

    if(

        lessonId>=currentModule.lessons.length

    )

        return;

    goLesson(

        lessonId+1

    );

};

/* ======================================================
   UPDATE NAVIGATION
====================================================== */

function updateNavigation(){

    previousLesson.disabled=

    lessonId===1;

    nextLesson.disabled=

    lessonId===

    currentModule.lessons.length;

}

/* ======================================================
   UPDATE BUTTON
====================================================== */

function updateCompleteButton(){

    if(

        Academy.lessonCompleted(

            moduleId,

            lessonId

        )

    ){

        completeLesson.innerHTML=`

            <i class="fas fa-circle-check"></i>

            Lesson Completed

        `;

        completeLesson.disabled=true;

    }

}
/* ======================================================
   COMPLETE LESSON
====================================================== */

completeLesson.onclick=function(){

    if(

        Academy.lessonCompleted(

            moduleId,

            lessonId

        )

    ){

        return;

    }

    Academy.completeLesson(

        moduleId,

        lessonId

    );

    updateCompleteButton();

    buildSidebar();

    updateNavigation();

    showToast(

        "Lesson completed successfully."

    );

    // Last lesson in module
    if(

        lessonId===

        currentModule.lessons.length

    ){

        if(

            Academy.moduleCompleted(

                moduleId

            )

        ){

            showToast(

                "🎉 Module Completed!"

            );

        }

    }

};

/* ======================================================
   DOWNLOAD PDF
====================================================== */

downloadPDF.onclick=function(){

    if(

        currentLesson.pdf &&

        currentLesson.pdf!==""

    ){

        window.open(

            currentLesson.pdf,

            "_blank"

        );

    }

    else{

        showToast(

            "PDF has not been uploaded yet.",

            "error"

        );

    }

};

/* ======================================================
   LESSON TIMER
====================================================== */

let lessonStart=

Date.now();

window.addEventListener(

    "beforeunload",

    ()=>{

        const minutes=

        Math.max(

            1,

            Math.round(

                (Date.now()-lessonStart)

                /60000

            )

        );

        Academy.addStudyTime(

            minutes

        );

    }

);

/* ======================================================
   PERSONAL NOTES
====================================================== */

const personalNotes=

document.getElementById(

    "personalNotes"

);

if(personalNotes){

    personalNotes.value=

    Academy.getPersonalNotes(

        moduleId,

        lessonId

    );

    personalNotes.addEventListener(

        "keyup",

        ()=>{

            Academy.savePersonalNotes(

                moduleId,

                lessonId,

                personalNotes.value

            );

        }

    );

}

/* ======================================================
   BOOKMARK
====================================================== */

const bookmarkBtn=

document.getElementById(

    "bookmarkLesson"

);

if(bookmarkBtn){

    bookmarkBtn.onclick=function(){

        Academy.bookmarkLesson(

            moduleId,

            lessonId

        );

        showToast(

            "Lesson bookmarked."

        );

    };

}

/* ======================================================
   LESSON STATUS
====================================================== */

function updateLessonStatus(){

    const status=

    document.getElementById(

        "lessonStatus"

    );

    if(!status) return;

    if(

        Academy.lessonCompleted(

            moduleId,

            lessonId

        )

    ){

        status.innerHTML=`

            <i class="fas fa-circle-check"></i>

            Completed

        `;

    }

    else{

        status.innerHTML=`

            <i class="fas fa-book-open"></i>

            In Progress

        `;

    }

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

            <i class="fas ${
                type==="success"
                ?"fa-circle-check"
                :"fa-circle-exclamation"
            }"></i>

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
   KEYBOARD SHORTCUTS
====================================================== */

document.addEventListener(

    "keydown",

    function(e){

        // Left Arrow

        if(e.key==="ArrowLeft"){

            previousLesson.click();

        }

        // Right Arrow

        if(e.key==="ArrowRight"){

            nextLesson.click();

        }

        // Escape

        if(e.key==="Escape"){

            window.location.href=

            `module.html?id=${moduleId}`;

        }

    }

);

/* ======================================================
   REFRESH PAGE
====================================================== */

function refreshLesson(){

    loadLesson();

    buildSidebar();

    updateNavigation();

    updateCompleteButton();

    updateLessonStatus();

}

/* ======================================================
   AUTO REFRESH
====================================================== */

window.addEventListener(

    "focus",

    ()=>{

        refreshLesson();

    }

);

window.addEventListener(

    "storage",

    ()=>{

        refreshLesson();

    }

);

/* ======================================================
   INITIALIZE PAGE
====================================================== */

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        Academy.init();

        loadLesson();

        buildSidebar();

        updateNavigation();

        updateCompleteButton();

        updateLessonStatus();

    }

);

/* ======================================================
   GLOBAL FUNCTIONS
====================================================== */

window.goLesson=goLesson;

window.refreshLesson=refreshLesson;

/* ======================================================
   LESSON PLAYER READY
====================================================== */

console.log(

    "GTRADES-AXIS™ Lesson Player Loaded",

    currentModule.title,

    "- Lesson",

    lessonId

);

/* ======================================================
   END OF FILE
====================================================== */