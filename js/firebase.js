// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 YOUR REAL CONFIG (copied from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBZmsLm64PyEL9jifi32bpgvWfhluIWCZM",
  authDomain: "gtrades-axis.firebaseapp.com",
  databaseURL: "https://gtrades-axis-default-rtdb.firebaseio.com",
  projectId: "gtrades-axis",
  storageBucket: "gtrades-axis.firebasestorage.app",
  messagingSenderId: "111456545888",
  appId: "1:111456545888:web:f0526c142d7ea5e22fe705",
  measurementId: "G-FGJ8N1DDPD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };