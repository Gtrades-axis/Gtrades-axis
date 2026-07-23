const params =
new URLSearchParams(window.location.search);

const moduleId =
Number(params.get("module")) || 1;

const module =
academyData.find(
m=>m.id===moduleId
);

document.getElementById(
"moduleTitle"
).innerHTML=module.title;

const list=
document.getElementById(
"lessonList"
);

module.lessons.forEach((lesson)=>{

list.innerHTML += `

<div class="lesson-item"

onclick="openLesson(${lesson.id})">

${lesson.id}. ${lesson.title}

</div>

`;

});
list.innerHTML+=`

<div class="lesson-item"

onclick="openLesson(${index})">

${index+1}. ${lesson}

</div>

`;


function openLesson(id){

const lesson = module.lessons.find(l => l.id === id);

document.getElementById("lessonTitle").textContent = lesson.title;

// Video, notes and PDF will be loaded here later.

}