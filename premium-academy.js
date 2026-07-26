// ======================================================
// GTRADES-AXIS™ PREMIUM ACADEMY
// DASHBOARD ENGINE
// PART 1
// ======================================================

"use strict";

/* ======================================================
   PAGE ELEMENTS
====================================================== */

const modulesGrid=document.getElementById("modulesGrid");

const overallProgress=document.getElementById("overallProgress");

const completedLessons=document.getElementById("completedLessons");

const completedModules=document.getElementById("completedModules");

const totalStudyTime=document.getElementById("totalStudyTime");

const currentLevel=document.getElementById("currentLevel");

/* ======================================================
   INITIALIZE
====================================================== */

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        Academy.init();

        loadDashboard();

        loadModules();

    }

);

/* ======================================================
   LOAD DASHBOARD
====================================================== */

function loadDashboard(){

    const stats=

    Academy.statistics();

    if(overallProgress)

        overallProgress.textContent=

        stats.progress+"%";

    if(completedLessons)

        completedLessons.textContent=

        stats.completedLessons+

        "/"+

        stats.lessons;

    if(completedModules)

        completedModules.textContent=

        stats.completedModules+

        "/"+

        stats.modules;

    if(totalStudyTime)

        totalStudyTime.textContent=

        stats.studyTime+

        " min";

    if(currentLevel)

        currentLevel.textContent=

        calculateLevel(

            stats.progress

        );

}

/* ======================================================
   USER LEVEL
====================================================== */

function calculateLevel(progress){

    if(progress<20)

        return "Beginner";

    if(progress<40)

        return "Developing";

    if(progress<60)

        return "Intermediate";

    if(progress<80)

        return "Advanced";

    if(progress<100)

        return "Professional";

    return "Certified";

}

/* ======================================================
   LOAD MODULES
====================================================== */

function loadModules(){

    if(!modulesGrid)

        return;

    modulesGrid.innerHTML="";

    academyData.forEach(module=>{

        createModuleCard(module);

    });

}

/* ======================================================
   MODULE CARD
====================================================== */

function createModuleCard(module){

    const progress=

    Academy.getModuleProgress(

        module.id

    );

    const locked=

    Academy.moduleLocked(

        module.id

    );

    const card=

    document.createElement("div");

    card.className=

    "module-card";

    if(locked)

        card.classList.add("locked");

    card.innerHTML=`

        <div class="module-image">

            <img

            src="${module.thumbnail}"

            alt="${module.title}"

            onerror="this.src='images/module-placeholder.png'">

        </div>

        <div class="module-content">

            <div class="module-top">

                <span class="difficulty">

                    ${module.difficulty}

                </span>

            </div>

            <h3>

                ${module.title}

            </h3>

            <p>

                ${module.description}

            </p>

            <div class="module-meta">

                <span>

                    <i class="fas fa-book"></i>

                    ${module.lessons.length} Lessons

                </span>

                <span>

                    <i class="fas fa-clock"></i>

                    ${module.duration} min

                </span>

            </div>

            <div class="progress">

                <div

                class="progress-fill"

                style="width:${progress}%">

                </div>

            </div>

            <div class="progress-text">

                ${progress}% Completed

            </div>

            <button

            class="module-button"

            onclick="openModule(${module.id})"

            ${locked?"disabled":""}>

                ${locked?"Locked":"Continue"}

            </button>

        </div>

    `;

    modulesGrid.appendChild(card);

}
/* ======================================================
   OPEN MODULE
====================================================== */

function openModule(moduleId){

    if(Academy.moduleLocked(moduleId)){

        showToast(

            "Complete the previous module to unlock this one."

        );

        return;

    }

    Academy.setCurrentModule(moduleId);

    window.location.href=

    `module.html?id=${moduleId}`;

}

/* ======================================================
   REFRESH DASHBOARD
====================================================== */

function refreshDashboard(){

    loadDashboard();

    loadModules();

}

/* ======================================================
   CONTINUE LEARNING
====================================================== */

function continueLearning(){

    const lesson=

    Academy.currentLesson();

    window.location.href=

    `lesson.html?module=${lesson.module}&lesson=${lesson.lesson}`;

}

/* ======================================================
   START ACADEMY
====================================================== */

