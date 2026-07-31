// ============================================================
// GTRADES-AXIS™
// ADMIN PAYMENTS MANAGEMENT
// PART 1/3
// ============================================================

import { auth, db } from "../firebase.js";

import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";



// ============================================================
// GLOBAL STATE
// ============================================================

let payments = [];

let filteredPayments = [];

let currentSearch = "";

let currentFilter = "all";




// ============================================================
// DOM ELEMENTS
// ============================================================

const paymentsContainer =
document.getElementById(
    "paymentsContainer"
);


const searchInput =
document.getElementById(
    "paymentSearch"
);


const totalPaymentsEl =
document.getElementById(
    "totalPayments"
);


const approvedPaymentsEl =
document.getElementById(
    "approvedPayments"
);


const pendingPaymentsEl =
document.getElementById(
    "pendingPayments"
);


const rejectedPaymentsEl =
document.getElementById(
    "rejectedPayments"
);



// ============================================================
// ADMIN AUTH CHECK
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


        const adminSnap =
        await getDoc(
            doc(
                db,
                "users",
                user.uid
            )
        );



        if(
            !adminSnap.exists()
        ){


            await signOut(auth);


            window.location.href =
            "../login.html";


            return;


        }



        const admin =
        adminSnap.data();



        if(
            admin.role !== "admin"
        ){


            await signOut(auth);


            window.location.href =
            "../index.html";


            return;


        }



        loadPayments();



    }
    catch(error){


        console.error(
            "Admin check failed:",
            error
        );


    }



});




// ============================================================
// LOAD PAYMENTS REALTIME
// ============================================================

function loadPayments(){



    const paymentsQuery =
    query(

        collection(
            db,
            "payments"
        ),

        orderBy(
            "createdAt",
            "desc"
        )

    );



    onSnapshot(
        paymentsQuery,
        snapshot=>{


            payments=[];



            snapshot.forEach(
                payment=>{


                    payments.push({

                        id:
                        payment.id,


                        ...payment.data()

                    });



                }
            );



            updateStatistics();


            applyFilters();



        },
        error=>{


            console.error(
                "Payments loading error:",
                error
            );


            showError(
                "Unable to load payments"
            );


        }
    );



}




// ============================================================
// UPDATE STATISTICS
// ============================================================

function updateStatistics(){



    const total =
    payments.length;



    const approved =
    payments.filter(
        payment=>
        payment.status==="approved"
    )
    .length;



    const pending =
    payments.filter(
        payment=>
        payment.status==="pending"
    )
    .length;



    const rejected =
    payments.filter(
        payment=>
        payment.status==="rejected"
    )
    .length;



    if(totalPaymentsEl)

        totalPaymentsEl.textContent =
        total;



    if(approvedPaymentsEl)

        approvedPaymentsEl.textContent =
        approved;



    if(pendingPaymentsEl)

        pendingPaymentsEl.textContent =
        pending;



    if(rejectedPaymentsEl)

        rejectedPaymentsEl.textContent =
        rejected;



}



// ============================================================
// FILTER SYSTEM
// ============================================================

function applyFilters(){



    filteredPayments =
    payments.filter(
    payment=>{


        let searchMatch =
        true;



        if(currentSearch){


            const text =
            currentSearch
            .toLowerCase();



            searchMatch = (

                payment.name
                ?.toLowerCase()
                .includes(text)


                ||

                payment.email
                ?.toLowerCase()
                .includes(text)


                ||

                payment.transactionId
                ?.toLowerCase()
                .includes(text)

            );



        }



        let statusMatch =
        true;



        switch(
            currentFilter
        ){



            case "approved":


                statusMatch =
                payment.status==="approved";


            break;




            case "pending":


                statusMatch =
                payment.status==="pending";


            break;




            case "rejected":


                statusMatch =
                payment.status==="rejected";


            break;




            default:


                statusMatch =
                true;


        }




        return (
            searchMatch &&
            statusMatch
        );



    });



    renderPayments();



}




// ============================================================
// SEARCH EVENT
// ============================================================

if(searchInput){



    searchInput.addEventListener(
        "input",
        event=>{


            currentSearch =
            event.target.value;


            applyFilters();



        }
    );



}



// ============================================================
// FILTER BUTTONS
// ============================================================

