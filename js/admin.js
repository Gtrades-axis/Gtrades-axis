// ============================================================
// GTRADES-AXIS™
// ADMIN DASHBOARD
// PART 1/3
// ============================================================

import { auth, db } from "../firebase.js";

import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let currentAdmin = null;

let dashboardData = {

    users: [],
    payments: [],
    activities: []

};



// ============================================================
// DOM ELEMENTS
// ============================================================

const adminName =
document.getElementById("adminName");


const totalUsers =
document.getElementById("totalUsers");


const premiumUsers =
document.getElementById("premiumUsers");


const pendingUsers =
document.getElementById("pendingUsers");


const totalPayments =
document.getElementById("totalPayments");


const activityContainer =
document.getElementById("activityContainer");


// ============================================================
// AUTH CHECK
// ============================================================

onAuthStateChanged(
auth,
async(user)=>{


    if(!user){


        window.location.href =
        "../login.html";


        return;


    }



    try{


        const userRef =
        doc(
            db,
            "users",
            user.uid
        );



        const userSnap =
        await getDoc(
            userRef
        );



        if(
            !userSnap.exists()
        ){


            await signOut(auth);


            window.location.href =
            "../login.html";


            return;


        }



        const data =
        userSnap.data();



        if(
            data.role !== "admin"
        ){


            await signOut(auth);


            window.location.href =
            "../index.html";


            return;


        }



        currentAdmin =
        {

            id:user.uid,

            ...data

        };



        loadAdminDashboard();



    }
    catch(error){


        console.error(
            "Admin auth error:",
            error
        );


    }


});




// ============================================================
// LOAD DASHBOARD
// ============================================================

function loadAdminDashboard(){



    loadUsers();


    loadPayments();


    loadActivities();


    displayAdminInfo();


}




// ============================================================
// DISPLAY ADMIN INFO
// ============================================================

function displayAdminInfo(){


    if(adminName){


        adminName.textContent =
        currentAdmin.name ||
        currentAdmin.email ||
        "Administrator";


    }


}




// ============================================================
// USERS REALTIME
// ============================================================

function loadUsers(){



    const usersRef =
    collection(
        db,
        "users"
    );



    onSnapshot(
        usersRef,
        snapshot=>{


            dashboardData.users=[];



            snapshot.forEach(
                item=>{


                    dashboardData.users.push({

                        id:item.id,

                        ...item.data()

                    });


                }
            );



            updateUserStatistics();


        },
        error=>{


            console.error(
                "Users loading error:",
                error
            );


        }
    );


}




// ============================================================
// USER STATISTICS
// ============================================================

function updateUserStatistics(){



    const users =
    dashboardData.users;



    const total =
    users.length;



    const premium =
    users.filter(
        user=>
        user.membership==="premium"
    )
    .length;



    const pending =
    users.filter(
        user=>
        !user.active ||
        user.status==="pending"
    )
    .length;



    if(totalUsers)

        totalUsers.textContent =
        total;



    if(premiumUsers)

        premiumUsers.textContent =
        premium;



    if(pendingUsers)

        pendingUsers.textContent =
        pending;



}




// ============================================================
// PAYMENTS REALTIME
// ============================================================

function loadPayments(){



    const paymentsRef =
    collection(
        db,
        "payments"
    );



    onSnapshot(
        paymentsRef,
        snapshot=>{


            dashboardData.payments=[];



            snapshot.forEach(
                item=>{


                    dashboardData.payments.push({

                        id:item.id,

                        ...item.data()

                    });


                }
            );



            updatePaymentStatistics();



        },
        error=>{


            console.log(
                "Payments collection unavailable",
                error
            );


        }
    );



}




// ============================================================
// PAYMENT STATISTICS
// ============================================================

function updatePaymentStatistics(){



    if(!totalPayments)
        return;



    totalPayments.textContent =
    dashboardData.payments.length;



}




