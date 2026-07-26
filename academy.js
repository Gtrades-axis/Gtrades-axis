// ======================================================
// GTRADES-AXIS™ PREMIUM ACADEMY
// ACADEMY ENGINE
// PART 1
// ======================================================

"use strict";

/* ======================================================
   DEFAULT STORAGE
====================================================== */

const ACADEMY_STORAGE_KEY="gtradesAcademy";

/* ======================================================
   ACADEMY ENGINE
====================================================== */

const Academy={

    data:academyData,

    progress:null,

    initialized:false

};

/* ======================================================
   INITIALIZE
====================================================== */

Academy.init=function(){

    if(this.initialized){

        return;

    }

    const saved=

    JSON.parse(

        localStorage.getItem(

            ACADEMY_STORAGE_KEY

        )

    );

    if(saved){

        this.progress=saved;

    }

    else{

        this.progress={

            completedModules:0,

            currentModule:1,

            completedLessons:{},

            bookmarks:[],

            studyTime:0,

            notes:{}

        };

    }

    this.initialized=true;

    this.save();

};

/* ======================================================
   SAVE
====================================================== */

Academy.save=function(){

    localStorage.setItem(

        ACADEMY_STORAGE_KEY,

        JSON.stringify(

            this.progress

        )

    );

};

/* ======================================================
   RESET
====================================================== */

Academy.reset=function(){

    localStorage.removeItem(

        ACADEMY_STORAGE_KEY

    );

    this.initialized=false;

    this.init();

};

/* ======================================================
   MODULES
====================================================== */

Academy.getModules=function(){

    return this.data;

};

Academy.getModule=function(id){

    return this.data.find(

        module=>module.id===id

    );

};

/* ======================================================
   LESSONS
====================================================== */

Academy.getLesson=function(

    moduleId,

    lessonId

){

    const module=

    this.getModule(

        moduleId

    );

    if(!module){

        return null;

    }

    return module.lessons.find(

        lesson=>lesson.id===lessonId

    );

};
/* ======================================================
   CURRENT MODULE
====================================================== */

Academy.getCurrentModule=function(){

    return this.progress.currentModule;

};

Academy.setCurrentModule=function(moduleId){

    this.progress.currentModule=moduleId;

    this.save();

};

/* ======================================================
   CURRENT LESSON
====================================================== */

Academy.setCurrentLesson=function(

    moduleId,

    lessonId

){

    this.progress.currentLesson={

        module:moduleId,

        lesson:lessonId

    };

    this.save();

};

Academy.getCurrentLesson=function(){

    return this.progress.currentLesson||

    {

        module:1,

        lesson:1

    };

};

/* ======================================================
   LESSON PROGRESS
====================================================== */

Academy.completeLesson=function(

    moduleId,

    lessonId

){

    if(

        !this.progress.completedLessons[moduleId]

    ){

        this.progress.completedLessons[moduleId]=[];

    }

    if(

        !this.progress.completedLessons[moduleId]

        .includes(lessonId)

    ){

        this.progress.completedLessons[moduleId]

        .push(lessonId);

    }

    this.save();

    this.checkModuleCompletion(

        moduleId

    );

};

Academy.lessonCompleted=function(

    moduleId,

    lessonId

){

    if(

        !this.progress.completedLessons[moduleId]

    ){

        return false;

    }

    return this.progress.completedLessons[moduleId]

    .includes(lessonId);

};

/* ======================================================
   MODULE COMPLETION
====================================================== */

Academy.moduleCompleted=function(

    moduleId

){

    const module=

    this.getModule(moduleId);

    if(!module){

        return false;

    }

    const completed=

    this.progress.completedLessons[moduleId]||[];

    return completed.length===

    module.lessons.length;

};

Academy.checkModuleCompletion=function(

    moduleId

){

    if(

        !this.moduleCompleted(moduleId)

    ){

        return;

    }

    if(

        moduleId>

        this.progress.completedModules

    ){

        this.progress.completedModules=

        moduleId;

    }

    if(

        this.progress.currentModule<=moduleId

    ){

        this.progress.currentModule=

        Math.min(

            moduleId+1,

            this.data.length

        );

    }

    this.save();

};
/* ======================================================
   MODULE PROGRESS
====================================================== */

Academy.getModuleProgress=function(moduleId){

    const module=this.getModule(moduleId);

    if(!module){

        return 0;

    }

    const completed=

    this.progress.completedLessons[moduleId]||[];

    return Math.round(

        (completed.length/module.lessons.length)*100

    );

};

Academy.getCompletedLessonCount=function(moduleId){

    return (

        this.progress.completedLessons[moduleId]||[]

    ).length;

};

/* ======================================================
   MODULE LOCK STATUS
====================================================== */

Academy.moduleUnlocked=function(moduleId){

    if(moduleId===1){

        return true;

    }

    return this.progress.completedModules>=moduleId-1;

};

/* ======================================================
   LESSON LOCK STATUS
====================================================== */

Academy.lessonUnlocked=function(

    moduleId,

    lessonId

){

    if(lessonId===1){

        return true;

    }

    return this.lessonCompleted(

        moduleId,

        lessonId-1

    );

};