document
.querySelectorAll(
    "[data-payment-filter]"
)
.forEach(button=>{


    button.addEventListener(
        "click",
        ()=>{


            document
            .querySelectorAll(
                "[data-payment-filter]"
            )
            .forEach(btn=>
                btn.classList.remove(
                    "active"
                )
            );



            button.classList.add(
                "active"
            );



            currentFilter =
            button.dataset.paymentFilter;



            applyFilters();



        }
    );



});




// ============================================================
// RENDER PAYMENTS
// ============================================================

function renderPayments(){



    if(!paymentsContainer)
        return;



    paymentsContainer.innerHTML="";



    if(
        filteredPayments.length===0
    ){


        paymentsContainer.innerHTML = `

        <div class="empty-state">

        No payments found

        </div>

        `;


        return;


    }



    filteredPayments.forEach(
        payment=>{


            const card =
            createPaymentCard(
                payment
            );



            paymentsContainer.appendChild(
                card
            );



        }
    );



}



// ============================================================
// PAYMENT CARD
// ============================================================

function createPaymentCard(payment){



    const card =
    document.createElement(
        "div"
    );



    card.className =
    "payment-card";



    card.innerHTML = `


    <div class="payment-header">


        <h3>

        ${payment.name || "User"}

        </h3>


        <span class="status ${payment.status}">

        ${payment.status || "pending"}

        </span>


    </div>



    <div class="payment-details">


        <p>

        Email:
        ${payment.email || "N/A"}

        </p>


        <p>

        Amount:
        $${payment.amount || 0}

        </p>


        <p>

        Method:
        ${payment.method || "N/A"}

        </p>


        <p>

        Transaction:
        ${payment.transactionId || "N/A"}

        </p>


    </div>



    <div class="payment-actions">


        <button

        class="view-payment"

        data-id="${payment.id}">

        View

        </button>


    </div>


    `;



    return card;


}




// ============================================================
// END PART 1/3
// ============================================================
// ============================================================
// GTRADES-AXIS™
// ADMIN PAYMENTS MANAGEMENT
// PART 2/3
// ============================================================


// ============================================================
// PAYMENT ACTION EVENTS
// ============================================================

document.addEventListener(
"click",
async(event)=>{


    const target =
    event.target;



    if(
        target.classList.contains(
            "view-payment"
        )
    ){


        const id =
        target.dataset.id;


        openPaymentModal(id);


    }



});




// ============================================================
// PAYMENT MODAL
// ============================================================

function openPaymentModal(id){



    const payment =
    payments.find(
        item=>item.id===id
    );



    if(!payment)
        return;



    let modal =
    document.getElementById(
        "paymentModal"
    );



    if(!modal){


        modal =
        document.createElement(
            "div"
        );


        modal.id =
        "paymentModal";


        modal.className =
        "payment-modal";


        document.body.appendChild(
            modal
        );


    }



    modal.innerHTML = `


    <div class="modal-overlay"></div>


    <div class="modal-box">


        <button class="close-payment-modal">

        ×

        </button>



        <h2>

        Payment Review

        </h2>



        <div class="payment-info">


            <p>

            User:
            <strong>
            ${payment.name || "N/A"}
            </strong>

            </p>



            <p>

            Email:
            <strong>
            ${payment.email || "N/A"}
            </strong>

            </p>



            <p>

            Amount:
            <strong>
            $${payment.amount || 0}
            </strong>

            </p>



            <p>

            Method:
            <strong>
            ${payment.method || "N/A"}
            </strong>

            </p>



            <p>

            Transaction ID:
            <strong>
            ${payment.transactionId || "N/A"}
            </strong>

            </p>



            <p>

            Current Status:
            <strong>
            ${payment.status || "pending"}
            </strong>

            </p>



        </div>




        <div class="modal-actions">


            <button

            class="approve-payment"

            data-id="${payment.id}">

            Approve

            </button>



            <button

            class="reject-payment"

            data-id="${payment.id}">

            Reject

            </button>



            <button

            class="pending-payment"

            data-id="${payment.id}">

            Mark Pending

            </button>



        </div>


    </div>


    `;



    modal.style.display =
    "flex";



    modal.querySelector(
        ".close-payment-modal"
    )
    .onclick=()=>{


        modal.style.display =
        "none";


    };



}




