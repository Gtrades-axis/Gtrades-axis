// ============================================================
// GTRADES-AXIS™
// PREMIUM ACCESS GUARD
// PART 1/3
// ============================================================

import { auth, db } from "../firebase.js";

import {
    doc,
    getDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";



// ============================================================
// GLOBAL STATE
// ============================================================

let currentUser = null;

let userProfile = null;

let premiumAccess = false;



// ============================================================
// CONFIGURATION
// ============================================================

const PREMIUM_PAGE =
"../premium.html";


const LOGIN_PAGE =
"../login.html";


const HOME_PAGE =
"../index.html";




// ============================================================
// INITIAL AUTH CHECK
// ============================================================

onAuthStateChanged(
auth,
async(user)=>{


    if(!user){


        redirectLogin();


        return;


    }



    currentUser =
    user;



    await loadUserAccess();



});




// ============================================================
// LOAD USER ACCESS
// ============================================================

async function loadUserAccess(){



    try{


        const userRef =
        doc(
            db,
            "users",
            currentUser.uid
        );



        const userSnap =
        await getDoc(
            userRef
        );



        if(
            !userSnap.exists()
        ){


            redirectLogin();


            return;


        }



        userProfile =
        userSnap.data();



        checkAccess();



        listenUserChanges();



    }
    catch(error){


        console.error(
            "Premium guard error:",
            error
        );


        denyAccess();


    }



}




// ============================================================
// CHECK PREMIUM STATUS
// ============================================================

function checkAccess(){



    if(!userProfile)
        return false;



    premiumAccess = (

        userProfile.role==="admin"

        ||

        userProfile.membership==="premium"

        ||

        userProfile.subscription==="active"

    );



    if(
        !premiumAccess
    ){


        denyAccess();


        return false;


    }



    allowAccess();


    return true;



}




// ============================================================
// ALLOW ACCESS
// ============================================================

function allowAccess(){



    document.body.classList.add(
        "premium-access"
    );



    document.dispatchEvent(
        new CustomEvent(
            "premiumGranted",
            {

                detail:userProfile

            }
        )
    );



    console.log(
        "GTRADES-AXIS™ Premium Access Granted"
    );



}




// ============================================================
// DENY ACCESS
// ============================================================

function denyAccess(){



    document.body.classList.add(
        "premium-denied"
    );



    document.dispatchEvent(
        new CustomEvent(
            "premiumDenied"
        )
    );



    const protectedPage =
    document.body.dataset.premium;



    if(
        protectedPage==="true"
    ){


        showUpgradeMessage();


        setTimeout(()=>{


            window.location.href =
            HOME_PAGE;



        },3000);



    }



}




// ============================================================
// LIVE USER ACCESS LISTENER
// ============================================================

function listenUserChanges(){



    const userRef =
    doc(
        db,
        "users",
        currentUser.uid
    );



    onSnapshot(
        userRef,
        snapshot=>{


            if(
                snapshot.exists()
            ){


                userProfile =
                snapshot.data();



                checkAccess();



            }


        },
        error=>{


            console.error(
                "Premium listener error:",
                error
            );


        }
    );



}




// ============================================================
// PREMIUM BUTTON GUARD
// ============================================================

window.requirePremiumAccess =
function(callback){



    if(
        premiumAccess
    ){


        callback();


    }
    else{


        showUpgradeMessage();



    }



};




// ============================================================
// CHECK FUNCTION
// ============================================================

window.hasPremiumAccess =
function(){



    return premiumAccess;



};




// ============================================================
// USER ACCESS DATA
// ============================================================

window.getPremiumUser =
function(){



    return userProfile;



};




// ============================================================
// END PART 1/3
// ============================================================
// ============================================================
// GTRADES-AXIS™
// PREMIUM ACCESS GUARD
// PART 2/3
// ============================================================


// ============================================================
// UPGRADE MESSAGE
// ============================================================

function showUpgradeMessage(){



    let box =
    document.getElementById(
        "premiumUpgradeMessage"
    );



    if(!box){


        box =
        document.createElement(
            "div"
        );


        box.id =
        "premiumUpgradeMessage";


        box.className =
        "premium-popup";


        document.body.appendChild(
            box
        );


    }



    box.innerHTML = `


    <div class="premium-popup-content">


        <h2>

        Premium Academy Required

        </h2>



        <p>

        This feature is available for
        GTRADES-AXIS™ Premium Members.

        </p>



        <button
        onclick="goToPremium()">

        Upgrade Now

        </button>



    </div>


    `;



    box.classList.add(
        "show"
    );



}




// ============================================================
// PREMIUM PAGE REDIRECT
// ============================================================

window.goToPremium =
function(){



    window.location.href =
    PREMIUM_PAGE;



};




// ============================================================
// PROTECTED LINKS
// ============================================================

function protectPremiumLinks(){



    const links =
    document.querySelectorAll(
        "[data-premium-link]"
    );



    links.forEach(
    link=>{


        link.addEventListener(
            "click",
            event=>{


                if(
                    !premiumAccess
                ){


                    event.preventDefault();


                    showUpgradeMessage();



                }



            }
        );



    });



}




// ============================================================
// RESOURCE ACCESS CONTROL
// ============================================================

window.openPremiumResource =
function(url){



    if(
        premiumAccess
    ){


        window.location.href =
        url;



    }
    else{


        showUpgradeMessage();



    }



};




// ============================================================
// VIDEO ACCESS CONTROL
// ============================================================

window.playPremiumVideo =
function(videoId){



    if(
        !premiumAccess
    ){


        showUpgradeMessage();


        return;


    }



    const video =
    document.getElementById(
        videoId
    );



    if(video){


        video.play();



    }



};




// ============================================================
// DOWNLOAD PROTECTION
// ============================================================

window.downloadPremiumFile =
function(file){



    if(
        premiumAccess
    ){


        const link =
        document.createElement(
            "a"
        );


        link.href =
        file;


        link.download =
        "";


        link.click();



    }
    else{


        showUpgradeMessage();



    }



};




// ============================================================
// HIDE PREMIUM ELEMENTS
// ============================================================

function hideRestrictedContent(){



    if(
        premiumAccess
    )
        return;



    const restricted =
    document.querySelectorAll(
        ".premium-only"
    );



    restricted.forEach(
    element=>{


        element.style.display =
        "none";



    });



}




// ============================================================
// SHOW PREMIUM ELEMENTS
// ============================================================

function showPremiumContent(){



    if(
        !premiumAccess
    )
        return;



    const elements =
    document.querySelectorAll(
        ".premium-only"
    );



    elements.forEach(
    element=>{


        element.style.display =
        "block";



    });



}




// ============================================================
// MEMBERSHIP BADGE
// ============================================================

function updatePremiumBadge(){



    const badge =
    document.getElementById(
        "premiumBadge"
    );



    if(!badge)
        return;



    if(
        premiumAccess
    ){


        badge.innerHTML = `

        <span>

        PREMIUM MEMBER

        </span>

        `;


    }
    else{


        badge.innerHTML = `

        <span>

        FREE MEMBER

        </span>

        `;


    }



}




// ============================================================
// ACCESS UI REFRESH
// ============================================================

function refreshPremiumUI(){



    updatePremiumBadge();


    hideRestrictedContent();


    showPremiumContent();


    protectPremiumLinks();



}




// ============================================================
// PAGE READY
// ============================================================

window.addEventListener(
"load",
()=>{


    setTimeout(
        refreshPremiumUI,
        1500
    );


});




// ============================================================
// PREMIUM STATUS API
// ============================================================

window.GTRADES_PREMIUM = {


    status(){

        return premiumAccess;

    },


    user(){

        return userProfile;

    },


    refresh(){

        checkAccess();

    }


};




// ============================================================
// END PART 2/3
// ============================================================
// ============================================================
// GTRADES-AXIS™
// PREMIUM ACCESS GUARD
// PART 3/3
// ============================================================


// ============================================================
// ERROR HANDLING
// ============================================================

window.addEventListener(
"error",
(event)=>{


    console.error(
        "Premium Guard Error:",
        event.error
    );


});




// ============================================================
// SAFE CHECK
// ============================================================

function safeCheck(){


    if(
        !currentUser
    ){


        return false;


    }



    if(
        !userProfile
    ){


        return false;


    }



    return true;


}




// ============================================================
// SESSION VALIDATION
// ============================================================

async function validateSession(){



    if(
        !currentUser
    )
        return;



    try{


        const userSnap =
        await getDoc(
            doc(
                db,
                "users",
                currentUser.uid
            )
        );



        if(
            !userSnap.exists()
        ){


            await signOut(auth);


            redirectLogin();



            return;


        }



        userProfile =
        userSnap.data();



        checkAccess();



    }
    catch(error){


        console.error(
            "Session validation failed:",
            error
        );


    }



}




// ============================================================
// AUTOMATIC SECURITY CHECK
// ============================================================

setInterval(
()=>{


    validateSession();



},
300000
);




// ============================================================
// REDIRECT FUNCTIONS
// ============================================================

function redirectLogin(){


    window.location.href =
    LOGIN_PAGE;


}




function redirectHome(){


    window.location.href =
    HOME_PAGE;


}




// ============================================================
// PREMIUM EXPIRY CHECK
// ============================================================

function checkSubscriptionExpiry(){



    if(
        !userProfile
    )
        return;



    const expiry =
    userProfile.subscriptionExpiry;



    if(
        !expiry
    )
        return;



    let expiryDate;



    if(
        expiry.seconds
    ){


        expiryDate =
        new Date(
            expiry.seconds*1000
        );


    }
    else{


        expiryDate =
        new Date(
            expiry
        );


    }



    if(
        expiryDate < new Date()
    ){


        premiumAccess =
        false;



        showUpgradeMessage();



    }



}




// ============================================================
// MEMBERSHIP INFORMATION
// ============================================================

window.getMembershipStatus =
function(){



    if(
        !userProfile
    ){


        return {

            status:"unknown"

        };


    }



    return {


        role:
        userProfile.role ||
        "member",



        membership:
        userProfile.membership ||
        "free",



        premium:
        premiumAccess



    };



};




// ============================================================
// LOCK CONTENT MANUALLY
// ============================================================

window.lockPremiumSection =
function(selector){



    const section =
    document.querySelector(
        selector
    );



    if(
        !section
    )
        return;



    if(
        !premiumAccess
    ){


        section.innerHTML = `


        <div class="locked-content">


            <h3>

            Premium Content Locked

            </h3>


            <p>

            Upgrade to access this content.

            </p>


            <button
            onclick="goToPremium()">

            Upgrade

            </button>


        </div>


        `;



    }



};




// ============================================================
// UNLOCK CONTENT
// ============================================================

window.unlockPremiumSection =
function(selector){



    const section =
    document.querySelector(
        selector
    );



    if(
        section &&
        premiumAccess
    ){


        section.style.display =
        "block";


    }



};




// ============================================================
// UI UPDATE LOOP
// ============================================================

let uiTimer;



function startPremiumMonitor(){



    uiTimer =
    setInterval(
    ()=>{


        if(
            safeCheck()
        ){


            checkAccess();


            checkSubscriptionExpiry();


            refreshPremiumUI();



        }



    },
60000
);



}



startPremiumMonitor();




// ============================================================
// CLEANUP
// ============================================================

window.addEventListener(
"beforeunload",
()=>{


    if(uiTimer){


        clearInterval(
            uiTimer
        );


    }


});




// ============================================================
// MOBILE PREMIUM NOTICE
// ============================================================

function mobilePremiumNotice(){



    const width =
    window.innerWidth;



    if(
        width < 768
    ){


        document.body.classList.add(
            "mobile-premium"
        );


    }
    else{


        document.body.classList.remove(
            "mobile-premium"
        );


    }



}



window.addEventListener(
"resize",
mobilePremiumNotice
);



mobilePremiumNotice();




// ============================================================
// KEYBOARD CLOSE POPUP
// ============================================================

document.addEventListener(
"keydown",
(event)=>{


    if(
        event.key==="Escape"
    ){


        const popup =
        document.getElementById(
            "premiumUpgradeMessage"
        );



        if(popup){


            popup.classList.remove(
                "show"
            );


        }



    }



});




// ============================================================
// FINAL INITIALIZATION
// ============================================================

setTimeout(
()=>{


    refreshPremiumUI();


    console.log(
        "================================="
    );


    console.log(
        "GTRADES-AXIS™ PREMIUM GUARD ACTIVE"
    );


    console.log(
        "Premium:",
        premiumAccess
    );


    console.log(
        "================================="
    );



},
2000
);




// ============================================================
// END PREMIUMGUARD.JS
// ============================================================