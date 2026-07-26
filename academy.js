// ======================================================
// GTRADES-AXIS™ PREMIUM ACADEMY
// ACADEMY ENGINE
// PART 1
// ======================================================

"use strict";

/* ======================================================
   STORAGE
====================================================== */

const Academy={

    data:academyData,

    settings:academySettings,

    storageKey:academyStorage.progress,

    progress:null

};

/* ======================================================
   INITIALIZE
====================================================== */

Academy.init=function(){

    this.loadProgress();

    this.validateProgress();

    this.saveProgress();

};

/* ======================================================
   LOAD PROGRESS
====================================================== */

Academy.loadProgress=function(){

    const saved=

    localStorage.getItem(

        this.storageKey

    );

    if(saved){

        this.progress=JSON.parse(saved);

    }

    else{

        this.progress=structuredClone(

            academyDefaultProgress

        );

        this.progress.joinedDate=

        new Date().toISOString();

    }

};

/* ======================================================
   SAVE PROGRESS
====================================================== */

Academy.saveProgress=function(){

    localStorage.setItem(

        this.storageKey,

        JSON.stringify(

            this.progress

        )

    );

};

/* ======================================================
   RESET PROGRESS
====================================================== */

Academy.resetProgress=function(){

    this.progress=

    structuredClone(

        academyDefaultProgress

    );

    this.progress.joinedDate=

    new Date().toISOString();

    this.saveProgress();

};

/* ======================================================
   VALIDATE
====================================================== */

