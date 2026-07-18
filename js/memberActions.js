import { db } from "./firebase.js";

import {
doc,
updateDoc,
deleteDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import { loadMembers } from "./members.js";

/* ==========================
   APPROVE MEMBER
========================== */

export async function approveMember(uid){

try{

await updateDoc(doc(db,"users",uid),{

active:true

});

alert("Member approved successfully.");

loadMembers();

}catch(error){

alert(error.message);

}

}

/* ==========================
   MAKE PREMIUM
========================== */

export async function makePremium(uid){

try{

await updateDoc(doc(db,"users",uid),{

premium:true

});

alert("Member upgraded to Premium.");

loadMembers();

}catch(error){

alert(error.message);

}

}

/* ==========================
   REMOVE PREMIUM
========================== */

export async function removePremium(uid){

try{

await updateDoc(doc(db,"users",uid),{

premium:false

});

alert("Premium removed.");

loadMembers();

}catch(error){

alert(error.message);

}

}

/* ==========================
   SUSPEND MEMBER
========================== */

export async function suspendMember(uid){

const confirmSuspend=confirm(
"Are you sure you want to suspend this member?"
);

if(!confirmSuspend){

return;

}

try{

await updateDoc(doc(db,"users",uid),{

active:false

});

alert("Member suspended.");

loadMembers();

}catch(error){

alert(error.message);

}

}

/* ==========================
   DELETE MEMBER
========================== */

export async function deleteMember(uid){

const confirmDelete=confirm(
"This will permanently remove the member record. Continue?"
);

if(!confirmDelete){

return;

}

try{

await deleteDoc(doc(db,"users",uid));

alert("Member deleted.");

loadMembers();

}catch(error){

alert(error.message);

}

}
