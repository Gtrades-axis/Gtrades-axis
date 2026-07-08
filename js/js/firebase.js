import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZmsLm64PyEL9jifi32bpgvWfhluIWCZM",
  authDomain: "gtrades-axis.firebaseapp.com",
  projectId: "gtrades-axis",
  storageBucket: "gtrades-axis.firebasestorage.app",
  messagingSenderId: "111456545888",
  appId: "1:111456545888:web:f0526c142d7ea5e22fe705"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
