import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

async function loadDashboardStats() {

    const snapshot = await getDocs(collection(db, "users"));

    let total = 0;
    let pending = 0;
    let premium = 0;
    let admins = 0;

    snapshot.forEach(doc => {

        total++;

        const user = doc.data();

        if (user.active === false)
            pending++;

        if (user.premium === true)
            premium++;

        if (user.role === "admin")
            admins++;

    });

    document.getElementById("totalMembers").innerHTML = total;
    document.getElementById("pendingMembers").innerHTML = pending;
    document.getElementById("premiumMembers").innerHTML = premium;
    document.getElementById("adminMembers").innerHTML = admins;

}

loadDashboardStats();