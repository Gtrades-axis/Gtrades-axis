import { db } from "./firebase.js";

import {
collection,
getDocs,
doc,
updateDoc,
setDoc,
serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


const paymentsTable =
document.getElementById("paymentsTable");

const pendingCount =
document.getElementById("pendingCount");

const approvedCount =
document.getElementById("approvedCount");

const rejectedCount =
document.getElementById("rejectedCount");

const revenue =
document.getElementById("revenue");


let payments = [];



// ===============================
// LOAD PAYMENTS
// ===============================

async function loadPayments(){


try{


const snapshot =
await getDocs(
collection(db,"payments")
);


payments=[];


snapshot.forEach(item=>{

payments.push({

id:item.id,
...item.data()

});

});


displayPayments();


}
catch(error){

console.error(error);

paymentsTable.innerHTML=

`
<tr>
<td colspan="7">
Error loading payments
</td>
</tr>
`;

}

}



// ===============================
// DISPLAY PAYMENTS
// ===============================

function displayPayments(){


paymentsTable.innerHTML="";


let pending=0;
let approved=0;
let rejected=0;
let total=0;



payments.forEach(payment=>{


if(payment.status==="pending")
pending++;


if(payment.status==="approved"){

approved++;

total += Number(payment.amount || 0);

}


if(payment.status==="rejected")
rejected++;



let row=document.createElement("tr");


row.innerHTML=`

<td>
${payment.name || "-"}
</td>


<td>
${payment.plan || "-"}
</td>


<td>
$${payment.amount || 0}
</td>


<td>
${payment.paymentMethod || "-"}
</td>


<td>
${payment.transactionId || "-"}
</td>


<td>

<span class="status ${payment.status}">

${payment.status}

</span>

</td>


<td>


<button class="approve">

Approve

</button>


<button class="reject">

Reject

</button>


</td>

`;



// APPROVE BUTTON

row.querySelector(".approve")
.onclick=()=>{

updatePayment(
payment.id,
"approved",
payment.uid
);

};



// REJECT BUTTON

row.querySelector(".reject")
.onclick=()=>{

updatePayment(
payment.id,
"rejected",
payment.uid
);

};



paymentsTable.appendChild(row);


});



pendingCount.innerText=pending;

approvedCount.innerText=approved;

rejectedCount.innerText=rejected;

revenue.innerText="$"+total;



}



// ===============================
// UPDATE PAYMENT
// ===============================

async function updatePayment(
paymentId,
status,
uid
){


try{


await updateDoc(

doc(db,"payments",paymentId),

{

status:status

}

);



// Upgrade user after approval

if(status==="approved"){


await setDoc(

doc(db,"users",uid),

{

premium:true,

plan:"Premium",

membership:"premium",

active:true,

status:"approved",

payment:"paid",

approvedAt:serverTimestamp()

},

{
merge:true
}

);


}



alert(
"Payment "+status
);

await loadPayments();

}

catch(error){

console.error(error);
if(status==="approved" && payment.status==="approved"){

alert("Already approved");

return;

}
alert(
"Failed updating payment"
);

}


}




loadPayments();