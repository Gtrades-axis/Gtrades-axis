// ============================================================
// GTRADES-AXIS™
// PAYMENT SYSTEM
//
// Firebase:
// - Authentication
// - Firestore payment metadata
//
// Cloudflare:
// - R2 payment proof storage
//
// Plans:
// - Monthly   = $50
// - Lifetime  = $200
//
// M-PESA:
// - Automatically converted USD -> KES
//
// PayPal:
// - Remains USD
// ============================================================

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
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
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


// ============================================================
// CONFIGURATION
// ============================================================

const R2_WORKER_URL =
  "https://r2-uploader.davidthuku574.workers.dev";

const MPESA_NUMBER =
  "0712416214";

const PLANS = {
  Monthly: 50,
  Lifetime: 200
};


// ============================================================
// DOM
// ============================================================

const paymentForm =
  document.getElementById("paymentForm");

const userIdInput =
  document.getElementById("userId");

const userNameInput =
  document.getElementById("userName");

const userEmailInput =
  document.getElementById("userEmail");

const membershipInput =
  document.getElementById("membershipPlan");

const paymentMethodInput =
  document.getElementById("paymentMethod");

const transactionIdInput =
  document.getElementById("transactionId");

const amountDisplay =
  document.getElementById("amountDisplay");

const notesInput =
  document.getElementById("notes");

const proofInput =
  document.getElementById("paymentProof");

const submitBtn =
  document.getElementById("submitPayment");

const paymentMessage =
  document.getElementById("paymentMessage");

const loadingScreen =
  document.getElementById("loadingScreen");

const successModal =
  document.getElementById("successModal");

const successClose =
  document.getElementById("successClose");

const currencyBox =
  document.getElementById("currencyBox");

const usdAmount =
  document.getElementById("usdAmount");

const rateDisplay =
  document.getElementById("rateDisplay");

const rateTime =
  document.getElementById("rateTime");

const kesAmount =
  document.getElementById("kesAmount");

const mpesaAmount =
  document.getElementById("mpesaAmount");

const mpesaDetails =
  document.getElementById("mpesaDetails");

const exchangeRateInput =
  document.getElementById("exchangeRate");

const selectedPlanName =
  document.getElementById("selectedPlanName");

const selectedPlanPrice =
  document.getElementById("selectedPlanPrice");


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let currentUserData = null;

let currentExchangeRate = null;

let uploadedProof = null;

let rateFetchedAt = null;


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    alert("Please login before upgrading.");

    window.location.href = "login.html";

    return;
  }

  currentUser = user;

  userIdInput.value = user.uid;

  userEmailInput.value =
    user.email || "";


  try {

    const userRef =
      doc(db, "users", user.uid);

    const userSnap =
      await getDoc(userRef);

    if (userSnap.exists()) {

      currentUserData =
        userSnap.data();

      userNameInput.value =
        currentUserData.name ||
        currentUserData.fullName ||
        "";

    }

  } catch (error) {

    console.error(
      "USER PROFILE ERROR:",
      error
    );

  }


  const existing =
    await checkExistingPendingPayment(
      user.uid
    );

  if (existing) {

    showMessage(
      "You already have a pending payment request. Please wait for administrator approval.",
      "error"
    );

    submitBtn.disabled = true;

  }


  listenForApproval(user.uid);

  console.log(
    "✅ Payment system ready:",
    user.email
  );

});


// ============================================================
// CHECK PENDING PAYMENT
// ============================================================

async function checkExistingPendingPayment(uid) {

  try {

    const q = query(

      collection(db, "payments"),

      where("userId", "==", uid),

      where("status", "==", "pending"),

      limit(1)

    );

    const snapshot =
      await getDocs(q);

    return !snapshot.empty;

  } catch (error) {

    console.error(
      "PENDING PAYMENT CHECK:",
      error
    );

    return false;
  }
}


// ============================================================
// PLAN SELECTION
// ============================================================

document
  .querySelectorAll(".select-plan")
  .forEach((button) => {

    button.addEventListener(
      "click",
      async () => {

        const plan =
          button.dataset.plan;

        const price =
          Number(button.dataset.price);


        membershipInput.value =
          plan;


        selectedPlanName.textContent =
          plan === "Monthly"
            ? "Premium Monthly"
            : "Lifetime Premium";


        selectedPlanPrice.textContent =
          `$${price}`;


        await updatePaymentDisplay();


        document
          .getElementById("paymentForm")
          .scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

      }
    );

  });


