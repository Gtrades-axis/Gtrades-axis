// ==========================================================
// GTRADES-AXIS™ – PAYMENT SYSTEM (Complete)
// ==========================================================

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
  onSnapshot,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

// ─── DOM REFS ──────────────────────────────────────────────
const paymentForm = document.getElementById("paymentForm");
const userEmailInput = document.getElementById("userEmail");
const userNameInput = document.getElementById("userName");
const membershipInput = document.getElementById("membershipPlan");
const paymentMethodInput = document.getElementById("paymentMethod");
const transactionIdInput = document.getElementById("transactionId");
const amountInput = document.getElementById("amount");
const notesInput = document.getElementById("notes");
const userIdHidden = document.getElementById("userId");
const proofInput = document.getElementById("paymentProof");
const submitBtn = document.getElementById("submitPayment");
const paymentMessage = document.getElementById("paymentMessage");
const loadingScreen = document.getElementById("loadingScreen");
const successModal = document.getElementById("successModal");
const successClose = document.getElementById("successClose");

const storage = getStorage();

let uploadedProofURL = "";
let currentUser = null;
let userData = null;

// ─── AUTH CHECK & FILL FORM ──────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please login before upgrading.");
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  userIdHidden.value = user.uid;

  // Fill email
  if (userEmailInput) {
    userEmailInput.value = user.email;
    userEmailInput.readOnly = true;
  }

  // Get user profile
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      userData = userSnap.data();
      if (userNameInput) {
        userNameInput.value = userData.name || "";
        userNameInput.readOnly = true;
      }
    }
  } catch (error) {
    console.error("User data error:", error);
  }

  // Check if user already has pending payment
  const hasPending = await checkExistingPayment(user.uid);
  if (hasPending) {
    alert("You already have a pending payment request. Please wait for admin approval.");
    // Optionally disable form
  }

  // Start listening for approval
  listenForPaymentApproval(user.uid);

  console.log("✅ Payment page ready for:", user.email);
});

// ─── CHECK EXISTING PENDING PAYMENT ──────────────────────
async function checkExistingPayment(uid) {
  try {
    const q = query(
      collection(db, "payments"),
      where("userId", "==", uid),
      where("status", "==", "pending"),
      limit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (e) {
    console.error("Check pending error:", e);
    return false;
  }
}

// ─── PROOF UPLOAD ──────────────────────────────────────────
if (proofInput) {
  proofInput.addEventListener("change", async () => {
    const file = proofInput.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG or PDF files are allowed.");
      proofInput.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be below 5MB.");
      proofInput.value = "";
      return;
    }

    if (!currentUser) {
      alert("Please login.");
      return;
    }

    try {
      const fileName = Date.now() + "_" + file.name;
      const storageRef = ref(storage, `paymentProofs/${currentUser.uid}/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, file);
      uploadedProofURL = await getDownloadURL(uploadResult.ref);
      console.log("Proof uploaded:", uploadedProofURL);
      showMessage("Proof uploaded successfully ✅", "success");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Proof upload failed.");
    }
  });
}

// ─── FORM SUBMISSION ──────────────────────────────────────
if (paymentForm) {
  paymentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert("Please login.");
      return;
    }

    // ── Validate ──
    const name = userNameInput.value.trim();
    const email = userEmailInput.value.trim();
    const plan = membershipInput.value;
    const method = paymentMethodInput.value;
    const transactionId = transactionIdInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const notes = notesInput.value.trim();

    if (!name || !email || !plan || !method || !transactionId || !amount) {
      showMessage("Please complete all required fields.", "error");
      return;
    }

    // ── Check duplicate pending ──
    const hasPending = await checkExistingPayment(currentUser.uid);
    if (hasPending) {
      showMessage("You already have a pending payment request. Please wait for admin approval.", "error");
      return;
    }

    // ── Loading ──
    showLoading();
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Submitting...";

    try {
      // ── Save to Firestore ──
      const paymentData = {
        userId: currentUser.uid,
        name,
        email,
        plan,
        paymentMethod: method,
        transactionId,
        amount,
        notes: notes || "",
        proofURL: uploadedProofURL || "",
        status: "pending",
        membership: "pending",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "payments"), paymentData);
      console.log("✅ Payment saved with ID:", docRef.id);

      hideLoading();
      showSuccessModal();

      // Reset form
      paymentForm.reset();
      if (userEmailInput) userEmailInput.value = email;
      if (userNameInput) userNameInput.value = name;
      uploadedProofURL = "";
      if (proofInput) proofInput.value = "";

    } catch (error) {
      console.error("Payment error:", error);
      showMessage("Payment submission failed. Please try again.", "error");
    } finally {
      hideLoading();
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Payment';
    }
  });
}

// ─── LIVE LISTENER FOR PAYMENT APPROVAL ──────────────────
function listenForPaymentApproval(uid) {
  const q = query(
    collection(db, "payments"),
    where("userId", "==", uid),
    where("status", "in", ["approved", "rejected"]),
    limit(1)
  );

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) return;
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log("📡 Payment update:", data.status);

      if (data.status === "approved") {
        // Update user's membership to premium
        updateUserToPremium(uid);
        showSuccessModal();
      } else if (data.status === "rejected") {
        alert("❌ Your payment was rejected. Please contact support.");
      }
    });
  }, (error) => {
    console.error("Listener error:", error);
  });
}

// ─── UPDATE USER TO PREMIUM ──────────────────────────────
async function updateUserToPremium(uid) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      membership: "premium",
      updatedAt: serverTimestamp(),
    });
    console.log("✅ User upgraded to premium!");
  } catch (e) {
    console.error("Failed to upgrade user:", e);
  }
}

// ─── UI HELPERS ────────────────────────────────────────────
function showMessage(msg, type = "info") {
  if (!paymentMessage) return;
  paymentMessage.textContent = msg;
  paymentMessage.className = "payment-message " + type;
  paymentMessage.style.display = "block";
  setTimeout(() => { paymentMessage.style.display = "none"; }, 5000);
}

function showLoading() {
  if (loadingScreen) loadingScreen.classList.add("active");
}

function hideLoading() {
  if (loadingScreen) loadingScreen.classList.remove("active");
}

function showSuccessModal() {
  if (successModal) successModal.classList.add("active");
}

if (successClose) {
  successClose.addEventListener("click", () => {
    successModal.classList.remove("active");
    window.location.href = "dashboard.html";
  });
}

// ─── PLAN SELECTION (copy buttons already in HTML) ─────────
document.querySelectorAll(".select-plan").forEach((btn) => {
  btn.addEventListener("click", () => {
    const plan = btn.dataset.plan;
    const price = btn.dataset.price;
    if (membershipInput) membershipInput.value = plan;
    if (amountInput) amountInput.value = price;
    document.getElementById("selectedPlanName").textContent = plan + " Premium";
    document.getElementById("selectedPlanPrice").textContent = "$" + price;
    document.getElementById("paymentForm").scrollIntoView({ behavior: "smooth" });
  });
});

// Copy buttons
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(btn.dataset.copy);
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => { btn.innerHTML = original; }, 1500);
  });
});

console.log("✅ Payment system fully loaded.");