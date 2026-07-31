// ==========================================================
// GTRADES-AXIS™
// ADMIN PAYMENTS MANAGEMENT
// COMPLETE VERSION
// ==========================================================


console.log("ADMIN PAYMENTS JS LOADED");


import { auth, db } from "./firebase.js";


import {

    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    getDoc,
    addDoc,
    serverTimestamp

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


import {

    onAuthStateChanged

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";





// ==========================================================
// ELEMENTS
// ==========================================================


const paymentsTable = document.getElementById(
    "paymentsTable"
);





// ==========================================================
// ADMIN AUTH CHECK
// ==========================================================


onAuthStateChanged(auth, async(user)=>{


    if(!user){

        window.location.href = "login.html";

        return;

    }



    const adminRef = doc(
        db,
        "users",
        user.uid
    );


    const adminSnap = await getDoc(adminRef);



    if(
        !adminSnap.exists()
        ||
        adminSnap.data().role !== "admin"
    ){

        alert(
            "Unauthorized access"
        );


        window.location.href = "index.html";


        return;

    }



    loadPayments();


});






// ==========================================================
// LOAD PENDING PAYMENTS
// ==========================================================


function loadPayments(){



    if(!paymentsTable){

        console.error(
            "paymentsTable not found"
        );

        return;

    }




    const paymentsRef = collection(
        db,
        "payments"
    );




    const paymentsQuery = query(

        paymentsRef,

        orderBy(
            "createdAt",
            "desc"
        )

    );





    onSnapshot(

        paymentsQuery,

        (snapshot)=>{


            paymentsTable.innerHTML = "";



            if(snapshot.empty){


                paymentsTable.innerHTML = `

                <tr>

                <td colspan="7">

                No payment requests found

                </td>

                </tr>

                `;


                return;


            }





            snapshot.forEach((paymentDoc)=>{



                const payment =
                paymentDoc.data();




                paymentsTable.innerHTML += `


                <tr>


                <td>
                ${payment.name || "N/A"}
                </td>



                <td>
                ${payment.email || "N/A"}
                </td>



                <td>
                ${payment.plan || "N/A"}
                </td>



                <td>
                ${payment.paymentMethod || "N/A"}
                </td>



                <td>


                ${
                    payment.paymentProof

                    ?

                    `<a href="${payment.paymentProof}" target="_blank">
                    View Proof
                    </a>`

                    :

                    "No Proof"

                }


                </td>



                <td>

                <span class="status ${payment.status}">

                ${payment.status}

                </span>


                </td>




                <td>


                ${
                    payment.status === "pending"

                    ?

                    `

                    <button
                    class="approve-btn"
                    data-id="${paymentDoc.id}"
                    data-user="${payment.userId}">

                    Approve

                    </button>



                    <button
                    class="reject-btn"
                    data-id="${paymentDoc.id}">

                    Reject

                    </button>

                    `

                    :

                    "Completed"

                }



                </td>


                </tr>


                `;


            });



        },


        (error)=>{


            console.error(
                "Payment loading error:",
                error
            );


        }


    );


}







// ==========================================================
// PAYMENT ACTIONS
// ==========================================================


document.addEventListener(
"click",
async(e)=>{





// ===============================
// APPROVE PAYMENT
// ===============================


if(
e.target.classList.contains(
"approve-btn"
)

){


    const paymentId =
    e.target.dataset.id;


    const userId =
    e.target.dataset.user;




    if(
        !confirm(
            "Approve this payment?"
        )
    ){

        return;

    }






    try{



        const paymentRef =
        doc(
            db,
            "payments",
            paymentId
        );



        const paymentSnap =
        await getDoc(paymentRef);





        if(
            paymentSnap.exists()
            &&
            paymentSnap.data().status === "approved"
        ){


            alert(
                "Payment already approved."
            );


            return;

        }






        await updateDoc(

            paymentRef,

            {

                status:
                "approved",


                approvedAt:
                serverTimestamp()

            }

        );






        if(userId){



            await updateDoc(

                doc(
                    db,
                    "users",
                    userId
                ),

                {

                    membership:
                    "premium",


                    status:
                    "active",


                    role:
                    "member"

                }

            );


        }





        await createPaymentLog(

            "APPROVED",

            paymentId,

            userId,

            "Payment approved and premium membership activated"

        );





        alert(
            "Payment approved successfully."
        );




    }

    catch(error){


        console.error(
            "Approval error:",
            error
        );


        alert(
            "Approval failed."
        );


    }



}







// ===============================
// REJECT PAYMENT
// ===============================


if(
e.target.classList.contains(
"reject-btn"
)

){



    const paymentId =
    e.target.dataset.id;





    if(
        !confirm(
            "Reject this payment?"
        )
    ){

        return;

    }






    try{


        await updateDoc(

            doc(
                db,
                "payments",
                paymentId
            ),

            {

                status:
                "rejected",


                rejectedAt:
                serverTimestamp()

            }

        );






        await createPaymentLog(

            "REJECTED",

            paymentId,

            null,

            "Payment rejected by admin"

        );





        alert(
            "Payment rejected."
        );



    }


    catch(error){


        console.error(
            "Reject error:",
            error
        );


        alert(
            "Reject failed."
        );


    }



}



});







// ==========================================================
// PAYMENT AUDIT LOGS
// ==========================================================


async function createPaymentLog(

action,

paymentId,

userId,

description

){



try{


await addDoc(

collection(
db,
"paymentLogs"
),

{


action:


action,


paymentId:


paymentId,


userId:


userId || null,


description:


description,


adminEmail:


auth.currentUser.email,


createdAt:


serverTimestamp()


}

);



}


catch(error){


console.error(
"Log error:",
error
);


}



}