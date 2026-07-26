/* ======================================================
   GTRADES-AXIS™ PREMIUM ACADEMY ENGINE
====================================================== */

// ======================================================
// STORAGE
// ======================================================

const ACADEMY_STORAGE_KEY="gtradesAcademy";

// ======================================================
// DEFAULT PROGRESS
// ======================================================

const DEFAULT_PROGRESS={

    completedModules:0,

    completedLessons:{},

    bookmarks:[],

    notes:{},

    quizzes:{},

    certificates:[],

    studyTime:0,

    currentModule:1,

    currentLesson:1

};

// ======================================================
// MAIN OBJECT
// ======================================================

const Academy={

    data:academyData,

    progress:null,

    initialized:false

};

// ======================================================
// INITIALIZE
// ======================================================

Academy.init=function(){

    if(this.initialized){

        return;

    }

    const saved=

    localStorage.getItem(

        ACADEMY_STORAGE_KEY

    );

    if(saved){

        try{

            this.progress=

            JSON.parse(saved);

        }

        catch(e){

            this.progress=

            structuredClone(

                DEFAULT_PROGRESS

            );

        }

    }else{

        this.progress=

        structuredClone(

            DEFAULT_PROGRESS

        );

    }

    // Safety checks for old saves

    this.progress.completedLessons ||= {};

    this.progress.bookmarks ||= [];

    this.progress.notes ||= {};

    this.progress.quizzes ||= {};

    this.progress.certificates ||= [];

    this.progress.studyTime ||= 0;

    this.progress.completedModules ||= 0;

    this.progress.currentModule ||= 1;

    this.progress.currentLesson ||= 1;

    this.initialized=true;

};
/* ======================================================
   SAVE PROGRESS
====================================================== */

Academy.save=function(){

    localStorage.setItem(

        ACADEMY_STORAGE_KEY,

        JSON.stringify(this.progress)

    );

};

/* ======================================================
   GET ALL MODULES
====================================================== */

Academy.getModules=function(){

    return this.data;

};

/* ======================================================
   GET MODULE
====================================================== */

Academy.getModule=function(id){

    return this.data.find(

        module=>module.id===id

    );

};

/* ======================================================
   IS MODULE LOCKED
====================================================== */

Academy.moduleLocked=function(id){

    if(id===1){

        return false;

    }

    return id>

    (this.progress.completedModules+1);

};

/* ======================================================
   IS MODULE UNLOCKED
====================================================== */

Academy.moduleUnlocked=function(id){

    return !this.moduleLocked(id);

};

/* ======================================================
   GET CURRENT MODULE
====================================================== */

Academy.getCurrentModule=function(){

    return this.getModule(

        this.progress.currentModule

    );

};

/* ======================================================
   GET CURRENT LESSON
====================================================== */

Academy.getCurrentLesson=function(){

    return this.progress.currentLesson;

};

/* ======================================================
   SET CURRENT LESSON
====================================================== */

Academy.setCurrentLesson=function(

    moduleId,

    lessonId

){

    this.progress.currentModule=

    moduleId;

    this.progress.currentLesson=

    lessonId;

    this.save();

};
/* ======================================================
   GET LESSON
====================================================== */

Academy.getLesson=function(

    moduleId,

    lessonId

){

    const module=

    this.getModule(moduleId);

    if(!module){

        return null;

    }

    return module.lessons.find(

        lesson=>lesson.id===lessonId

    );

};

/* ======================================================
   LESSON COMPLETED
====================================================== */

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
   LESSON LOCKED
====================================================== */

Academy.lessonLocked=function(

    moduleId,

    lessonId

){

    if(lessonId===1){

        return false;

    }

    return !this.lessonCompleted(

        moduleId,

        lessonId-1

    );

};

/* ======================================================
   COMPLETE LESSON
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

    const module=

    this.getModule(moduleId);

    if(

        module &&

        this.progress.completedLessons[moduleId].length===

        module.lessons.length

    ){

        this.progress.completedModules=

        Math.max(

            this.progress.completedModules,

            moduleId

        );

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

Academy.getModuleProgress=function(

    moduleId

){

    const module=

    this.getModule(moduleId);

    if(!module){

        return 0;

    }

    const completed=

    this.progress.completedLessons[moduleId]||[];

    return Math.round(

        (completed.length/

        module.lessons.length)*100

    );

};
/* ======================================================
   COMPLETED LESSON COUNT
====================================================== */

Academy.getCompletedLessonCount=function(moduleId){

    return (

        this.progress.completedLessons[moduleId]||[]

    ).length;

};

/* ======================================================
   MODULE COMPLETED
====================================================== */

Academy.moduleCompleted=function(moduleId){

    const module=this.getModule(moduleId);

    if(!module){

        return false;

    }

    return this.getCompletedLessonCount(moduleId)===

    module.lessons.length;

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
   STUDY TIME
====================================================== */

Academy.addStudyTime=function(minutes){

    if(!minutes||minutes<1){

        return;

    }

    this.progress.studyTime+=minutes;

    this.save();

};

Academy.getStudyTime=function(){

    return this.progress.studyTime||0;

};

/* ======================================================
   BOOKMARKS
====================================================== */

Academy.getBookmarks=function(){

    return this.progress.bookmarks||[];

};

Academy.bookmarkLesson=function(moduleId,lessonId){

    if(!this.progress.bookmarks){

        this.progress.bookmarks=[];

    }

    const exists=this.progress.bookmarks.find(item=>

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

/* ======================================================
   PERSONAL NOTES
====================================================== */

Academy.savePersonalNotes=function(

    moduleId,

    lessonId,

    notes

){

    const key=`${moduleId}_${lessonId}`;

    this.progress.notes[key]=notes;

    this.save();

};

Academy.getPersonalNotes=function(

    moduleId,

    lessonId

){

    const key=`${moduleId}_${lessonId}`;

    return this.progress.notes[key]||"";

};

/* ======================================================
   INITIALIZE ENGINE
====================================================== */

window.Academy=Academy;

Academy.init();

console.log(

    "✅ GTRADES-AXIS™ Academy Engine Ready"

);