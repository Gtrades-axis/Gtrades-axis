import { auth } from "./firebase.js";

auth.onAuthStateChanged((user)=>{

const login=document.querySelector(".login-btn");
const register=document.querySelector(".register-btn");
const dashboard=document.getElementById("dashboardBtn");

if(user){

login.style.display="none";
register.style.display="none";
dashboard.style.display="inline-flex";

}else{

login.style.display="inline-flex";
register.style.display="inline-flex";
dashboard.style.display="none";

}

});
