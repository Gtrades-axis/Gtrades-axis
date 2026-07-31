// ==========================================================
// GTRADES-AXIS™
// PAYMENT SYSTEM
// PART 1
// Firebase Setup + Form Initialization + User Validation
// ==========================================================


console.log("PAYMENT JS LOADED");


// ===============================
// FIREBASE IMPORTS
// ===============================
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";
import { auth, db } from "./firebase.js";


import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";


import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";



// ===============================
// PAGE ELEMENTS
// ===============================


const paymentForm = document.getElementById(
    "paymentForm"
);


const userEmailInput = document.getElementById(
    "userEmail"
);


const userNameInput = document.getElementById(
    "userName"
);


const membershipInput = document.getElementById(
    "membershipPlan"
);



console.log(
    "Payment Form:",
    paymentForm
);



// ===============================
// CHECK LOGIN STATUS
// ===============================


onAuthStateChanged(auth, async (user)=>{


    if(!user){

        console.log(
            "No logged in user"
        );


        /*
        User is not logged in.
        Redirect to login page.
        */


        alert(
            "Please login before making payment."
        );


        window.location.href =
        "login.html";


        return;

    }



    console.log(
        "Logged in user:",
        user.email
    );



    // Fill email automatically

    if(userEmailInput){

        userEmailInput.value =
        user.email;

        userEmailInput.readOnly =
        true;

    }



    // Get user profile

    try{


        const userRef =
        doc(
            db,
            "users",
            user.uid
        );


        const userSnap =
        await getDoc(userRef);



        if(userSnap.exists()){


            const userData =
            userSnap.data();



            console.log(
                "User Data:",
                userData
            );



            if(userNameInput){

                userNameInput.value =
                userData.name || "";

            }


        }



    }
    catch(error){


        console.error(
            "User data loading error:",
            error
        );


    }



});



// ===============================
// DEFAULT PLAN
// ===============================


if(membershipInput){


    membershipInput.addEventListener(
        "change",
        ()=>{


            console.log(
                "Selected Plan:",
                membershipInput.value
            );


        }
    );


}



// ===============================
// FORM CHECK
// ===============================


if(!paymentForm){


    console.error(
        "Payment form not found"
    );


}
else{


    console.log(
        "Payment form ready"
    );


}
// ==========================================================
// GTRADES-AXIS™
// PAYMENT SYSTEM
// PART 2
// Submit Payment Request + Firestore Storage
// ==========================================================


