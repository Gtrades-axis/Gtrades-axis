import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const dashboardBtn = document.getElementById("dashboardBtn");

onAuthStateChanged(auth, (user) => {

    if (user) {

        if (loginBtn) loginBtn.style.display = "none";

        if (registerBtn) registerBtn.style.display = "none";

        if (dashboardBtn) dashboardBtn.style.display = "inline-flex";

    } else {

        if (loginBtn) loginBtn.style.display = "inline-flex";

        if (registerBtn) registerBtn.style.display = "inline-flex";

        if (dashboardBtn) dashboardBtn.style.display = "none";

    }

});