// ============================================================
// PAYMENT STATUS ACTIONS
// ============================================================

document.addEventListener(
"click",
async(event)=>{


    const id =
    event.target.dataset.id;



    if(!id)
        return;




    if(
        event.target.classList.contains(
            "approve-payment"
        )
    ){


        await updatePaymentStatus(
            id,
            "approved"
        );


    }




    if(
        event.target.classList.contains(
            "reject-payment"
        )
    ){


        await updatePaymentStatus(
            id,
            "rejected"
        );


    }




    if(
        event.target.classList.contains(
            "pending-payment"
        )
    ){


        await updatePaymentStatus(
            id,
            "pending"
        );


    }




});




// ============================================================
// UPDATE PAYMENT STATUS
// ============================================================

async function updatePaymentStatus(
id,
status
){



    try{


        await updateDoc(
            doc(
                db,
                "payments",
                id
            ),
            {

                status:status,

                updatedAt:
                serverTimestamp()


            }
        );



        showToast(
            "Payment status updated"
        );



        closePaymentModal();



    }
    catch(error){


        console.error(
            "Payment update error:",
            error
        );


        showToast(
            "Update failed"
        );


    }



}




// ============================================================
// CLOSE MODAL
// ============================================================

function closePaymentModal(){



    const modal =
    document.getElementById(
        "paymentModal"
    );



    if(modal){


        modal.style.display =
        "none";


    }


}




// ============================================================
// EXPORT PAYMENTS CSV
// ============================================================

