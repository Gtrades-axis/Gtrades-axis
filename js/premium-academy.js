// ======================================================
// GTRADES-AXIS™ PREMIUM ACADEMY
// premium-academy.js
// PART 1
// ======================================================

// ----------------------------
// MODULE DATA
// ----------------------------

const modules = [

{
id:1,
title:"Introduction",
description:"Welcome to GTRADES-AXIS™ and learn how the Academy works.",
lessons:5,
status:"current"
},

{
id:2,
title:"Market Structure",
description:"Master HTF Bias, MTF Bias and understand market structure.",
lessons:8,
status:"locked"
},

{
id:3,
title:"Liquidity",
description:"Understand institutional liquidity and liquidity sweeps.",
lessons:8,
status:"locked"
},

{
id:4,
title:"Supply & Demand",
description:"Learn institutional supply and demand trading.",
lessons:7,
status:"locked"
},

{
id:5,
title:"Trade Entries",
description:"Execute high probability Photon trade entries.",
lessons:8,
status:"locked"
},

{
id:6,
title:"Risk Management",
description:"Professional capital protection and risk management.",
lessons:6,
status:"locked"
},

{
id:7,
title:"Trading Psychology",
description:"Develop consistency, discipline and patience.",
lessons:6,
status:"locked"
}

];

// ======================================================
// DEFAULT PROGRESS
// ======================================================

const academyProgress={

completedModules:0,

completedLessons:0,

quizzesPassed:0,

certificates:0,

learningHours:0,

currentModule:1

};

// ======================================================
// ELEMENTS
// ======================================================

const modulesGrid=document.getElementById("modulesGrid");

const progressPercent=document.getElementById("progressPercent");

const progressText=document.getElementById("progressText");

const lessonCompleted=document.getElementById("lessonCompleted");

const quizPassed=document.getElementById("quizPassed");

const certificateCount=document.getElementById("certificateCount");

const learningHours=document.getElementById("learningHours");

const continueBtn=document.getElementById("continueBtn");

// ======================================================
// LOAD LOCAL STORAGE
// ======================================================

function loadProgress(){

const saved=

localStorage.getItem("gtradesAcademy");

if(saved){

Object.assign(

academyProgress,

JSON.parse(saved)

);

}

}

// ======================================================
// SAVE
// ======================================================

function saveProgress(){

localStorage.setItem(

"gtradesAcademy",

JSON.stringify(academyProgress)

);

}

// ======================================================
// START
// ======================================================

loadProgress();

saveProgress();
// ======================================================
// GENERATE MODULES
// ======================================================

function loadModules(){

    if(!modulesGrid) return;

    modulesGrid.innerHTML="";

    modules.forEach(module=>{

        let status="Locked";
        let className="locked";

        if(module.id<academyProgress.currentModule){

            status="Completed";
            className="completed";

        }

        else if(module.id===academyProgress.currentModule){

            status="Continue";
            className="available";

        }

        modulesGrid.innerHTML+=`

        <div class="module-card ${className}"

        onclick="openModule(${module.id})">

            <div class="module-number">

                Module ${module.id}

            </div>

            <h3>

                ${module.title}

            </h3>

            <p>

                ${module.description}

            </p>

            <small>

                ${module.lessons} Lessons

            </small>

            <br><br>

            <span class="module-status ${className}">

                ${status}

            </span>

        </div>

        `;

    });

}

// ======================================================
// DASHBOARD
// ======================================================

function updateDashboard(){

    const totalModules=modules.length;

    const completed=

    academyProgress.completedModules;

    const percent=

    Math.round(

    (completed/totalModules)*100

    );

    progressPercent.innerHTML=

    percent+"%";

    progressText.innerHTML=

    completed+

    " of "+

    totalModules+

    " Modules Completed";

    lessonCompleted.innerHTML=

    academyProgress.completedLessons;

    quizPassed.innerHTML=

    academyProgress.quizzesPassed;

    certificateCount.innerHTML=

    academyProgress.certificates;

    learningHours.innerHTML=

    academyProgress.learningHours+"h";

    document.querySelector(

    ".progress-ring"

    ).style.background=

    `conic-gradient(

    #1d9bf0 ${percent*3.6}deg,

    #263447 0deg

    )`;

}

// ======================================================
// OPEN MODULE
// ======================================================

function openModule(id){

    if(id>academyProgress.currentModule){

        return;

    }

    location.href=

    `module.html?module=${id}`;

}

// ======================================================
// CONTINUE LEARNING
// ======================================================

continueBtn.onclick=()=>{

location.href=

`module.html?module=${academyProgress.currentModule}`;

};

// ======================================================
// INITIALIZE
// ======================================================

updateDashboard();

loadModules();

saveProgress();