// ============================================================
// RECENT ACTIVITIES
// ============================================================

function loadActivities(){



    try{


        const activityQuery =
        query(

            collection(
                db,
                "activities"
            ),

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(10)

        );



        onSnapshot(
            activityQuery,
            snapshot=>{


                dashboardData.activities=[];



                snapshot.forEach(
                    item=>{


                        dashboardData.activities.push({

                            id:item.id,

                            ...item.data()

                        });


                    }
                );



                renderActivities();



            }
        );



    }
    catch(error){


        console.error(
            "Activity error:",
            error
        );


    }



}




// ============================================================
// RENDER ACTIVITIES
// ============================================================

function renderActivities(){



    if(!activityContainer)
        return;



    activityContainer.innerHTML="";



    if(
        dashboardData.activities.length===0
    ){


        activityContainer.innerHTML = `

        <div class="empty-state">

            No recent activity

        </div>

        `;


        return;


    }



    dashboardData.activities
    .forEach(activity=>{


        const item =
        document.createElement(
            "div"
        );



        item.className =
        "activity-item";



        item.innerHTML = `

            <h4>

            ${activity.title || "Activity"}

            </h4>


            <p>

            ${activity.message || ""}

            </p>

        `;



        activityContainer.appendChild(
            item
        );



    });



}



// ============================================================
// END PART 1/3
// ============================================================
// ============================================================
// GTRADES-AXIS™
// ADMIN DASHBOARD
// PART 2/3
// ============================================================


// ============================================================
// QUICK ACTIONS
// ============================================================

window.openMembers =
function(){

    window.location.href =
    "admin-members.html";

};



window.openPayments =
function(){

    window.location.href =
    "admin-payments.html";

};



window.openAcademy =
function(){

    window.location.href =
    "admin-academy.html";

};



// ============================================================
// ADMIN LOGOUT
// ============================================================

window.logoutAdmin =
async function(){


    try{


        await signOut(auth);



        window.location.href =
        "../login.html";


    }
    catch(error){


        console.error(
            "Logout error:",
            error
        );


    }


};




// ============================================================
// SEARCH USERS
// ============================================================

window.searchAdminUsers =
function(value){



    const search =
    value.toLowerCase();



    const results =
    dashboardData.users.filter(
        user=>{


            return (

                user.name
                ?.toLowerCase()
                .includes(search)


                ||

                user.email
                ?.toLowerCase()
                .includes(search)

            );


        }
    );



    renderSearchResults(results);



};




// ============================================================
// SEARCH RESULTS
// ============================================================

function renderSearchResults(users){



    const container =
    document.getElementById(
        "searchResults"
    );



    if(!container)
        return;



    container.innerHTML="";



    if(users.length===0){


        container.innerHTML = `

        <div class="empty-state">

        No users found

        </div>

        `;


        return;


    }



    users.forEach(user=>{


        const div =
        document.createElement(
            "div"
        );



        div.className =
        "search-user";



        div.innerHTML = `


        <strong>

        ${user.name || "User"}

        </strong>


        <span>

        ${user.email || ""}

        </span>


        <button
        onclick="viewUser('${user.id}')">

        View

        </button>


        `;



        container.appendChild(div);



    });



}




// ============================================================
// VIEW USER
// ============================================================

window.viewUser =
function(id){


    const user =
    dashboardData.users.find(
        u=>u.id===id
    );



    if(!user)
        return;



    let modal =
    document.getElementById(
        "adminUserModal"
    );



    if(!modal){


        modal =
        document.createElement(
            "div"
        );


        modal.id =
        "adminUserModal";


        modal.className =
        "member-modal";


        document.body.appendChild(
            modal
        );


    }



    modal.innerHTML = `


    <div class="modal-overlay"></div>


    <div class="modal-box">


        <button class="close-user-modal">

        ×

        </button>


        <h2>

        User Details

        </h2>



        <p>

        Name:
        ${user.name || "N/A"}

        </p>



        <p>

        Email:
        ${user.email || "N/A"}

        </p>



        <p>

        Role:
        ${user.role || "member"}

        </p>



        <p>

        Membership:
        ${user.membership || "free"}

        </p>



    </div>


    `;



    modal.style.display =
    "flex";



    modal.querySelector(
        ".close-user-modal"
    )
    .onclick=()=>{


        modal.style.display =
        "none";


    };


};