import {

    collection,
    addDoc,
    serverTimestamp

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";




// ===============================
// PAYMENT FORM SUBMISSION
// ===============================


if(paymentForm){


paymentForm.addEventListener(
"submit",
async(e)=>{


    e.preventDefault();



    console.log(
        "Payment submission started"
    );



    const user =
    auth.currentUser;



    if(!user){


        alert(
            "Please login first."
        );


        return;


    }



    // ===============================
    // FORM VALUES
    // ===============================


    const email =
    userEmailInput.value.trim();



    const name =
    userNameInput.value.trim();



    const plan =
    membershipInput.value;



    const paymentMethod =
    document.getElementById(
        "paymentMethod"
    )?.value;



    const transactionId =
    document.getElementById(
        "transactionId"
    )?.value.trim();





    // ===============================
    // VALIDATION
    // ===============================


    if(
        !name ||
        !email ||
        !plan ||
        !paymentMethod ||
        !transactionId
    ){


        alert(
            "Please complete all payment details."
        );


        return;


    }




    // ===============================
    // LOADING STATE
    // ===============================


    const submitButton =
    paymentForm.querySelector(
        "button[type='submit']"
    );



    if(submitButton){


        submitButton.disabled =
        true;


        submitButton.innerHTML =
        "Submitting...";


    }





    try{



        // ===============================
        // CREATE PAYMENT REQUEST
        // ===============================


        const paymentRef =
        await addDoc(

            collection(
                db,
                "payments"
            ),

            {


                userId:
                user.uid,


                name:
                name,


                email:
                email,


                plan:
                plan,


                paymentMethod:
                paymentMethod,


                transactionId:
                transactionId,



                status:
                "pending",



                membership:
                "pending",



                createdAt:
                serverTimestamp()



            }


        );




        console.log(
            "Payment Created:",
            paymentRef.id
        );





        alert(
            "Payment submitted successfully. Waiting for admin approval."
        );




        // Clear form


        paymentForm.reset();



        if(userEmailInput){

            userEmailInput.value =
            user.email;

        }




    }
    catch(error){



        console.error(
            "Payment submission error:",
            error
        );



        alert(
            "Payment failed. Please try again."
        );



    }
    finally{



        if(submitButton){


            submitButton.disabled =
            false;


            submitButton.innerHTML =
            "Submit Payment";


        }



    }



});



}
// ==========================================================
// GTRADES-AXIS™
// PAYMENT SYSTEM
// PART 3
// Payment Proof Upload System
// ==========================================================


// ===============================
// STORAGE INITIALIZATION
// ===============================

const storage = getStorage();



// ===============================
// PAYMENT PROOF ELEMENT
// ===============================


const proofInput =
document.getElementById(
    "paymentProof"
);




let uploadedProofURL = "";




// ===============================
// FILE VALIDATION + PREVIEW
// ===============================


if(proofInput){


proofInput.addEventListener(
"change",
async()=>{


    const file =
    proofInput.files[0];



    if(!file){

        return;

    }



    console.log(
        "Selected proof:",
        file.name
    );



    // Allowed file types

    const allowedTypes = [

        "image/jpeg",
        "image/png",
        "application/pdf"

    ];



    if(
        !allowedTypes.includes(
            file.type
        )
    ){


        alert(
            "Only JPG, PNG or PDF files are allowed."
        );


        proofInput.value = "";

        return;


    }



    // Maximum size 5MB

    if(
        file.size >
        5 * 1024 * 1024
    ){


        alert(
            "File size must be below 5MB."
        );


        proofInput.value = "";

        return;


    }



    const user =
    auth.currentUser;



    if(!user){

        alert(
            "Login required."
        );

        return;

    }



    try{


        const fileName =

        Date.now()
        +
        "_"
        +
        file.name;



        const storageRef =

        ref(

            storage,

            "paymentProofs/"
            +
            user.uid
            +
            "/"
            +
            fileName

        );




        const uploadResult =

        await uploadBytes(

            storageRef,

            file

        );




        uploadedProofURL =

        await getDownloadURL(

            uploadResult.ref

        );



        console.log(
            "Proof uploaded:",
            uploadedProofURL
        );



    }
    catch(error){


        console.error(
            "Upload error:",
            error
        );


        alert(
            "Proof upload failed."
        );


    }



});



}
// ==========================================================
// GTRADES-AXIS™
// PAYMENT SYSTEM
// PART 4
// UI Feedback + Duplicate Protection + Status Checking
// ==========================================================


import {

    query,
    where,
    getDocs,
    limit

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";




// ===============================
// UI ELEMENTS
// ===============================


const loadingScreen =

document.querySelector(
    ".loading-screen"
);



const successModal =

document.querySelector(
    ".success-modal"
);



const successClose =

document.querySelector(
    ".success-close"
);




// ===============================
// SHOW LOADING
// ===============================


function showLoading(){


    if(loadingScreen){

        loadingScreen.classList.add(
            "active"
        );

    }


}




// ===============================
// HIDE LOADING
// ===============================


function hideLoading(){


    if(loadingScreen){

        loadingScreen.classList.remove(
            "active"
        );

    }


}




// ===============================
// SHOW SUCCESS MODAL
// ===============================


function showSuccess(){


    if(successModal){

        successModal.classList.add(
            "active"
        );

    }


}




// ===============================
// CLOSE SUCCESS MODAL
// ===============================


if(successClose){


successClose.addEventListener(
"click",
()=>{


    successModal.classList.remove(
        "active"
    );


    window.location.href =
    "dashboard.html";


});



}




// ===============================
// CHECK EXISTING PAYMENT
// ===============================


async function checkExistingPayment(uid){


    try{


        const paymentsRef =

        collection(
            db,
            "payments"
        );



        const q =

        query(

            paymentsRef,


            where(
                "userId",
                "==",
                uid
            ),


            where(
                "status",
                "==",
                "pending"
            ),


            limit(1)

        );



        const snapshot =

        await getDocs(q);




        if(
            !snapshot.empty
        ){


            console.log(
                "Existing pending payment found"
            );


            return true;


        }



        return false;



    }
    catch(error){


        console.error(
            "Payment check error:",
            error
        );


        return false;


    }



}




// ===============================
// UPDATE SUBMIT FUNCTION
// ===============================


const originalSubmit = paymentForm;



if(paymentForm){


paymentForm.addEventListener(
"submit",
async()=>{


    const user =
    auth.currentUser;



    if(!user){

        return;

    }



    const exists =

    await checkExistingPayment(
        user.uid
    );



    if(exists){


        alert(
            "You already have a pending payment request."
        );


        return false;


    }



    showLoading();



});



}





// ===============================
// PAYMENT SUCCESS HANDLER
// ===============================


// This function can be called
// after successful Firestore save


window.paymentSuccess = function(){


    hideLoading();


    showSuccess();



};





// ===============================
// CHECK USER PAYMENT STATUS
// ===============================


async function checkPaymentStatus(){


const user =
auth.currentUser;



if(!user){

    return;

}



try{


const q =

query(

collection(
    db,
    "payments"
),


where(
    "userId",
    "==",
    user.uid
),


limit(1)

);



const result =

await getDocs(q);



if(!result.empty){


const data =

result.docs[0].data();



console.log(
    "Current payment status:",
    data.status
);



}



}
catch(error){


console.error(
    "Status check error:",
    error
);


}



}
// ==========================================================
// GTRADES-AXIS™
// PAYMENT SYSTEM
// PART 5 FINAL
// Real-Time Approval Detection + Premium Unlock
// ==========================================================


import {

    onSnapshot

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";





// ===============================
// LISTEN FOR PAYMENT APPROVAL
// ===============================


function listenForPaymentApproval(){



const user =
auth.currentUser;



if(!user){

    return;

}





const paymentsQuery =

query(

collection(
    db,
    "payments"
),


where(
    "userId",
    "==",
    user.uid
),


limit(1)

);





onSnapshot(

paymentsQuery,

(snapshot)=>{


    if(snapshot.empty){

        return;

    }




    snapshot.forEach(

    (paymentDoc)=>{



        const paymentData =

        paymentDoc.data();




        console.log(
            "Payment Update:",
            paymentData
        );





        // ===============================
        // APPROVED
        // ===============================



        if(

            paymentData.status ===
            "approved"

        ){



            console.log(
                "Payment Approved"
            );



            showSuccess();



        }





        // ===============================
        // REJECTED
        // ===============================



        if(

            paymentData.status ===
            "rejected"

        ){



            alert(
                "Your payment was rejected. Please contact support."
            );



        }




    });



},

(error)=>{


    console.error(
        "Approval listener error:",
        error
    );


}



);



}





// ===============================
// START LISTENER AFTER LOGIN
// ===============================


onAuthStateChanged(

auth,

(user)=>{


    if(user){


        listenForPaymentApproval();



    }



});