window.exportPaymentsCSV =
function(){



    if(
        payments.length===0
    ){


        showToast(
            "No payments available"
        );


        return;


    }



    let csv =

    "Name,Email,Amount,Method,Transaction,Status,Date\n";



    payments.forEach(
    payment=>{


        csv +=

        `"${payment.name || ""}",` +

        `"${payment.email || ""}",` +

        `"${payment.amount || 0}",` +

        `"${payment.method || ""}",` +

        `"${payment.transactionId || ""}",` +

        `"${payment.status || ""}",` +

        `"${formatPaymentDate(payment.createdAt)}"\n`;



    });



    const blob =
    new Blob(
        [csv],
        {
            type:
            "text/csv"
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
    "gtrades-payments.csv";



    document.body.appendChild(
        link
    );



    link.click();



    document.body.removeChild(
        link
    );



    URL.revokeObjectURL(
        url
    );



};




// ============================================================
// DATE FORMAT
// ============================================================

function formatPaymentDate(
value
){



    if(!value)
        return "N/A";



    try{


        if(value.seconds){


            return new Date(
                value.seconds*1000
            )
            .toLocaleDateString();


        }



        return new Date(
            value
        )
        .toLocaleDateString();



    }
    catch{


        return "N/A";


    }



}




// ============================================================
// SORT PAYMENTS
// ============================================================

window.sortPayments =
function(type){



    switch(type){



        case "amount":


            filteredPayments.sort(
                (a,b)=>
                Number(
                    b.amount || 0
                )
                -
                Number(
                    a.amount || 0
                )
            );


        break;




        case "date":


            filteredPayments.sort(
                (a,b)=>
                getPaymentTime(
                    b.createdAt
                )
                -
                getPaymentTime(
                    a.createdAt
                )
            );


        break;




        case "status":


            filteredPayments.sort(
                (a,b)=>
                (
                    a.status || ""
                )
                .localeCompare(
                    b.status || ""
                )
            );


        break;



    }



    renderPayments();



};




// ============================================================
// PAYMENT TIME
// ============================================================

function getPaymentTime(value){



    if(!value)
        return 0;



    if(value.seconds)

        return value.seconds * 1000;



    return new Date(value)
    .getTime();



}




// ============================================================
// END PART 2/3
// ============================================================
// ============================================================
// GTRADES-AXIS™
// ADMIN PAYMENTS MANAGEMENT
// PART 3/3
// ============================================================


// ============================================================
// TOAST NOTIFICATION
// ============================================================

function showToast(message){


    let toast =
    document.getElementById(
        "paymentToast"
    );



    if(!toast){


        toast =
        document.createElement(
            "div"
        );


        toast.id =
        "paymentToast";


        toast.className =
        "admin-toast";


        document.body.appendChild(
            toast
        );


    }



    toast.textContent =
    message;



    toast.classList.add(
        "show"
    );



    setTimeout(()=>{


        toast.classList.remove(
            "show"
        );


    },3000);



}



// ============================================================
// PAYMENT SEARCH CLEAR
// ============================================================

window.clearPaymentSearch =
function(){


    if(searchInput){


        searchInput.value =
        "";


        currentSearch =
        "";


        applyFilters();


    }


};




// ============================================================
// REFRESH PAYMENTS
// ============================================================

window.refreshPayments =
function(){



    updateStatistics();


    applyFilters();



    showToast(
        "Payments refreshed"
    );


};




// ============================================================
// PAYMENT DETAILS ACCESS
// ============================================================

window.getPayment =
function(id){



    return payments.find(
        payment=>
        payment.id===id
    );



};




// ============================================================
// BULK APPROVAL
// ============================================================

window.approveAllPending =
async function(){



    const pending =
    payments.filter(
        payment=>
        payment.status==="pending"
    );



    if(
        pending.length===0
    ){


        showToast(
            "No pending payments"
        );


        return;


    }



    const confirmAction =
    confirm(
        "Approve all pending payments?"
    );



    if(!confirmAction)
        return;



    try{


        for(
            const payment of pending
        ){


            await updateDoc(
                doc(
                    db,
                    "payments",
                    payment.id
                ),
                {


                    status:
                    "approved",


                    updatedAt:
                    serverTimestamp()


                }
            );


        }



        showToast(
            "All pending payments approved"
        );



    }
    catch(error){


        console.error(
            "Bulk approval error:",
            error
        );


        showToast(
            "Bulk approval failed"
        );


    }



};




// ============================================================
// PAYMENT SECURITY CHECK
// ============================================================

async function verifyAdmin(){



    const user =
    auth.currentUser;



    if(!user)
        return false;



    try{


        const snap =
        await getDoc(
            doc(
                db,
                "users",
                user.uid
            )
        );



        return (

            snap.exists()

            &&

            snap.data().role==="admin"

        );



    }
    catch(error){


        console.error(
            error
        );


        return false;


    }



}




// ============================================================
// AUTO SECURITY MONITOR
// ============================================================

setInterval(
async()=>{


    const allowed =
    await verifyAdmin();



    if(!allowed){


        await signOut(auth);



        window.location.href =
        "../login.html";


    }



},
300000
);




// ============================================================
// RESPONSIVE HANDLING
// ============================================================

function handlePaymentResponsive(){



    const width =
    window.innerWidth;



    if(
        width < 768
    ){


        document.body.classList.add(
            "mobile-payments"
        );


    }
    else{


        document.body.classList.remove(
            "mobile-payments"
        );


    }



}



window.addEventListener(
"resize",
handlePaymentResponsive
);



handlePaymentResponsive();




// ============================================================
// CLOSE MODAL OUTSIDE CLICK
// ============================================================

document.addEventListener(
"click",
(event)=>{


    const modal =
    document.getElementById(
        "paymentModal"
    );



    if(
        modal
        &&
        event.target.classList.contains(
            "modal-overlay"
        )
    ){


        modal.style.display =
        "none";


    }



});




// ============================================================
// KEYBOARD CONTROLS
// ============================================================

document.addEventListener(
"keydown",
(event)=>{


    if(
        event.key==="Escape"
    ){


        closePaymentModal();


    }



});




// ============================================================
// GLOBAL PAYMENT API
// ============================================================

window.GTRADES_PAYMENTS = {


    all(){

        return payments;

    },


    filtered(){

        return filteredPayments;

    },


    refresh(){

        refreshPayments();

    },


    export(){

        exportPaymentsCSV();

    },


    find(id){

        return getPayment(id);

    }


};




// ============================================================
// DEBUG INFORMATION
// ============================================================

console.log(
"================================="
);


console.log(
"GTRADES-AXIS™ ADMIN PAYMENTS READY"
);


console.log(
"Payments Loaded:",
payments.length
);


console.log(
"================================="
);




// ============================================================
// END ADMIN-PAYMENTS.JS
// ============================================================