// ============================================================
// PAYMENT METHOD CHANGE
// ============================================================

paymentMethodInput.addEventListener(
  "change",
  async () => {

    await updatePaymentDisplay();

  }
);


// ============================================================
// PLAN CHANGE
// ============================================================

membershipInput.addEventListener(
  "change",
  async () => {

    const plan =
      membershipInput.value;

    if (!plan) {

      selectedPlanName.textContent =
        "No Plan Selected";

      selectedPlanPrice.textContent =
        "$0";

      currencyBox.classList.remove(
        "active"
      );

      return;
    }


    const price =
      PLANS[plan];


    selectedPlanName.textContent =
      plan === "Monthly"
        ? "Premium Monthly"
        : "Lifetime Premium";


    selectedPlanPrice.textContent =
      `$${price}`;


    await updatePaymentDisplay();

  }
);


// ============================================================
// UPDATE PAYMENT DISPLAY
// ============================================================

async function updatePaymentDisplay() {

  const plan =
    membershipInput.value;

  const method =
    paymentMethodInput.value;


  if (!plan || !method) {

    currencyBox.classList.remove(
      "active"
    );

    return;
  }


  const usd =
    PLANS[plan];


  currencyBox.classList.add(
    "active"
  );


  usdAmount.textContent =
    `$${usd.toFixed(2)}`;


  // ----------------------------------------------------------
  // PAYPAL
  // ----------------------------------------------------------

  if (method === "PayPal") {

    rateDisplay.textContent =
      "Not required";

    kesAmount.textContent =
      "USD payment";

    mpesaDetails.classList.remove(
      "active"
    );

    amountDisplay.value =
      `$${usd.toFixed(2)} USD`;

    rateTime.textContent =
      "Send the exact USD amount to the PayPal account.";

    currentExchangeRate = null;

    exchangeRateInput.value = "";

    return;
  }


  // ----------------------------------------------------------
  // M-PESA
  // ----------------------------------------------------------

  if (method === "Mpesa") {

    mpesaDetails.classList.add(
      "active"
    );


    rateDisplay.textContent =
      "Loading exchange rate...";


    kesAmount.textContent =
      "Calculating...";


    amountDisplay.value =
      "Calculating KES amount...";


    try {

      const rate =
        await getUsdKesRate();


      currentExchangeRate =
        rate;

      exchangeRateInput.value =
        rate;


      const kes =
        Math.round(usd * rate);


      kesAmount.textContent =
        formatKES(kes);


      mpesaAmount.textContent =
        formatKES(kes);


      amountDisplay.value =
        `${formatKES(kes)} KES`;


      rateDisplay.textContent =
        `1 USD = KSh ${rate.toFixed(4)}`;


      rateTime.textContent =
        `Rate fetched ${rateFetchedAt.toLocaleString()}. The exact rate and KES amount will be saved with your payment request.`;

    } catch (error) {

      console.error(
        "EXCHANGE RATE ERROR:",
        error
      );


      rateDisplay.textContent =
        "Unable to load rate";


      kesAmount.textContent =
        "Unavailable";


      amountDisplay.value =
        "Exchange rate unavailable";


      rateTime.textContent =
        "Please refresh the page and try again.";

    }

  }

}


// ============================================================
// USD -> KES EXCHANGE RATE
// ============================================================
//
// We use Frankfurter's public FX API.
//
// The rate is fetched before submission and then saved
// permanently inside Firestore with the payment.
// ============================================================

async function getUsdKesRate() {

  const response =
    await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=KES",
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      "Exchange rate request failed."
    );

  }


  const data =
    await response.json();


  const rate =
    Number(data?.rates?.KES);


  if (
    !Number.isFinite(rate) ||
    rate <= 0
  ) {

    throw new Error(
      "Invalid USD/KES exchange rate."
    );

  }


  rateFetchedAt =
    new Date();


  return rate;
}


// ============================================================
// FORMAT KES
// ============================================================

function formatKES(amount) {

  return (
    "KSh " +
    Number(amount).toLocaleString(
      "en-KE"
    )
  );

}


// ============================================================
// PAYMENT PROOF VALIDATION
// ============================================================

