import { auth, db } from "./firebase.js";

import {

createUserWithEmailAndPassword,

updateProfile

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {

doc,

setDoc,

serverTimestamp

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const form = document.getElementById("registerForm");

form.addEventListener("submit", registerUser);

async function registerUser(e){

e.preventDefault();

const name = document.getElementById("name").value.trim();

const email = document.getElementById("email").value.trim();

const password = document.getElementById("password").value;

const confirmPassword = document.getElementById("confirmPassword").value;

if(password !== confirmPassword){

alert("Passwords do not match.");

return;

}

if(password.length < 6){

alert("Password must be at least 6 characters.");

return;

}

try{

const userCredential = await createUserWithEmailAndPassword(

auth,

email,

password

);

const user = userCredential.user;

await updateProfile(user,{

displayName:name

});
 await setDoc(doc(db,"users",user.uid),{

name:name,

email:email,

role:"student",

active:false,

createdAt:serverTimestamp()

}); 
alert(
"Account created successfully!\n\nYour account is awaiting administrator approval."
);

window.location.href="login.html";
}catch(error){

let message = "";

switch(error.code){

case "auth/email-already-in-use":

message = "An account with this email already exists.";

break;

case "auth/invalid-email":

message = "Please enter a valid email address.";

break;

case "auth/weak-password":

message = "Password should be at least 6 characters.";

break;

default:

message = error.message;

}

alert(message);

}

}
