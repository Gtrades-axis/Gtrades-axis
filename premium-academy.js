/* ======================================================
   GTRADES-AXIS™ PREMIUM ACADEMY
   DASHBOARD
====================================================== */

const modulesContainer=document.getElementById("academyModules");

const overallProgress=document.getElementById("overallProgress");

const completedModules=document.getElementById("completedModules");

const completedLessons=document.getElementById("completedLessons");

const studyTime=document.getElementById("studyTime");

const continueLearning=document.getElementById("continueLearning");

/* ======================================================
   INITIALIZE
====================================================== */

document.addEventListener("DOMContentLoaded",()=>{

    Academy.init();

    loadStatistics();

    renderModules();

    initializeContinueLearning();

});

/* ======================================================
   LOAD DASHBOARD
====================================================== */

function loadStatistics(){

    const stats=Academy.statistics();

    if(overallProgress){

        overallProgress.textContent=

        stats.progress+"%";

    }

    if(completedModules){

        completedModules.textContent=

        stats.completedModules;

    }

    if(completedLessons){

        completedLessons.textContent=

        stats.completedLessons;

    }

    if(studyTime){

        studyTime.textContent=

        stats.studyTime+" min";

    }

}

/* ======================================================
   CONTINUE LEARNING
====================================================== */

function initializeContinueLearning(){

    if(!continueLearning){

        return;

    }

    continueLearning.onclick=function(){

        const lesson=

        Academy.getContinueLesson();

        location.href=

        `lesson.html?module=${lesson.module}&lesson=${lesson.lesson}`;

    };

}

/* ======================================================
   MODULE CARDS
====================================================== */

function renderModules(){

    if(!modulesContainer){

        return;

    }

    modulesContainer.innerHTML="";

    Academy.getModules().forEach(module=>{

        modulesContainer.appendChild(

            createModuleCard(module)

        );

    });

}

/* ======================================================
   CREATE CARD
====================================================== */

function createModuleCard(module){

    const locked=

    Academy.moduleLocked(module.id);

    const progress=

    Academy.moduleProgress(module.id);

    const card=

    document.createElement("div");

    card.className="academy-card";

    if(locked){

        card.classList.add("locked");

    }

    card.innerHTML=`

        <div class="academy-image">

            <img

            src="${module.thumbnail}"

            onerror="this.src='images/module-placeholder.png'">

        </div>

        <div class="academy-content">

            <h3>

                ${module.title}

            </h3>

            <p>

                ${module.description}

            </p>

            <div class="academy-meta">

                <span>

                    ${module.duration} mins

                </span>

                <span>

                    ${module.lessons.length} Lessons

                </span>

            </div>

            <div class="academy-progress">

                <div

                class="academy-progress-fill"

                style="width:${progress}%">

                </div>

            </div>

            <div class="academy-footer">

                <span>

                    ${progress}% Complete

                </span>

                <button

                class="academy-btn"

                ${locked?"disabled":""}>

                    ${locked?"Locked":"Open"}

                </button>

            </div>

        </div>

    `;

    if(!locked){

        card.onclick=function(){

            location.href=

            `module.html?module=${module.id}`;

        };

    }

    return card;

}
/* ======================================================
   SEARCH MODULES
====================================================== */

const searchInput=document.getElementById("academySearch");

if(searchInput){

    searchInput.addEventListener("input",function(){

        const keyword=this.value.toLowerCase().trim();

        modulesContainer.innerHTML="";

        Academy.getModules()

        .filter(module=>{

            return(

                module.title.toLowerCase().includes(keyword)

                ||

                module.description.toLowerCase().includes(keyword)

            );

        })

        .forEach(module=>{

            modulesContainer.appendChild(

                createModuleCard(module)

            );

        });

    });

}

/* ======================================================
   REFRESH DASHBOARD
====================================================== */

function refreshDashboard(){

    loadStatistics();

    renderModules();

}

/* ======================================================
   MODULE COMPLETION CHECK
====================================================== */

function checkCompletion(){

    const stats=Academy.statistics();

    if(

        stats.completedModules===

        Academy.getModules().length

    ){

        showBanner(

            "🎉 Congratulations! You have completed the GTRADES-AXIS™ Premium Academy."

        );

    }

}

/* ======================================================
   BANNER
====================================================== */

function showBanner(message){

    const banner=document.createElement("div");

    banner.className="academy-banner";

    banner.innerHTML=`

        <div class="academy-banner-content">

            <span>${message}</span>

        </div>

    `;

    document.body.appendChild(banner);

    setTimeout(()=>{

        banner.classList.add("show");

    },100);

    setTimeout(()=>{

        banner.classList.remove("show");

        setTimeout(()=>{

            banner.remove();

        },400);

    },4000);

}

/* ======================================================
   RESET BUTTON
====================================================== */

const resetProgress=document.getElementById("resetProgress");

if(resetProgress){

    resetProgress.onclick=function(){

        if(

            !confirm(

                "Reset all Academy progress?"

            )

        ){

            return;

        }

        Academy.reset();

        refreshDashboard();

        showBanner(

            "Progress has been reset."

        );

    };

}

/* ======================================================
   CERTIFICATES
====================================================== */

const certificateCount=document.getElementById("certificateCount");

if(certificateCount){

    certificateCount.textContent=

    Academy.getCertificates().length;

}

/* ======================================================
   BOOKMARKS
====================================================== */

const bookmarkCount=document.getElementById("bookmarkCount");

if(bookmarkCount){

    bookmarkCount.textContent=

    Academy.getBookmarks().length;

}

/* ======================================================
   STUDY TIMER
====================================================== */

let sessionStart=Date.now();

window.addEventListener("beforeunload",()=>{

    const minutes=Math.floor(

        (Date.now()-sessionStart)/60000

    );

    if(minutes>0){

        Academy.addStudyTime(minutes);

    }

});

/* ======================================================
   CARD ANIMATION
====================================================== */

function animateCards(){

    const cards=

    document.querySelectorAll(

        ".academy-card"

    );

    cards.forEach((card,index)=>{

        card.style.opacity="0";

        card.style.transform=

        "translateY(25px)";

        setTimeout(()=>{

            card.style.transition=

            ".4s ease";

            card.style.opacity="1";

            card.style.transform=

            "translateY(0px)";

        },index*70);

    });

}

/* ======================================================
   UPDATE DASHBOARD
====================================================== */

function updateDashboard(){

    loadStatistics();

    renderModules();

    animateCards();

    checkCompletion();

}

/* ======================================================
   START
====================================================== */

updateDashboard();

console.log(

    "✅ Premium Academy Dashboard Loaded"

);