proofInput.addEventListener(
  "change",
  () => {

    uploadedProof =
      proofInput.files[0] || null;


    if (!uploadedProof) {

      return;
    }


    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf"
    ];


    if (
      !allowedTypes.includes(
        uploadedProof.type
      )
    ) {

      alert(
        "Only JPG, PNG or PDF files are allowed."
      );

      proofInput.value = "";

      uploadedProof = null;

      return;
    }


    if (
      uploadedProof.size >
      5 * 1024 * 1024
    ) {

      alert(
        "Payment proof must be 5MB or smaller."
      );

      proofInput.value = "";

      uploadedProof = null;

      return;
    }


    showMessage(
      "Payment proof selected successfully.",
      "success"
    );

  }
);


// ============================================================
// UPLOAD PAYMENT PROOF TO R2
// ============================================================

async function uploadProofToR2(file) {

  if (!file || !currentUser) {

    return {
      key: "",
      url: ""
    };

  }


  const extension =
    getFileExtension(file.name);


  const uniqueName =
    `${Date.now()}-${crypto.randomUUID()}${extension}`;


  const key =
    `payment-proofs/${currentUser.uid}/${uniqueName}`;


  const formData =
    new FormData();


  formData.append(
    "file",
    file
  );


  formData.append(
    "key",
    key
  );


  formData.append(
    "contentType",
    file.type
  );


  const response =
    await fetch(
      `${R2_WORKER_URL}/upload`,
      {
        method: "POST",
        body: formData
      }
    );


  if (!response.ok) {

    throw new Error(
      `R2 upload failed (${response.status})`
    );

  }


  const result =
    await response.json();


  if (!result.success) {

    throw new Error(
      result.error ||
      "R2 upload failed."
    );

  }


  return {
    key: result.key,
    url: result.url
  };

}


// ============================================================
// FILE EXTENSION
// ============================================================

function getFileExtension(filename) {

  const index =
    filename.lastIndexOf(".");


  if (index === -1) {

    return "";

  }


  return filename
    .substring(index)
    .toLowerCase();

}


// ============================================================
// FORM SUBMISSION
// ============================================================

paymentForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (!currentUser) {

      showMessage(
        "Please login first.",
        "error"
      );

      return;

    }


    const name =
      userNameInput.value.trim();

    const email =
      userEmailInput.value.trim();

    const plan =
      membershipInput.value;

    const method =
      paymentMethodInput.value;

    const transactionId =
      transactionIdInput.value.trim();

    const notes =
      notesInput.value.trim();


    if (
      !name ||
      !email ||
      !plan ||
      !method ||
      !transactionId
    ) {

      showMessage(
        "Please complete all required fields.",
        "error"
      );

      return;

    }


    if (!PLANS[plan]) {

      showMessage(
        "Invalid membership plan.",
        "error"
      );

      return;

    }


    // --------------------------------------------------------
    // CHECK PENDING REQUEST
    // --------------------------------------------------------

    const pending =
      await checkExistingPendingPayment(
        currentUser.uid
      );


    if (pending) {

      showMessage(
        "You already have a pending payment request.",
        "error"
      );

      return;

    }


    // --------------------------------------------------------
    // DETERMINE AMOUNTS
    // --------------------------------------------------------

    const amountUSD =
      PLANS[plan];

    let amountKES = null;

    let exchangeRate = null;


    if (method === "Mpesa") {

      // Get a fresh rate at submission.
      // This ensures the saved rate is the rate
      // associated with this payment.

      try {

        exchangeRate =
          await getUsdKesRate();

      } catch (error) {

        showMessage(
          "Could not obtain the current USD/KES exchange rate. Please try again.",
          "error"
        );

        return;

      }


      amountKES =
        Math.round(
          amountUSD * exchangeRate
        );

    }


    // --------------------------------------------------------
    // VERIFY PAYMENT AMOUNT DISPLAY
    // --------------------------------------------------------

    if (method === "Mpesa") {

      amountDisplay.value =
        `${formatKES(amountKES)} KES`;

    } else {

      amountDisplay.value =
        `$${amountUSD.toFixed(2)} USD`;

    }


    // --------------------------------------------------------
    // LOADING
    // --------------------------------------------------------

    showLoading();

    submitBtn.disabled = true;

    submitBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';


    try {

      // ------------------------------------------------------
      // UPLOAD PROOF TO R2
      // ------------------------------------------------------

      let proofKey = "";

      let proofURL = "";


      if (uploadedProof) {

        const proof =
          await uploadProofToR2(
            uploadedProof
          );


        proofKey =
          proof.key;

        proofURL =
          proof.url;

      }


      // ------------------------------------------------------
      // FIRESTORE PAYMENT RECORD
      // ------------------------------------------------------

      const paymentData = {

        userId:
          currentUser.uid,

        name,

        email,

        plan,

        paymentMethod:
          method,

        transactionId,

        amountUSD,

        amountKES,

        exchangeRate,

        currency:
          method === "Mpesa"
            ? "KES"
            : "USD",

        proofKey,

        proofURL,

        notes,

        status:
          "pending",

        membership:
          "pending",

        createdAt:
          serverTimestamp(),

        rateSource:
          method === "Mpesa"
            ? "Frankfurter USD/KES"
            : null

      };


      const paymentRef =
        await addDoc(

          collection(
            db,
            "payments"
          ),

          paymentData

        );


      console.log(
        "✅ Payment submitted:",
        paymentRef.id
      );


      hideLoading();

      showSuccessModal();


      // Reset only user-editable fields.
      paymentForm.reset();


      userIdInput.value =
        currentUser.uid;

      userEmailInput.value =
        email;

      userNameInput.value =
        name;


      uploadedProof = null;

      proofInput.value = "";

      currentExchangeRate = null;

      exchangeRateInput.value = "";


    } catch (error) {

      console.error(
        "PAYMENT SUBMISSION ERROR:",
        error
      );


      hideLoading();


      showMessage(
        error?.message ||
        "Payment submission failed. Please try again.",
        "error"
      );

    } finally {

      submitBtn.disabled = false;

      submitBtn.innerHTML =
        '<i class="fa-solid fa-paper-plane"></i> Submit Payment';

    }

  }
);