Academy.validateProgress=function(){

    if(!this.progress.completedLessons)

        this.progress.completedLessons=[];

    if(!this.progress.completedModules)

        this.progress.completedModules=[];

    if(!this.progress.completedQuizzes)

        this.progress.completedQuizzes=[];

    if(!this.progress.certificates)

        this.progress.certificates=[];

    if(!this.progress.totalStudyMinutes)

        this.progress.totalStudyMinutes=0;

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
   GET LESSON
====================================================== */

Academy.getLesson=function(

    moduleId,

    lessonId

){

    const module=

    this.getModule(moduleId);

    if(!module) return null;

    return module.lessons.find(

        lesson=>lesson.id===lessonId

    );

};

/* ======================================================
   GET TOTAL MODULES
====================================================== */

Academy.totalModules=function(){

    return this.data.length;

};

/* ======================================================
   GET TOTAL LESSONS
====================================================== */

Academy.totalLessons=function(){

    let total=0;

    this.data.forEach(module=>{

        total+=module.lessons.length;

    });

    return total;

};

/* ======================================================
   INITIALIZE ENGINE
====================================================== */

Academy.init();
/* ======================================================
   COMPLETE LESSON
====================================================== */

Academy.completeLesson=function(

    moduleId,

    lessonId

){

    const key=`${moduleId}-${lessonId}`;

    if(

        !this.progress.completedLessons.includes(key)

    ){

        this.progress.completedLessons.push(key);

    }

    const lesson=this.getLesson(

        moduleId,

        lessonId

    );

    if(lesson){

        lesson.completed=true;

        this.progress.totalStudyMinutes+=

        Number(lesson.duration)||0;

    }

    this.updateOverallProgress();

    this.checkModuleCompletion(moduleId);

    this.saveProgress();

};

/* ======================================================
   LESSON COMPLETED
====================================================== */

Academy.lessonCompleted=function(

    moduleId,

    lessonId

){

    return this.progress.completedLessons.includes(

        `${moduleId}-${lessonId}`

    );

};

/* ======================================================
   COMPLETE MODULE
====================================================== */

Academy.completeModule=function(

    moduleId

){

    if(

        !this.progress.completedModules.includes(moduleId)

    ){

        this.progress.completedModules.push(

            moduleId

        );

    }

    if(

        this.settings.autoUnlockNextModule

    ){

        this.unlockNextModule(moduleId);

    }

    this.saveProgress();

};

/* ======================================================
   MODULE COMPLETED
====================================================== */

Academy.moduleCompleted=function(

    moduleId

){

    return this.progress.completedModules.includes(

        moduleId

    );

};

/* ======================================================
   CHECK MODULE
====================================================== */

Academy.checkModuleCompletion=function(

    moduleId

){

    const module=this.getModule(moduleId);

    if(!module) return;

    const completed=

    module.lessons.every(lesson=>{

        return this.lessonCompleted(

            moduleId,

            lesson.id

        );

    });

    if(completed){

        this.completeModule(moduleId);

    }

};

/* ======================================================
   UNLOCK NEXT MODULE
====================================================== */

Academy.unlockNextModule=function(

    moduleId

){

    const next=this.getModule(

        moduleId+1

    );

    if(next){

        next.locked=false;

    }

};

/* ======================================================
   MODULE LOCKED
====================================================== */

Academy.moduleLocked=function(

    moduleId

){

    const module=this.getModule(

        moduleId

    );

    if(!module) return true;

    return module.locked;

};

/* ======================================================
   LESSON LOCKED
====================================================== */

Academy.lessonLocked=function(

    moduleId,

    lessonId

){

    if(lessonId===1)

        return false;

    return !this.lessonCompleted(

        moduleId,

        lessonId-1

    );

};
/* ======================================================
   OVERALL PROGRESS
====================================================== */

Academy.updateOverallProgress=function(){

    const totalLessons=this.totalLessons();

    const completedLessons=

    this.progress.completedLessons.length;

    this.progress.overallProgress=

    totalLessons===0

    ?0

    :Math.round(

        (completedLessons/totalLessons)*100

    );

};

/* ======================================================
   MODULE PROGRESS
====================================================== */

Academy.getModuleProgress=function(

    moduleId

){

    const module=this.getModule(moduleId);

    if(!module) return 0;

    const completed=

    module.lessons.filter(lesson=>{

        return this.lessonCompleted(

            moduleId,

            lesson.id

        );

    }).length;

    return Math.round(

        (completed/module.lessons.length)*100

    );

};

/* ======================================================
   TOTAL COMPLETED LESSONS
====================================================== */

Academy.completedLessons=function(){

    return this.progress.completedLessons.length;

};

/* ======================================================
   TOTAL COMPLETED MODULES
====================================================== */

Academy.completedModules=function(){

    return this.progress.completedModules.length;

};

/* ======================================================
   CURRENT MODULE
====================================================== */

Academy.currentModule=function(){

    return this.progress.currentModule;

};

/* ======================================================
   SET CURRENT MODULE
====================================================== */

Academy.setCurrentModule=function(

    moduleId

){

    this.progress.currentModule=

    moduleId;

    this.saveProgress();

};

/* ======================================================
   CURRENT LESSON
====================================================== */

Academy.currentLesson=function(){

    return{

        module:this.progress.lastModule,

        lesson:this.progress.lastLesson

    };

};

/* ======================================================
   SET CURRENT LESSON
====================================================== */

Academy.setCurrentLesson=function(

    moduleId,

    lessonId

){

    this.progress.lastModule=

    moduleId;

    this.progress.lastLesson=

    lessonId;

    this.saveProgress();

};

/* ======================================================
   STUDY TIME
====================================================== */

Academy.getStudyTime=function(){

    return this.progress.totalStudyMinutes;

};

/* ======================================================
   ADD STUDY TIME
====================================================== */

Academy.addStudyTime=function(

    minutes

){

    this.progress.totalStudyMinutes+=minutes;

    this.saveProgress();

};

/* ======================================================
   PERCENT COMPLETE
====================================================== */

Academy.percent=function(){

    return this.progress.overallProgress;

};

/* ======================================================
   DASHBOARD STATISTICS
====================================================== */

Academy.statistics=function(){

    return{

        modules:this.totalModules(),

        lessons:this.totalLessons(),

        completedModules:

        this.completedModules(),

        completedLessons:

        this.completedLessons(),

        studyTime:

        this.getStudyTime(),

        progress:

        this.percent()

    };

};
/* ======================================================
   CERTIFICATES
====================================================== */

Academy.awardCertificate=function(moduleId){

    const certificate=academyCertificates.find(

        cert=>cert.module===moduleId

    );

    if(!certificate) return;

    const exists=this.progress.certificates.find(

        cert=>cert.id===certificate.id

    );

    if(exists) return;

    this.progress.certificates.push({

        id:certificate.id,

        title:certificate.title,

        date:new Date().toISOString()

    });

    this.saveProgress();

};

/* ======================================================
   GET CERTIFICATES
====================================================== */

Academy.getCertificates=function(){

    return this.progress.certificates;

};

/* ======================================================
   BOOKMARKS
====================================================== */

Academy.bookmarkLesson=function(

    moduleId,

    lessonId

){

    let bookmarks=JSON.parse(

        localStorage.getItem(

            academyStorage.bookmarks

        )

    ) || [];

    const key=`${moduleId}-${lessonId}`;

    if(!bookmarks.includes(key))

        bookmarks.push(key);

    localStorage.setItem(

        academyStorage.bookmarks,

        JSON.stringify(bookmarks)

    );

};

Academy.getBookmarks=function(){

    return JSON.parse(

        localStorage.getItem(

            academyStorage.bookmarks

        )

    ) || [];

};

/* ======================================================
   LESSON NOTES
====================================================== */

Academy.savePersonalNotes=function(

    moduleId,

    lessonId,

    notes

){

    const key=`${moduleId}-${lessonId}`;

    const saved=

    JSON.parse(

        localStorage.getItem(

            academyStorage.notes

        )

    ) || {};

    saved[key]=notes;

    localStorage.setItem(

        academyStorage.notes,

        JSON.stringify(saved)

    );

};

Academy.getPersonalNotes=function(

    moduleId,

    lessonId

){

    const key=`${moduleId}-${lessonId}`;

    const saved=

    JSON.parse(

        localStorage.getItem(

            academyStorage.notes

        )

    ) || {};

    return saved[key] || "";

};

/* ======================================================
   CLEAR ALL PROGRESS
====================================================== */

Academy.clearAll=function(){

    localStorage.removeItem(

        academyStorage.progress

    );

    localStorage.removeItem(

        academyStorage.bookmarks

    );

    localStorage.removeItem(

        academyStorage.notes

    );

    localStorage.removeItem(

        academyStorage.certificates

    );

    this.resetProgress();

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

        this.validateProgress();

        this.saveProgress();

        return true;

    }

    catch{

        return false;

    }

};

/* ======================================================
   VERSION
====================================================== */

Academy.version=function(){

    return academySettings.version;

};

/* ======================================================
   ENGINE READY
====================================================== */

window.Academy=Academy;

console.log(

    "GTRADES-AXIS™ Academy Engine Loaded",

    Academy.version()

);

/* ======================================================
   END OF FILE
====================================================== */