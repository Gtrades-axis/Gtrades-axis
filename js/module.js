const params =
new URLSearchParams(location.search);

const moduleId =
Number(params.get("module"));

const moduleData =
academyData.find(
m=>m.id===moduleId
);

document.getElementById(
"moduleTitle"
).textContent=
moduleData.title;

document.getElementById(
"moduleDescription"
).textContent=
moduleData.description;

const lessonContainer=
document.getElementById(
"lessonContainer"
);

moduleData.lessons.forEach((lesson,index)=>{

lessonContainer.innerHTML += `

<div class="lesson-card">

    <div>

        <h3>
            Lesson ${lesson.id}
        </h3>

        <p>
            ${lesson.title}
        </p>

    </div>

    <span>
        ${lesson.duration}
    </span>

</div>

`;

});
</div>

`;

});

document.getElementById(
"startModule"
).onclick=()=>{

location.href=

`lesson.html?module=${moduleId}&lesson=1`;

};