import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// ─── YOUR FIREBASE CONFIG (exact from your console) ───
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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
