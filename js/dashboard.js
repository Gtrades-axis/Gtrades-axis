// ============================================================
// GTRADES-AXIS™
// USER DASHBOARD – FINAL FIXED VERSION
// ============================================================


import { auth, db } from "../firebase.js";

import {
    doc,
    getDoc,
    onSnapshot,
    collection,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";



// ============================================================
// DOM REFERENCES
// ============================================================

const userNameEl = document.getElementById("userName");
const memberBadgeEl = document.getElementById("membershipBadge");

const resourceCountEl = document.getElementById("resourceCount");
const lessonCountEl = document.getElementById("lessonCount");
const videoCountEl = document.getElementById("videoCount");

const latestResourcesEl = document.getElementById("latestResources");



// ============================================================
// GLOBAL STATE
// ============================================================

let currentUser = null;
let userData = {};

let listenersStarted = false;



// ============================================================
// AUTH CHECK
// ============================================================

onAuthStateChanged(auth, async (user)=>{


    if(!user){

        window.location.href = "/login";
        return;

    }



    try{


        const userRef = doc(
            db,
            "users",
            user.uid
        );


        const snap = await getDoc(userRef);



        if(!snap.exists()){


            console.error(
                "User profile missing"
            );


            await signOut(auth);

            window.location.href =
                "/login";

            return;

        }



        currentUser = user;


        userData = {

            id:user.uid,

            ...snap.data()

        };



        initializeDashboard();



    }catch(error){

        console.error(
            "Authentication error:",
            error
        );

    }


});





// ============================================================
// INITIALIZE DASHBOARD
// ============================================================


function initializeDashboard(){


    displayUserInfo();



    if(!listenersStarted){


        listenStats();


        listenLatestResources();


        listenersStarted = true;


    }


}







// ============================================================
// USER DISPLAY
// ============================================================


function displayUserInfo(){



    if(userNameEl){


        userNameEl.textContent =
            userData.name ||
            userData.username ||
            "Trader";


    }





    if(memberBadgeEl){



        const membership =
            userData.membership ||
            "member";



        if(membership==="premium"){


            memberBadgeEl.textContent =
                "⭐ Premium Member";


            memberBadgeEl.style.background =
                "#fbbf24";


            memberBadgeEl.style.color =
                "#1f2937";



        }else{


            memberBadgeEl.textContent =
                "Member";


            memberBadgeEl.style.background =
                "#6b7280";


            memberBadgeEl.style.color =
                "#ffffff";


        }


    }



}








// ============================================================
// REAL TIME COUNTS
// ============================================================


function listenStats(){



    // ===============================
    // RESOURCES
    // ===============================


    const resourcesRef =
        collection(
            db,
            "resources"
        );



    onSnapshot(
        resourcesRef,


        (snapshot)=>{


            if(resourceCountEl){

                resourceCountEl.textContent =
                    snapshot.size;

            }


        },


        (error)=>{


            console.error(
                "Resources count error:",
                error
            );


            if(resourceCountEl)
                resourceCountEl.textContent="0";


        }

    );





    // ===============================
    // LESSONS
    // ===============================


    const lessonsRef =
        collection(
            db,
            "academy_modules"
        );



    onSnapshot(
        lessonsRef,


        (snapshot)=>{


            if(lessonCountEl){

                lessonCountEl.textContent =
                    snapshot.size;

            }


        },


        (error)=>{


            console.error(
                "Lessons count error:",
                error
            );


            if(lessonCountEl)
                lessonCountEl.textContent="0";


        }

    );






    // ===============================
    // VIDEOS
    // ===============================


    const videosRef =
        collection(
            db,
            "videos"
        );



    onSnapshot(
        videosRef,


        (snapshot)=>{


            if(videoCountEl){

                videoCountEl.textContent =
                    snapshot.size;

            }


        },


        (error)=>{


            console.error(
                "Videos count error:",
                error
            );


            if(videoCountEl)
                videoCountEl.textContent="0";


        }


    );



}









// ============================================================
// LATEST RESOURCES
// ============================================================


function listenLatestResources(){



    if(!latestResourcesEl)
        return;




    const resourcesQuery =
        query(

            collection(
                db,
                "resources"
            ),

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(3)

        );





    onSnapshot(

        resourcesQuery,


        (snapshot)=>{


            latestResourcesEl.innerHTML="";



            if(snapshot.empty){


                latestResourcesEl.innerHTML = `

                <div class="empty-state">

                No resources available

                </div>

                `;


                return;


            }





            snapshot.forEach((resource)=>{


                const data =
                    resource.data();



                const item =
                    document.createElement(
                        "div"
                    );



                item.className =
                    "resource-item";



                item.innerHTML = `


                <h4>

                ${data.title || "Untitled"}

                </h4>


                <p>

                ${data.description || ""}

                </p>


                <a href="${
                    data.fileUrl || "#"
                }" target="_blank">

                View →

                </a>


                `;



                latestResourcesEl.appendChild(
                    item
                );



            });



        },



        (error)=>{


            console.error(
                "Latest resources error:",
                error
            );


            latestResourcesEl.innerHTML = `

            <div class="error-state">

            Failed to load resources

            </div>

            `;


        }


    );



}








// ============================================================
// LOGOUT
// ============================================================


document.addEventListener(
"click",
async(e)=>{


    const btn =
        e.target.closest(
            "#logoutBtn"
        );


    if(!btn)
        return;



    e.preventDefault();



    try{


        await signOut(auth);



        window.location.href =
            "/login";



    }catch(error){


        console.error(
            "Logout failed:",
            error
        );


        showToast(
            "❌ Logout failed"
        );


    }



});







// ============================================================
// TOAST
// ============================================================


function showToast(message){



    const old =
        document.getElementById(
            "gtToast"
        );



    if(old)
        old.remove();





    const toast =
        document.createElement(
            "div"
        );



    toast.id =
        "gtToast";



    toast.style.cssText = `

        position:fixed;
        bottom:20px;
        left:50%;
        transform:translateX(-50%);
        background:#1f2937;
        color:white;
        padding:12px 24px;
        border-radius:8px;
        font-weight:500;
        z-index:9999;

    `;



    toast.textContent =
        message;



    document.body.appendChild(
        toast
    );



    setTimeout(
        ()=>toast.remove(),
        3000
    );


}







// ============================================================
// MANUAL REFRESH
// ============================================================


window.refreshDashboard =
function(){


    displayUserInfo();


};
