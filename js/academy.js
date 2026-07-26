/* ======================================================
   GTRADES-AXIS™ PREMIUM ACADEMY ENGINE
====================================================== */

const Academy={

    modules:academyData,

    storageKey:"gtradesAcademy",

    progress:null

};

/* ======================================================
   DEFAULT SAVE
====================================================== */

Academy.defaultProgress={

    completedModules:0,

    currentModule:1,

    currentLesson:1,

    completedLessons:{},

    bookmarks:[],

    studyTime:0,

    certificates:[]

};

/* ======================================================
   INITIALIZE
====================================================== */

Academy.init=function(){

  Academy.init=function(){

    const saved=

    localStorage.getItem(this.storageKey);

    if(saved){

        this.progress=JSON.parse(saved);

    }else{

        this.progress=

        JSON.parse(

            JSON.stringify(

                this.defaultProgress

            )

        );

    }

    this.progress.completedLessons ||= {};

    this.progress.bookmarks ||= [];

    this.progress.certificates ||= [];

    this.progress.studyTime ||= 0;

    this.progress.completedModules ||= 0;

    this.progress.currentModule ||= 1;

    this.progress.currentLesson ||= 1;

    this.save();

};


/* ======================================================
   SAVE
====================================================== */

Academy.save=function(){

    localStorage.setItem(

        this.storageKey,

        JSON.stringify(

            this.progress

        )

    );

};

/* ======================================================
   MODULES
====================================================== */

Academy.getModules=function(){

    return this.modules;

};

Academy.getModule=function(id){

    return this.modules.find(

        m=>m.id===id

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

    this.getModule(moduleId);

    if(!module) return null;

    return module.lessons.find(

        l=>l.id===lessonId

    );

};

/* ======================================================
   LOCKING
====================================================== */

Academy.moduleLocked=function(id){

    if(id===1){

        return false;

    }

    return id>

    this.progress.completedModules+1;

};

Academy.lessonLocked=function(

    moduleId,

    lessonId

){

    if(lessonId===1){

        return false;

    }

    return !

    this.lessonCompleted(

        moduleId,

        lessonId-1

    );

};

/* ======================================================
   COMPLETED
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

        this.progress.completedLessons[moduleId]

        .length===module.lessons.length

    ){

        this.progress.completedModules=

        Math.max(

            this.progress.completedModules,

            moduleId

        );

    }

    this.progress.currentModule=moduleId;

    this.progress.currentLesson=lessonId;

    this.save();

};

/* ======================================================
   PROGRESS
====================================================== */

Academy.moduleProgress=function(

    moduleId

){

    const module=

    this.getModule(moduleId);

    const completed=

    this.progress.completedLessons[moduleId]||[];

    return Math.round(

        completed.length/

        module.lessons.length*100

    );

};

Academy.overallProgress=function(){

    let total=0;

    let completed=0;

    this.modules.forEach(module=>{

        total+=module.lessons.length;

        completed+=

        (

            this.progress.completedLessons[module.id]||[]

        ).length;

    });

    return Math.round(

        completed/

        total*100

    );

};
/* ======================================================
   CONTINUE LEARNING
====================================================== */

Academy.getContinueLesson=function(){

    return{

        module:this.progress.currentModule,

        lesson:this.progress.currentLesson

    };

};

Academy.setContinueLesson=function(moduleId,lessonId){

    this.progress.currentModule=moduleId;

    this.progress.currentLesson=lessonId;

    this.save();

};

/* ======================================================
   STUDY TIME
====================================================== */

Academy.addStudyTime=function(minutes){

    if(!minutes||minutes<=0){

        return;

    }

    this.progress.studyTime+=minutes;

    this.save();

};

Academy.getStudyTime=function(){

    return this.progress.studyTime;

};

/* ======================================================
   BOOKMARKS
====================================================== */

Academy.addBookmark=function(moduleId,lessonId){

    const exists=this.progress.bookmarks.find(item=>

        item.module===moduleId &&

        item.lesson===lessonId

    );

    if(exists){

        return;

    }

    this.progress.bookmarks.push({

        module:moduleId,

        lesson:lessonId

    });

    this.save();

};

Academy.removeBookmark=function(moduleId,lessonId){

    this.progress.bookmarks=

    this.progress.bookmarks.filter(item=>

        !(

            item.module===moduleId &&

            item.lesson===lessonId

        )

    );

    this.save();

};

Academy.getBookmarks=function(){

    return this.progress.bookmarks;

};

/* ======================================================
   CERTIFICATES
====================================================== */

Academy.awardCertificate=function(moduleId){

    if(

        this.progress.certificates.includes(moduleId)

    ){

        return;

    }

    this.progress.certificates.push(moduleId);

    this.save();

};

Academy.getCertificates=function(){

    return this.progress.certificates;

};

/* ======================================================
   SEARCH MODULES
====================================================== */

Academy.search=function(keyword){

    keyword=keyword.toLowerCase();

    return this.modules.filter(module=>

        module.title.toLowerCase().includes(keyword)

        ||

        module.description.toLowerCase().includes(keyword)

    );

};

/* ======================================================
   STATISTICS
====================================================== */

Academy.statistics=function(){

    const progress=this.progress||{};

    progress.completedLessons ||= {};

    progress.bookmarks ||= [];

    progress.certificates ||= [];

    progress.studyTime ||= 0;

    let totalLessons=0;

    let completedLessons=0;

    this.modules.forEach(module=>{

        totalLessons+=module.lessons.length;

        completedLessons+=

        (progress.completedLessons[module.id]||[]).length;

    });

    return{

        modules:this.modules.length,

        completedModules:progress.completedModules||0,

        totalLessons:totalLessons,

        completedLessons:completedLessons,

        progress:this.overallProgress(),

        studyTime:progress.studyTime,

        bookmarks:progress.bookmarks.length,

        certificates:progress.certificates.length

    };

};

/* ======================================================
   RESET
====================================================== */

Academy.reset=function(){

    this.progress=

    JSON.parse(

        JSON.stringify(

            this.defaultProgress

        )

    );

    this.save();

};

/* ======================================================
   EXPORT
====================================================== */

Academy.export=function(){

    return JSON.stringify(

        this.progress,

        null,

        4

    );

};

/* ======================================================
   IMPORT
====================================================== */

Academy.import=function(data){

    this.progress=

    JSON.parse(data);

    this.save();

};

/* ======================================================
   INITIALIZE
====================================================== */

Academy.init();

window.Academy=Academy;

console.log(

    "✅ GTRADES-AXIS™ Academy Engine Loaded"

);