/* ======================================================
   NEXT LESSON
====================================================== */

Academy.getNextLesson=function(

    moduleId,

    lessonId

){

    const module=

    this.getModule(moduleId);

    if(!module){

        return null;

    }

    if(lessonId<module.lessons.length){

        return{

            module:moduleId,

            lesson:lessonId+1

        };

    }

    if(moduleId<this.data.length){

        return{

            module:moduleId+1,

            lesson:1

        };

    }

    return null;

};

/* ======================================================
   PREVIOUS LESSON
====================================================== */

Academy.getPreviousLesson=function(

    moduleId,

    lessonId

){

    if(lessonId>1){

        return{

            module:moduleId,

            lesson:lessonId-1

        };

    }

    if(moduleId>1){

        const previous=

        this.getModule(moduleId-1);

        return{

            module:moduleId-1,

            lesson:previous.lessons.length

        };

    }

    return null;

};
/* ======================================================
   BOOKMARKS
====================================================== */

Academy.bookmarkLesson=function(

    moduleId,

    lessonId

){

    if(!this.progress.bookmarks){

        this.progress.bookmarks=[];

    }

    const exists=

    this.progress.bookmarks.find(

        item=>

        item.module===moduleId &&

        item.lesson===lessonId

    );

    if(!exists){

        this.progress.bookmarks.push({

            module:moduleId,

            lesson:lessonId

        });

        this.save();

    }

};

Academy.removeBookmark=function(

    moduleId,

    lessonId

){

    if(!this.progress.bookmarks){

        return;

    }

    this.progress.bookmarks=

    this.progress.bookmarks.filter(

        item=>

        !(

            item.module===moduleId &&

            item.lesson===lessonId

        )

    );

    this.save();

};

Academy.getBookmarks=function(){

    return this.progress.bookmarks||[];

};

/* ======================================================
   PERSONAL NOTES
====================================================== */

Academy.savePersonalNotes=function(

    moduleId,

    lessonId,

    notes

){

    if(!this.progress.notes){

        this.progress.notes={};

    }

    const key=

    `${moduleId}_${lessonId}`;

    this.progress.notes[key]=notes;

    this.save();

};

Academy.getPersonalNotes=function(

    moduleId,

    lessonId

){

    if(!this.progress.notes){

        return "";

    }

    const key=

    `${moduleId}_${lessonId}`;

    return this.progress.notes[key]||"";

};

/* ======================================================
   STUDY TIME
====================================================== */

Academy.addStudyTime=function(

    minutes

){

    if(!minutes || minutes<1){

        return;

    }

    this.progress.studyTime+=minutes;

    this.save();

};

Academy.getStudyTime=function(){

    return this.progress.studyTime||0;

};

/* ======================================================
   STATISTICS
====================================================== */

Academy.getStatistics=function(){

    let completedLessons=0;

    Object.values(

        this.progress.completedLessons

    ).forEach(list=>{

        completedLessons+=list.length;

    });

    return{

        modulesCompleted:

        this.progress.completedModules,

        lessonsCompleted:

        completedLessons,

        studyTime:

        this.progress.studyTime,

        bookmarks:

        this.getBookmarks().length

    };

};
/* ======================================================
   OVERALL PROGRESS
====================================================== */

Academy.getOverallProgress=function(){

    let totalLessons=0;

    let completedLessons=0;

    this.data.forEach(module=>{

        totalLessons+=module.lessons.length;

        completedLessons+=

        this.getCompletedLessonCount(module.id);

    });

    if(totalLessons===0){

        return 0;

    }

    return Math.round(

        (completedLessons/totalLessons)*100

    );

};

/* ======================================================
   SEARCH MODULES
====================================================== */

Academy.searchModules=function(keyword){

    keyword=keyword.toLowerCase();

    return this.data.filter(module=>{

        return(

            module.title

            .toLowerCase()

            .includes(keyword)

            ||

            module.description

            .toLowerCase()

            .includes(keyword)

        );

    });

};

/* ======================================================
   EXPORT PROGRESS
====================================================== */

Academy.exportProgress=function(){

    return JSON.stringify(

        this.progress,

        null,

        4

    );

};

/* ======================================================
   IMPORT PROGRESS
====================================================== */

Academy.importProgress=function(json){

    try{

        this.progress=

        JSON.parse(json);

        this.save();

        return true;

    }

    catch(error){

        console.error(error);

        return false;

    }

};

/* ======================================================
   CLEAR PROGRESS
====================================================== */

Academy.clearProgress=function(){

    if(

        !confirm(

        "Reset all Academy progress?"

        )

    ){

        return;

    }

    localStorage.removeItem(

        ACADEMY_STORAGE_KEY

    );

    this.initialized=false;

    this.init();

    location.reload();

};

/* ======================================================
   READY
====================================================== */

window.Academy=Academy;

Academy.init();

console.log(

    "✅ GTRADES-AXIS™ Academy Engine Loaded"

);

/* ======================================================
   END OF FILE
====================================================== */