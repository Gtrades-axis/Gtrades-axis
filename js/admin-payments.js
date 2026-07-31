// ==========================================================
// GTRADES-AXIS™
// ADMIN PAYMENTS MANAGEMENT
// PART 1
// Firebase Setup + Load Payment Requests
// ==========================================================


console.log("ADMIN PAYMENTS JS LOADED");



import { auth, db } from "../firebase.js";



import {

    collection,
    query,
    where,
    orderBy,
    onSnapshot

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {

    doc,
    updateDoc,
    getDoc,
    serverTimestamp

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {

    onAuthStateChanged

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";



// ===============================
// ELEMENTS
// ===============================


const paymentTable =

document.getElementById(
    "paymentsTable"
);




const emptyMessage =

document.getElementById(
    "emptyPayments"
);





// ===============================
// ADMIN CHECK
// ===============================


onAuthStateChanged(

auth,

async(user)=>{


if(!user){


    window.location.href =
    "../login.html";


    return;


}



console.log(
    "Admin logged in:",
    user.email
);



loadPayments();



});





// ===============================
// LOAD PAYMENTS
// ===============================


function loadPayments(){



const paymentsRef =

collection(
    db,
    "payments"
);





const paymentsQuery =

query(

paymentsRef,


where(
    "status",
    "==",
    "pending"
),


orderBy(
    "createdAt",
    "desc"
)

);





onSnapshot(

paymentsQuery,

(snapshot)=>{



if(snapshot.empty){



    if(emptyMessage){

        emptyMessage.style.display =
        "block";

    }



    if(paymentTable){

        paymentTable.innerHTML =
        "";

    }


    return;



}




if(emptyMessage){

    emptyMessage.style.display =
    "none";

}



paymentTable.innerHTML = "";





snapshot.forEach(

(doc)=>{


const payment = doc.data();



paymentTable.innerHTML += `

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

<span class="status ${payment.status}">

${payment.status}

</span>

</td>



<td>
${payment.paymentMethod || "N/A"}
</td>



<td>

<a href="${payment.paymentProof || '#'}"
target="_blank">

View Proof

</a>

</td>



<td>

<button 
class="approve-btn"
data-id="${doc.id}"
data-user="${payment.userId}">

Approve

</button>



<button 
class="reject-btn"
data-id="${doc.id}">

Reject

</button>


</td>


</tr>

`;



});



console.log(
"Payments loaded"
);



});



}
// ==========================================================
// GTRADES-AXIS™
// ADMIN PAYMENTS MANAGEMENT
// PART 2
// Approve + Reject Payment Actions
// ==========================================================


import {

    doc,
    updateDoc,
    getDoc

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";





// ===============================
// BUTTON ACTION LISTENER
// ===============================


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



// ===============================
// UPDATE PAYMENT STATUS
// ===============================


const alreadyApproved =

await checkPaymentAlreadyApproved(
paymentId
);



if(alreadyApproved){


    alert(
        "This payment is already approved."
    );


    return;


}



await updateDoc(

doc(
db,
"payments",
paymentId
),

{


status:

"approved",


approvedAt:

serverTimestamp()



}

);



await createPaymentLog(

"APPROVED",

paymentId,

userId,

"Payment approved and premium membership activated"

);



// ===============================
// PAYMENT HISTORY
// ===============================


async function loadPaymentHistory(){



const paymentsRef =

collection(

db,

"payments"

);




const snapshot =

await getDocs(
paymentsRef
);




snapshot.forEach(

(doc)=>{


const payment =
doc.data();



console.log(

"Payment History:",

{

id:doc.id,

status:
payment.status,

user:
payment.email

}

);



});



}



loadPaymentHistory();

// ===============================
// UPDATE USER MEMBERSHIP
// ===============================


if(userId){



const userRef =

doc(

db,

"users",

userId

);




const userSnap =

await getDoc(
userRef
);





if(
userSnap.exists()
){



await updateDoc(

userRef,

{


membership:
"premium",


status:
"active",


role:
"member"



}

);



console.log(
"User upgraded to premium"
);



}



}






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

"Failed to approve payment."

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
new Date()



}

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

"Failed to reject payment."

);



}





}



});
// ==========================================================
// GTRADES-AXIS™
// ADMIN PAYMENTS MANAGEMENT
// PART 3
// Security + History + Status Management
// ==========================================================