function startAcademy(){

    Academy.setCurrentModule(1);

    Academy.setCurrentLesson(1,1);

    window.location.href=

    "module.html?id=1";

}

/* ======================================================
   PROGRESS RING
====================================================== */

function updateProgressRing(){

    const ring=

    document.getElementById(

        "progressRing"

    );

    if(!ring) return;

    ring.style.setProperty(

        "--progress",

        Academy.percent()

    );

}

/* ======================================================
   CERTIFICATE STATUS
====================================================== */

function updateCertificateStatus(){

    const badge=

    document.getElementById(

        "certificateStatus"

    );

    if(!badge) return;

    if(

        Academy.percent()===100

    ){

        badge.innerHTML=`

            <i class="fas fa-award"></i>

            Certificate Unlocked

        `;

    }

    else{

        badge.innerHTML=`

            <i class="fas fa-lock"></i>

            Complete Academy

        `;

    }

}

/* ======================================================
   QUICK STATISTICS
====================================================== */

function populateStatistics(){

    const stats=

    Academy.statistics();

    const moduleStat=

    document.getElementById(

        "statsModules"

    );

    const lessonStat=

    document.getElementById(

        "statsLessons"

    );

    const timeStat=

    document.getElementById(

        "statsTime"

    );

    if(moduleStat)

        moduleStat.textContent=

        stats.completedModules;

    if(lessonStat)

        lessonStat.textContent=

        stats.completedLessons;

    if(timeStat)

        timeStat.textContent=

        stats.studyTime+" min";

}

/* ======================================================
   SEARCH MODULES
====================================================== */

function searchModules(keyword){

    keyword=

    keyword.toLowerCase();

    const cards=

    document.querySelectorAll(

        ".module-card"

    );

    cards.forEach(card=>{

        const text=

        card.innerText.toLowerCase();

        if(

            text.includes(keyword)

        ){

            card.style.display="block";

        }

        else{

            card.style.display="none";

        }

    });

}

/* ======================================================
   FILTER MODULES
====================================================== */

