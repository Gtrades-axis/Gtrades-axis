import { auth } from "./firebase.js";

import {

signInWithEmailAndPassword,

GoogleAuthProvider,

signInWithPopup

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const form = document.getElementById("loginForm");

const googleBtn = document.getElementById("googleLogin");

form.addEventListener("submit", loginUser);

googleBtn.addEventListener("click", googleLogin);

async function loginUser(e){

e.preventDefault();

const email = document.getElementById("email").value.trim();

const password = document.getElementById("password").value;

try{

const userCredential = await signInWithEmailAndPassword(

auth,

email,

password

);

const user = userCredential.user;
 import { auth } from "./firebase.js";

import {

signInWithEmailAndPassword,

GoogleAuthProvider,

signInWithPopup

} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const form = document.getElementById("loginForm");

const googleBtn = document.getElementById("googleLogin");

form.addEventListener("submit", loginUser);

googleBtn.addEventListener("click", googleLogin);

async function loginUser(e){

e.preventDefault();

const email = document.getElementById("email").value.trim();

const password = document.getElementById("password").value;

try{

const userCredential = await signInWithEmailAndPassword(

auth,

email,

password

);

const user = userCredential.user; 