// ============================================================
// DASHBOARD REFRESH
// ============================================================

window.refreshDashboard =
function(){


    updateUserStatistics();


    updatePaymentStatistics();


    renderActivities();


    console.log(
        "Dashboard refreshed"
    );


};




// ============================================================
// RECENT MEMBERS
// ============================================================

function getRecentMembers(){



    return dashboardData.users
    .sort(
        (a,b)=>{


            return (
                getDateValue(
                    b.createdAt
                )
                -
                getDateValue(
                    a.createdAt
                )
            );


        }
    )
    .slice(0,5);



}




// ============================================================
// DISPLAY RECENT MEMBERS
// ============================================================

function renderRecentMembers(){



    const container =
    document.getElementById(
        "recentMembers"
    );



    if(!container)
        return;



    container.innerHTML="";



    getRecentMembers()
    .forEach(member=>{


        const item =
        document.createElement(
            "div"
        );



        item.className =
        "recent-member";



        item.innerHTML = `


        <h4>

        ${member.name || "New User"}

        </h4>


        <p>

        ${member.email || ""}

        </p>


        `;



        container.appendChild(
            item
        );



    });


}




// ============================================================
// DATE HELPER
// ============================================================

function getDateValue(value){


    if(!value)
        return 0;



    if(value.seconds)

        return value.seconds * 1000;



    return new Date(value)
    .getTime();



}




// ============================================================
// ADMIN QUICK STATS API
// ============================================================

window.getAdminStats =
function(){



    return {


        totalUsers:
        dashboardData.users.length,


        premiumUsers:
        dashboardData.users.filter(
            u=>
            u.membership==="premium"
        ).length,


        admins:
        dashboardData.users.filter(
            u=>
            u.role==="admin"
        ).length,


        payments:
        dashboardData.payments.length



    };


};




// ============================================================
// END PART 2/3
// ============================================================
// ============================================================
// GTRADES-AXIS™
// ADMIN DASHBOARD
// PART 3/3
// ============================================================


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

window.addEventListener(
"error",
(event)=>{


    console.error(
        "Admin Dashboard Error:",
        event.error
    );


});




// ============================================================
// SAFE DATA CHECK
// ============================================================

function safeValue(value, fallback="N/A"){


    if(
        value === undefined ||
        value === null ||
        value === ""
    ){

        return fallback;

    }


    return value;


}




// ============================================================
// ADMIN NOTIFICATION SYSTEM
// ============================================================

function showAdminToast(message){



    let toast =
    document.getElementById(
        "adminToast"
    );



    if(!toast){


        toast =
        document.createElement(
            "div"
        );


        toast.id =
        "adminToast";


        toast.className =
        "admin-toast";


        document.body.appendChild(
            toast
        );


    }



    toast.innerHTML =
    message;



    toast.classList.add(
        "active"
    );



    setTimeout(()=>{


        toast.classList.remove(
            "active"
        );


    },3000);



}



window.adminNotify =
showAdminToast;




// ============================================================
// DASHBOARD CLOCK
// ============================================================

function updateClock(){



    const clock =
    document.getElementById(
        "adminClock"
    );



    if(!clock)
        return;



    clock.textContent =
    new Date()
    .toLocaleString();



}



setInterval(
updateClock,
1000
);



updateClock();




// ============================================================
// SYSTEM STATUS
// ============================================================

