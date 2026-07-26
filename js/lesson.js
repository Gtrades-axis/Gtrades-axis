/* ======================================================
   GTRADES-AXIS™ PREMIUM ACADEMY
   LESSON PLAYER
====================================================== */

const params = new URLSearchParams(window.location.search);

const moduleId = parseInt(params.get("module")) || 1;

const lessonId = parseInt(params.get("lesson")) || 1;

Academy.init();

/* ======================================================
   DATA
====================================================== */

const currentModule = Academy.getModule(moduleId);

const currentLesson = Academy.getLesson(moduleId, lessonId);

/* ======================================================
   HTML
====================================================== */

const moduleName=document.getElementById("moduleName");

const lessonSidebar=document.getElementById("lessonSidebar");

const lessonNumber=document.getElementById("lessonNumber");

const lessonTitle=document.getElementById("lessonTitle");

const lessonDescription=document.getElementById("lessonDescription");

const lessonVideo=document.getElementById("lessonVideo");

const lessonNotes=document.getElementById("lessonNotes");

const downloadPDF=document.getElementById("downloadPDF");

const previousLesson=document.getElementById("previousLesson");

const nextLesson=document.getElementById("nextLesson");

const completeLesson=document.getElementById("completeLesson");

/* ======================================================
   LOAD LESSON
====================================================== */

function loadLesson(){

    if(!currentModule || !currentLesson){

        alert("Lesson not found.");

        return;

    }

    Academy.setContinueLesson(

        moduleId,

        lessonId

    );

    moduleName.textContent=currentModule.title;

    lessonNumber.textContent="Lesson "+lessonId;

    lessonTitle.textContent=currentLesson.title;

    lessonDescription.textContent=

        currentModule.description;

    lessonNotes.innerHTML=

        currentLesson.notes ||

        "<p>No lesson notes available.</p>";

    if(currentLesson.video){

        lessonVideo.src=currentLesson.video;

    }else{

        lessonVideo.removeAttribute("src");

    }

    if(currentLesson.pdf){

        downloadPDF.style.display="inline-flex";

    }else{

        downloadPDF.style.display="none";

    }

}

/* ======================================================
   SIDEBAR
====================================================== */

function buildSidebar(){

    lessonSidebar.innerHTML="";

    currentModule.lessons.forEach(lesson=>{

        const item=document.createElement("div");

        item.className="lesson-sidebar-item";

        if(lesson.id===lessonId){

            item.classList.add("active");

        }

        if(

            Academy.lessonCompleted(

                moduleId,

                lesson.id

            )

        ){

            item.classList.add("completed");

        }

        item.innerHTML=`

            <h4>Lesson ${lesson.id}</h4>

            <p>${lesson.title}</p>

        `;

        if(

            !Academy.lessonLocked(

                moduleId,

                lesson.id

            )

        ){

            item.onclick=()=>{

                location.href=

                "lesson.html?module="+

                moduleId+

                "&lesson="+

                lesson.id;

            };

        }

        lessonSidebar.appendChild(item);

    });

}

/* ======================================================
   PREVIOUS
====================================================== */

previousLesson.onclick=function(){

    if(lessonId===1){

        return;

    }

    location.href=

    "lesson.html?module="+

    moduleId+

    "&lesson="+

    (lessonId-1);

};

/* ======================================================
   NEXT
====================================================== */

nextLesson.onclick=function(){

    if(

        lessonId===

        currentModule.lessons.length

    ){

        location.href=

        "module.html?module="+

        Math.min(

            moduleId+1,

            Academy.getModules().length

        );

        return;

    }

    location.href=

    "lesson.html?module="+

    moduleId+

    "&lesson="+

    (lessonId+1);

};

/* ======================================================
   COMPLETE
====================================================== */

completeLesson.onclick=function(){

    Academy.completeLesson(

        moduleId,

        lessonId

    );

    alert(

        "Lesson Completed Successfully!"

    );

    buildSidebar();

};

/* ======================================================
   PDF
====================================================== */

downloadPDF.onclick=function(){

    if(currentLesson.pdf){

        window.open(

            currentLesson.pdf,

            "_blank"

        );

    }

};

/* ======================================================
   BUTTONS
====================================================== */

previousLesson.disabled=

lessonId===1;

nextLesson.disabled=false;

/* ======================================================
   START
====================================================== */

loadLesson();

buildSidebar();

console.log(

"✅ Lesson Loaded"

);