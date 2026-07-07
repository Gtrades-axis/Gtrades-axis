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

});
