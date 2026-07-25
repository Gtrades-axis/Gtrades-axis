/* ==========================================================
   GTRADES-AXIS™ PREMIUM ACADEMY
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    loadModules();

    updateStatistics();

});

/* ==========================================================
   LOAD MODULES
========================================================== */

function loadModules(){

    const grid=document.getElementById("modulesGrid");

    if(!grid) return;

    grid.innerHTML="";

    academyData.forEach(module=>{

        const completed=module.lessons.filter(l=>l.completed).length;

        const totalLessons=module.lessons.length;

        const progress=Math.round((completed/totalLessons)*100);

        const card=document.createElement("div");

        card.className=`module-card ${module.locked?"locked":""}`;

        card.innerHTML=`

            <div class="module-top">

                <h3>${module.title}</h3>

                <span>${module.difficulty}</span>

            </div>

            <p>${module.description}</p>

            <div class="module-info">

                <span>
                    <i class="fas fa-book"></i>
                    ${totalLessons} Lessons
                </span>

                <span>
                    <i class="fas fa-clock"></i>
                    ${module.duration} min
                </span>

            </div>

            <div class="progress-bar">

                <div
                class="progress-fill"
                style="width:${progress}%"></div>

            </div>

            <button
            class="module-btn"
            ${module.locked?"disabled":""}
            onclick="openModule(${module.id})">

                ${module.locked?"Locked":"Open Module"}

            </button>

        `;

        grid.appendChild(card);

    });

}

/* ==========================================================
   OPEN MODULE
========================================================== */

function openModule(id){

    window.location.href=`module.html?id=${id}`;

}

/* ==========================================================
   UPDATE DASHBOARD
========================================================== */

function updateStatistics(){

    const totalModules=academyData.length;

    const totalLessons=academyData.reduce(
        (sum,m)=>sum+m.lessons.length,0
    );

    const completedLessons=academyData.reduce(
        (sum,m)=>sum+m.lessons.filter(l=>l.completed).length,0
    );

    const overallProgress=
        Math.round((completedLessons/totalLessons)*100)||0;

    const progress=document.getElementById("overallProgress");

    if(progress)
        progress.innerText=overallProgress+"%";

    const lessons=document.getElementById("completedLessons");

    if(lessons)
        lessons.innerText=completedLessons;

}