import {

    getDocs

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";




// ===============================
// VERIFY ADMIN ROLE
// ===============================


async function verifyAdmin(user){



if(!user){

    return false;

}



try{


const adminRef =

doc(

db,

"users",

user.uid

);



const adminSnap =

await getDoc(
adminRef
);





if(
adminSnap.exists()
){


const data =
adminSnap.data();




if(
data.role === "admin"
){


console.log(
"Admin verified"
);


return true;


}



}



return false;



}
catch(error){


console.error(
"Admin verification error:",
error
);


return false;


}


}






// ===============================
// BLOCK NON ADMINS
// ===============================


onAuthStateChanged(

auth,

async(user)=>{



const allowed =

await verifyAdmin(
user
);



if(!allowed){



alert(
"Unauthorized access"
);



window.location.href =
"../index.html";



}



});
// ==========================================================
// GTRADES-AXIS™
// ADMIN PAYMENTS MANAGEMENT
// PART 4
// Dashboard Statistics + Search + Filters
// ==========================================================



// ===============================
// DASHBOARD ELEMENTS
// ===============================


const totalPaymentsElement =

document.getElementById(
    "totalPayments"
);



const pendingPaymentsElement =

document.getElementById(
    "pendingPayments"
);



const approvedPaymentsElement =

document.getElementById(
    "approvedPayments"
);



const revenueElement =

document.getElementById(
    "totalRevenue"
);





// Search

const searchInput =

document.getElementById(
    "paymentSearch"
);




// Filter

const statusFilter =

document.getElementById(
    "paymentFilter"
);





let allPayments = [];





// ===============================
// LOAD ALL PAYMENT DATA
// ===============================


function loadPaymentStatistics(){



const paymentsRef =

collection(

db,

"payments"

);




onSnapshot(

paymentsRef,

(snapshot)=>{



allPayments = [];



let total = 0;

let pending = 0;

let approved = 0;

let revenue = 0;





snapshot.forEach(

(doc)=>{


const payment =
doc.data();



allPayments.push({

id:
doc.id,

...payment

});



total++;




if(
payment.status === "pending"
){

pending++;

}




if(
payment.status === "approved"
){


approved++;



// If amount exists

if(
payment.amount
){

revenue +=
Number(payment.amount);

}


}





});






// Update cards


if(totalPaymentsElement)

totalPaymentsElement.innerText =
total;



if(pendingPaymentsElement)

pendingPaymentsElement.innerText =
pending;



if(approvedPaymentsElement)

approvedPaymentsElement.innerText =
approved;



if(revenueElement)

revenueElement.innerText =
"$ " + revenue;



renderPayments(
allPayments
);



});



}



loadPaymentStatistics();





// ===============================
// SEARCH + FILTER
// ===============================


if(searchInput){



searchInput.addEventListener(

"input",

()=>{


filterPayments();


}

);



}




if(statusFilter){



statusFilter.addEventListener(

"change",

()=>{


filterPayments();



}

);



}





function filterPayments(){



let filtered =
allPayments;



const search =
searchInput?.value
.toLowerCase()
.trim();




const status =
statusFilter?.value;




if(search){


filtered = filtered.filter(

(payment)=>


payment.name
?.toLowerCase()
.includes(search)


||

payment.email
?.toLowerCase()
.includes(search)


);



}





if(
status &&
status !== "all"
){



filtered = filtered.filter(

(payment)=>

payment.status === status


);



}





renderPayments(filtered);



}





// ===============================
// RENDER PAYMENT TABLE
// ===============================


function renderPayments(data){



if(!paymentTable){

return;

}




paymentTable.innerHTML = "";




data.forEach(

(payment)=>{



paymentTable.innerHTML += `


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

<span class="status ${payment.status}">

${payment.status}

</span>

</td>



<td>

${payment.paymentMethod || "N/A"}

</td>



<td>


<a href="${payment.paymentProof || '#'}"
target="_blank">

Proof

</a>


</td>



<td>


${
payment.status === "pending"

?

`

<button 
class="approve-btn"
data-id="${payment.id}"
data-user="${payment.userId}">

Approve

</button>


<button 
class="reject-btn"
data-id="${payment.id}">

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



}
// ==========================================================
// GTRADES-AXIS™
// ADMIN PAYMENTS MANAGEMENT
// PART 5 FINAL
// Security + Audit Logs + Navigation Cleanup
// ==========================================================


import {

    addDoc

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";




// ===============================
// CREATE APPROVAL AUDIT LOG
// ===============================


async function createPaymentLog(

action,

paymentId,

userId,

details

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

userId,


details:

details,


admin:

auth.currentUser.email,


createdAt:

serverTimestamp()


}

);



console.log(
"Payment audit saved"
);



}

catch(error){


console.error(

"Audit log error:",

error

);



}



}







// ===============================
// UPDATE APPROVE FUNCTION
// ===============================


// Add this after successful approval:


// createPaymentLog(
// "APPROVED",
// paymentId,
// userId,
// "Payment approved and premium activated"
// );






// ===============================
// UPDATE REJECT FUNCTION
// ===============================


// Add this after successful rejection:


// createPaymentLog(
// "REJECTED",
// paymentId,
// null,
// "Payment rejected by admin"
// );







// ===============================
// PREVENT DOUBLE APPROVAL
// ===============================


async function checkPaymentAlreadyApproved(paymentId){


const paymentRef =

doc(

db,

"payments",

paymentId

);



const paymentSnap =

await getDoc(
paymentRef
);



if(
paymentSnap.exists()
){


const data =
paymentSnap.data();



if(
data.status === "approved"
){


return true;


}


}



return false;


}