function updateSystemStatus(){



    const status =
    document.getElementById(
        "systemStatus"
    );



    if(!status)
        return;



    status.innerHTML = `

    <span>

    Firebase Connected

    </span>

    `;


}



updateSystemStatus();




// ============================================================
// EXPORT DASHBOARD REPORT
// ============================================================

window.exportDashboardReport =
function(){



    const stats =
    getAdminStats();



    const report = `

GTRADES-AXIS™ ADMIN REPORT

Generated:
${new Date().toLocaleString()}


TOTAL USERS:
${stats.totalUsers}


PREMIUM USERS:
${stats.premiumUsers}


ADMINS:
${stats.admins}


PAYMENTS:
${stats.payments}


`;



    const blob =
    new Blob(
        [report],
        {
            type:
            "text/plain"
        }
    );



    const url =
    URL.createObjectURL(
        blob
    );



    const link =
    document.createElement(
        "a"
    );



    link.href=url;



    link.download =
    "gtrades-admin-report.txt";



    link.click();



    URL.revokeObjectURL(
        url
    );



};




// ============================================================
// AUTO UPDATE DASHBOARD
// ============================================================

let dashboardInterval;



function startDashboardUpdater(){



    dashboardInterval =
    setInterval(()=>{


        updateUserStatistics();


        updatePaymentStatistics();


        renderRecentMembers();



    },60000);



}



startDashboardUpdater();




// ============================================================
// CLEANUP
// ============================================================

window.addEventListener(
"beforeunload",
()=>{


    if(dashboardInterval){


        clearInterval(
            dashboardInterval
        );


    }


});




// ============================================================
// MOBILE MENU
// ============================================================

const menuButton =
document.getElementById(
    "adminMenuButton"
);



const sidebar =
document.querySelector(
    ".admin-sidebar"
);



if(
    menuButton &&
    sidebar
){



    menuButton.addEventListener(
        "click",
        ()=>{


            sidebar.classList.toggle(
                "open"
            );


        }
    );


}




// ============================================================
// CLICK OUTSIDE SIDEBAR
// ============================================================

document.addEventListener(
"click",
(e)=>{


    if(
        sidebar &&
        !sidebar.contains(e.target) &&
        menuButton &&
        !menuButton.contains(e.target)
    ){


        sidebar.classList.remove(
            "open"
        );


    }


});




// ============================================================
// PAGE VISIBILITY REFRESH
// ============================================================

document.addEventListener(
"visibilitychange",
()=>{


    if(
        document.visibilityState ===
        "visible"
    ){


        refreshDashboard();


    }


});




// ============================================================
// ADMIN DATA API
// ============================================================

window.GTRADES_ADMIN_PANEL = {


    getUsers(){

        return dashboardData.users;

    },


    getPayments(){

        return dashboardData.payments;

    },


    getActivities(){

        return dashboardData.activities;

    },


    refresh(){

        refreshDashboard();

    }


};




// ============================================================
// INITIALIZE DASHBOARD
// ============================================================

function initializeAdmin(){



    console.log(
        "================================="
    );


    console.log(
        "GTRADES-AXIS™ ADMIN DASHBOARD READY"
    );


    console.log(
        "Admin:",
        currentAdmin
    );


    console.log(
        "================================="
    );



}



setTimeout(
initializeAdmin,
2000
);




// ============================================================
// FINAL SECURITY CHECK
// ============================================================

setInterval(
async()=>{


    const user =
    auth.currentUser;



    if(!user)
        return;



    try{


        const snap =
        await getDoc(
            doc(
                db,
                "users",
                user.uid
            )
        );



        if(
            !snap.exists() ||
            snap.data().role !== "admin"
        ){


            await signOut(auth);


            window.location.href =
            "../login.html";


        }



    }
    catch(error){


        console.error(
            "Security check failed:",
            error
        );


    }



},
300000
);




// ============================================================
// END ADMIN.JS
// ============================================================