// ============================================================
// LISTEN FOR ADMIN APPROVAL
// ============================================================

function listenForApproval(uid) {

  const q =
    query(

      collection(
        db,
        "payments"
      ),

      where(
        "userId",
        "==",
        uid
      ),

      where(
        "status",
        "in",
        [
          "approved",
          "rejected"
        ]
      ),

      limit(1)

    );


  onSnapshot(
    q,
    (snapshot) => {

      if (snapshot.empty) {

        return;

      }


      snapshot.forEach(
        (paymentDoc) => {

          const payment =
            paymentDoc.data();


          if (
            payment.status ===
            "approved"
          ) {

            showSuccessModal();

          }


          if (
            payment.status ===
            "rejected"
          ) {

            showMessage(
              "Your payment was rejected. Please contact support.",
              "error"
            );

          }

        }
      );

    },
    (error) => {

      console.error(
        "PAYMENT APPROVAL LISTENER:",
        error
      );

    }
  );

}


// ============================================================
// COPY BUTTONS
// ============================================================

document
  .querySelectorAll(".copy-btn")
  .forEach((button) => {

    button.addEventListener(
      "click",
      async () => {

        try {

          await navigator.clipboard.writeText(
            button.dataset.copy
          );


          const original =
            button.innerHTML;


          button.innerHTML =
            '<i class="fa-solid fa-check"></i>';


          setTimeout(
            () => {

              button.innerHTML =
                original;

            },
            1500
          );

        } catch (error) {

          console.error(
            "COPY ERROR:",
            error
          );

        }

      }
    );

  });


// ============================================================
// UI
// ============================================================

function showMessage(
  message,
  type = "info"
) {

  paymentMessage.textContent =
    message;

  paymentMessage.className =
    `payment-message ${type}`;

  paymentMessage.style.display =
    "block";


  setTimeout(
    () => {

      paymentMessage.style.display =
        "none";

    },
    6000
  );

}


function showLoading() {

  loadingScreen.classList.add(
    "active"
  );

}


function hideLoading() {

  loadingScreen.classList.remove(
    "active"
  );

}


function showSuccessModal() {

  successModal.classList.add(
    "active"
  );

}


successClose.addEventListener(
  "click",
  () => {

    successModal.classList.remove(
      "active"
    );

    window.location.href =
      "dashboard.html";

  }
);


console.log(
  "✅ GTRADES-AXIS payment.js loaded."
);