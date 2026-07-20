import { auth } from "./firebase.js";

auth.onAuthStateChanged((user) => {

    const login = document.getElementById("loginBtn");
    const dashboard = document.getElementById("dashboardBtn");

    if (user) {
        login.style.display = "none";
        dashboard.style.display = "inline-flex";
    } else {
        login.style.display = "inline-flex";
        dashboard.style.display = "none";
    }
// In navbar.js (or navbarAuth.js)
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";

onAuthStateChanged(auth, (user) => {
  const dashboardBtn = document.getElementById('dashboardBtn');
  const loginBtn = document.getElementById('loginBtn');
  
  if (dashboardBtn) {
    dashboardBtn.style.display = user ? 'inline-block' : 'none';
  }
  if (loginBtn) {
    loginBtn.style.display = user ? 'none' : 'inline-block';
  }
});
});