function filterModules(level){

    const cards=

    document.querySelectorAll(

        ".module-card"

    );

    cards.forEach(card=>{

        const difficulty=

        card.querySelector(

            ".difficulty"

        ).textContent;

        if(

            level==="All" ||

            difficulty===level

        ){

            card.style.display="block";

        }

        else{

            card.style.display="none";

        }

    });

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

            : "fa-circle-info"}"></i>

        </div>

        <div class="toast-content">

            <span>${message}</span>

        </div>

    `;

    document.body.appendChild(toast);

    setTimeout(()=>{

        toast.classList.add("show");

    },100);

    setTimeout(()=>{

        toast.classList.remove("show");

    },2800);

    setTimeout(()=>{

        toast.remove();

    },3200);

}

/* ======================================================
   UPDATE MODULE PROGRESS
====================================================== */

function updateModuleProgress(){

    document

    .querySelectorAll(".module-card")

    .forEach((card,index)=>{

        const module=

        academyData[index];

        const progress=

        Academy.getModuleProgress(

            module.id

        );

        const fill=

        card.querySelector(

            ".progress-fill"

        );

        const text=

        card.querySelector(

            ".progress-text"

        );

        if(fill)

            fill.style.width=

            progress+"%";

        if(text)

            text.textContent=

            progress+"% Completed";

    });

}

/* ======================================================
   UPDATE LOCK STATUS
====================================================== */

function updateLockedModules(){

    document

    .querySelectorAll(".module-card")

    .forEach((card,index)=>{

        const module=

        academyData[index];

        const button=

        card.querySelector(

            ".module-button"

        );

        if(

            Academy.moduleLocked(

                module.id

            )

        ){

            card.classList.add("locked");

            if(button){

                button.disabled=true;

                button.innerHTML=`

                    <i class="fas fa-lock"></i>

                    Locked

                `;

            }

        }

        else{

            card.classList.remove("locked");

            if(button){

                button.disabled=false;

                button.innerHTML=`

                    <i class="fas fa-play"></i>

                    Continue

                `;

            }

        }

    });

}

/* ======================================================
   UPDATE DASHBOARD
====================================================== */

function updateDashboard(){

    loadDashboard();

    updateProgressRing();

    updateModuleProgress();

    updateLockedModules();

    updateCertificateStatus();

    populateStatistics();

}

/* ======================================================
   RESET PROGRESS
====================================================== */

function resetAcademy(){

    if(

        !confirm(

        "Reset all Academy progress?"

        )

    ){

        return;

    }

    Academy.clearAll();

    updateDashboard();

    showToast(

        "Academy progress has been reset."

    );

}

/* ======================================================
   EXPORT PROGRESS
====================================================== */

function exportAcademyProgress(){

    const data=

    Academy.exportProgress();

    const blob=new Blob(

        [data],

        {

            type:

            "application/json"

        }

    );

    const url=

    URL.createObjectURL(blob);

    const link=

    document.createElement("a");

    link.href=url;

    link.download=

    "gtrades-academy-progress.json";

    link.click();

    URL.revokeObjectURL(url);

}

/* ======================================================
   REFRESH WHEN PAGE BECOMES ACTIVE
====================================================== */

window.addEventListener(

    "focus",

    ()=>{

        updateDashboard();

    }

);
/* ======================================================
   RESUME LEARNING
====================================================== */

function resumeLearning(){

    const lesson=Academy.currentLesson();

    if(!lesson){

        window.location.href="module.html?id=1";

        return;

    }

    window.location.href=

    `lesson.html?module=${lesson.module}&lesson=${lesson.lesson}`;

}

/* ======================================================
   OPEN CERTIFICATES
====================================================== */

function openCertificates(){

    window.location.href="certificates.html";

}

/* ======================================================
   OPEN PROFILE
====================================================== */

function openProfile(){

    window.location.href="profile.html";

}

/* ======================================================
   OPEN AI REVIEW
====================================================== */

function openAIReview(){

    window.location.href="ai-review.html";

}

/* ======================================================
   OPEN RESOURCES
====================================================== */

function openResources(){

    window.location.href="resources.html";

}

/* ======================================================
   OPEN MODULES
====================================================== */

function openModules(){

    const section=

    document.getElementById(

        "modulesSection"

    );

    if(section){

        section.scrollIntoView({

            behavior:"smooth",

            block:"start"

        });

    }

}

/* ======================================================
   GLOBAL SEARCH
====================================================== */

const academySearch=

document.getElementById(

    "academySearch"

);

if(academySearch){

    academySearch.addEventListener(

        "input",

        function(){

            searchModules(

                this.value

            );

        }

    );

}

/* ======================================================
   FILTER BUTTONS
====================================================== */

document

.querySelectorAll(

    "[data-filter]"

)

.forEach(button=>{

    button.addEventListener(

        "click",

        ()=>{

            filterModules(

                button.dataset.filter

            );

        }

    );

});

/* ======================================================
   QUICK ACTION BUTTONS
====================================================== */

const continueBtn=

document.getElementById(

    "continueLearning"

);

if(continueBtn){

    continueBtn.onclick=

    resumeLearning;

}

const startBtn=

document.getElementById(

    "startAcademy"

);

if(startBtn){

    startBtn.onclick=

    startAcademy;

}

const resetBtn=

document.getElementById(

    "resetAcademy"

);

if(resetBtn){

    resetBtn.onclick=

    resetAcademy;

}

const exportBtn=

document.getElementById(

    "exportProgress"

);

if(exportBtn){

    exportBtn.onclick=

    exportAcademyProgress;

}

/* ======================================================
   PAGE INITIALIZATION
====================================================== */

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        Academy.init();

        loadDashboard();

        loadModules();

        updateDashboard();

    }

);

/* ======================================================
   AUTO REFRESH
====================================================== */

window.addEventListener(

    "focus",

    ()=>{

        updateDashboard();

    }

);

window.addEventListener(

    "storage",

    ()=>{

        updateDashboard();

    }

);

/* ======================================================
   EXPOSE FUNCTIONS
====================================================== */

window.openModule=openModule;

window.resumeLearning=resumeLearning;

window.startAcademy=startAcademy;

window.resetAcademy=resetAcademy;

window.exportAcademyProgress=exportAcademyProgress;

window.openCertificates=openCertificates;

window.openProfile=openProfile;

window.openAIReview=openAIReview;

window.openResources=openResources;

window.openModules=openModules;

/* ======================================================
   GTRADES-AXIS™
   PREMIUM ACADEMY READY
====================================================== */

console.log(

    "GTRADES-AXIS™ Premium Academy Ready"

);