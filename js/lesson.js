// ======================================================
// GTRADES-AXIS™ PREMIUM ACADEMY
// LESSON PLAYER
// PART 1
// ======================================================

// =============================================
// GET URL PARAMETERS
// =============================================

const params = new URLSearchParams(window.location.search);

const moduleId = parseInt(params.get("module")) || 1;

const lessonId = parseInt(params.get("lesson")) || 1;

// =============================================
// HTML ELEMENTS
// =============================================

const moduleName = document.getElementById("moduleName");

const lessonSidebar = document.getElementById("lessonSidebar");

const lessonNumber = document.getElementById("lessonNumber");

const lessonTitle = document.getElementById("lessonTitle");

const lessonDescription = document.getElementById("lessonDescription");

const lessonVideo = document.getElementById("lessonVideo");

const lessonNotes = document.getElementById("lessonNotes");

const downloadPDF = document.getElementById("downloadPDF");

const previousLesson = document.getElementById("previousLesson");

const nextLesson = document.getElementById("nextLesson");

const completeLesson = document.getElementById("completeLesson");

// =============================================
// LOAD MODULE
// =============================================

const currentModule =
academyData.find(
module => module.id === moduleId
);

// =============================================
// COMPLETED LESSONS
// =============================================

let completedLessons =

JSON.parse(

localStorage.getItem(

`module_${moduleId}_progress`

)

) || [];

// =============================================
// LESSON DATA
// =============================================

function loadLesson(){

moduleName.textContent =
currentModule.title;

lessonNumber.textContent =
"Lesson " + lessonId;

lessonTitle.textContent =
currentLesson.title;

lessonDescription.textContent =
currentLesson.description;

// Temporary video

lessonVideo.src =
"https://www.youtube.com/embed/dQw4w9WgXcQ";

// Temporary notes

lessonNotes.innerHTML = `

<h3>
Lesson Overview
</h3>

<p>

This lesson forms part of the
GTRADES-AXIS™ Premium Academy.

Replace these notes with your
actual lesson content.

</p>

<br>

<ul>

<li>Study the lesson carefully.</li>

<li>Take personal notes.</li>

<li>Watch the video more than once.</li>

<li>Complete the lesson before continuing.</li>

</ul>

`;

}
// ======================================================
// BUILD LESSON SIDEBAR
// ======================================================

function buildSidebar(){

    lessonSidebar.innerHTML="";

    currentModule.lessons.forEach((lesson)=>{

        const completed=
        completedLessons.includes(lesson.id);

        const active=
        lesson.id===lessonId;

        let cardClass="lesson-sidebar-item";

        if(active){

            cardClass+=" active";

        }

        if(completed){

            cardClass+=" completed";

        }

        lessonSidebar.innerHTML+=`

        <div class="${cardClass}"

        onclick="goLesson(${lesson.id})">

            <h4>

                Lesson ${lesson.id}

            </h4>

            <p>

                ${lesson.title}

            </p>

        </div>

        `;

    });

}

// ======================================================
// GO TO LESSON
// ======================================================

function goLesson(id){

    location.href=

    `lesson.html?module=${moduleId}&lesson=${id}`;

}

// ======================================================
// PREVIOUS LESSON
// ======================================================

previousLesson.onclick=()=>{

    if(lessonId===1){

        return;

    }

    location.href=

    `lesson.html?module=${moduleId}&lesson=${lessonId-1}`;

};

// ======================================================
// NEXT LESSON
// ======================================================

nextLesson.onclick=()=>{

    if(

    lessonId===currentModule.lessons.length

    ){

        return;

    }

    location.href=

    `lesson.html?module=${moduleId}&lesson=${lessonId+1}`;

};

// ======================================================
// COMPLETE LESSON
// ======================================================

completeLesson.onclick=()=>{

    if(

    !completedLessons.includes(lessonId)

    ){

        completedLessons.push(lessonId);

    }

    localStorage.setItem(

    `module_${moduleId}_progress`,

    JSON.stringify(completedLessons)

    );

    // Unlock next module when all lessons are complete

    if(

    completedLessons.length===

    currentModule.lessons.length

    ){

        const academy=

        JSON.parse(

        localStorage.getItem("gtradesAcademy")

        ) || {};

        academy.completedModules=

        Math.max(

        academy.completedModules||0,

        moduleId

        );

        academy.currentModule=

        Math.min(

        moduleId+1,

        academyData.length

        );

        localStorage.setItem(

        "gtradesAcademy",

        JSON.stringify(academy)

        );

    }

    alert("Lesson completed successfully!");

    buildSidebar();

};

// ======================================================
// DOWNLOAD PDF
// ======================================================

downloadPDF.onclick=()=>{

    if(currentLesson.pdf){

        window.open(currentLesson.pdf);

    }else{

        alert("PDF coming soon.");

    }

};

// ======================================================
// INITIALIZE
// ======================================================

loadLesson();

buildSidebar();
// ======================================================
// LOAD VIDEO & NOTES
// ======================================================

function loadLessonContent(){

    // Load YouTube video if available
    if(currentLesson.video && currentLesson.video !== ""){

        lessonVideo.src = currentLesson.video;

    }else{

        lessonVideo.src = "";

    }

    // Load lesson notes
    if(currentLesson.notes && currentLesson.notes !== ""){

        lessonNotes.innerHTML = currentLesson.notes;

    }

}

// ======================================================
// UPDATE NAVIGATION
// ======================================================

function updateNavigation(){

    previousLesson.disabled = lessonId === 1;

    nextLesson.disabled =

        lessonId === currentModule.lessons.length;

}

// ======================================================
// SHOW NOTIFICATION
// ======================================================

function showNotification(message){

    const notification = document.createElement("div");

    notification.className = "academy-toast";

    notification.innerHTML = `
        <i class="fas fa-circle-check"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(()=>{

        notification.classList.add("show");

    },100);

    setTimeout(()=>{

        notification.classList.remove("show");

        setTimeout(()=>{

            notification.remove();

        },300);

    },2500);

}

// ======================================================
// OVERRIDE COMPLETE BUTTON
// ======================================================

completeLesson.onclick = ()=>{

    if(!completedLessons.includes(lessonId)){

        completedLessons.push(lessonId);

    }

    localStorage.setItem(

        `module_${moduleId}_progress`,

        JSON.stringify(completedLessons)

    );

    // Module completed
    if(completedLessons.length === currentModule.lessons.length){

        const academy = JSON.parse(

            localStorage.getItem("gtradesAcademy")

        ) || {};

        academy.completedModules =

            Math.max(

                academy.completedModules || 0,

                moduleId

            );

        academy.currentModule =

            Math.min(

                moduleId + 1,

                academyData.length

            );

        localStorage.setItem(

            "gtradesAcademy",

            JSON.stringify(academy)

        );

        showNotification("Module completed successfully!");

    }else{

        showNotification("Lesson completed!");

    }

    buildSidebar();

};

// ======================================================
// INITIALIZE
// ======================================================

loadLessonContent();

updateNavigation();