import { auth } from "./firebase.js";

import {

createUserWithEmailAndPassword,

updateProfile

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

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
alert("Welcome to GTRADES-AXIS™, " + name + "!");

window.location.href = "dashboard.html";

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
