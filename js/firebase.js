// ─── FIREBASE CONFIG ────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export for other modules
export { auth, db };

console.log("🔥 Firebase initialized with GTRADES-AXIS project");