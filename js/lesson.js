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
// LOAD CURRENT MODULE
// =============================================

const currentModule = academyData.find(
    module => module.id === moduleId
);

// =============================================
// MODULE VALIDATION
// =============================================

if(!currentModule){

    alert("Module not found.");

    window.location.href="premium-academy.html";

    throw new Error("Module not found");

}

// =============================================
// LOAD CURRENT LESSON
// =============================================

const currentLesson = currentModule.lessons.find(
    lesson => lesson.id === lessonId
);

// =============================================
// LESSON VALIDATION
// =============================================

if(!currentLesson){

    alert("Lesson not found.");

    window.location.href=`module.html?id=${moduleId}`;

    throw new Error("Lesson not found");

}

// =============================================
// COMPLETED LESSONS
// =============================================

let completedLessons = JSON.parse(

    localStorage.getItem(

        `module_${moduleId}_progress`

    )

) || [];

// =============================================
// LOAD LESSON
// =============================================

function loadLesson(){

    moduleName.textContent=currentModule.title;

    lessonNumber.textContent=`Lesson ${lessonId}`;

    lessonTitle.textContent=currentLesson.title;

    lessonDescription.textContent=

    "Complete this lesson before proceeding to the next lesson.";

    // -----------------------------
    // VIDEO
    // -----------------------------

    if(currentLesson.video && currentLesson.video !== ""){

        lessonVideo.src=currentLesson.video;

    }else{

        lessonVideo.src="";

    }

    // -----------------------------
    // NOTES
    // -----------------------------

    if(currentLesson.notes && currentLesson.notes !== ""){

        lessonNotes.innerHTML=currentLesson.notes;

    }else{

        lessonNotes.innerHTML=`

            <h3>Lesson Notes</h3>

            <p>

            Lesson notes have not been uploaded yet.

            </p>

            <br>

            <p>

            Your instructor will upload the lesson notes
            through the Admin Portal.

            </p>

        `;

    }

}
// ======================================================
// BUILD LESSON SIDEBAR
// ======================================================

function buildSidebar(){

    lessonSidebar.innerHTML="";

    currentModule.lessons.forEach((lesson,index)=>{

        const completed=completedLessons.includes(lesson.id);

        const active=lesson.id===lessonId;

        const unlocked=

            index===0 ||

            completedLessons.includes(

                currentModule.lessons[index-1].id

            );

        let className="lesson-sidebar-item";

        if(active){

            className+=" active";

        }

        if(completed){

            className+=" completed";

        }

        if(!unlocked){

            className+=" locked";

        }

        lessonSidebar.innerHTML+=`

        <div

        class="${className}"

        ${unlocked ? `onclick="goLesson(${lesson.id})"` : ""}

        >

            <div class="lesson-sidebar-top">

                <h4>

                    Lesson ${lesson.id}

                </h4>

                ${completed ?

                `<i class="fas fa-circle-check"></i>`

                :

                ""

                }

            </div>

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

    window.location.href=

    `lesson.html?module=${moduleId}&lesson=${id}`;

}

// ======================================================
// PREVIOUS LESSON
// ======================================================

previousLesson.onclick=()=>{

    if(lessonId===1){

        return;

    }

    window.location.href=

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

    const next=lessonId+1;

    const unlocked=

        completedLessons.includes(lessonId);

    if(!unlocked){

        alert(

        "Complete this lesson before continuing."

        );

        return;

    }

    window.location.href=

    `lesson.html?module=${moduleId}&lesson=${next}`;

};

// ======================================================
// UPDATE NAVIGATION
// ======================================================

function updateNavigation(){

    previousLesson.disabled=

    lessonId===1;

    nextLesson.disabled=

    lessonId===currentModule.lessons.length;

}
// ======================================================
// COMPLETE LESSON
// ======================================================

completeLesson.onclick=()=>{

    if(!completedLessons.includes(lessonId)){

        completedLessons.push(lessonId);

    }

    localStorage.setItem(

        `module_${moduleId}_progress`,

        JSON.stringify(completedLessons)

    );

    // -----------------------------
    // MODULE COMPLETED
    // -----------------------------

    if(

        completedLessons.length===

        currentModule.lessons.length

    ){

        const academy=

        JSON.parse(

            localStorage.getItem(

                "gtradesAcademy"

            )

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

        showToast(

            "🎉 Module Completed Successfully!"

        );

    }

    else{

        showToast(

            "✅ Lesson Completed!"

        );

    }

    buildSidebar();

    updateNavigation();

};

// ======================================================
// DOWNLOAD PDF
// ======================================================

downloadPDF.onclick=()=>{

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

            "PDF not uploaded yet."

        );

    }

};

// ======================================================
// TOAST NOTIFICATION
// ======================================================

function showToast(message){

    const toast=document.createElement("div");

    toast.className="academy-toast";

    toast.innerHTML=`

        <i class="fas fa-circle-check"></i>

        <span>${message}</span>

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

// ======================================================
// SAVE LAST LESSON
// ======================================================

localStorage.setItem(

    "lastLesson",

    JSON.stringify({

        module:moduleId,

        lesson:lessonId

    })

);

// ======================================================
// INITIALIZE
// ======================================================

loadLesson();

buildSidebar();

updateNavigation();

// ======================================================
// END OF FILE
// ======================================================