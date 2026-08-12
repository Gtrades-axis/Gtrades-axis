// ============================================================
// GTRADES-AXIS™
// PAYMENT SYSTEM
// payment.js
//
// FEATURES
// - USD pricing
// - Live USD -> KES exchange rate
// - M-PESA KES conversion
// - PayPal USD payment
// - Manual payment submission
// - Firebase authentication
// - Firestore payment submission
// ============================================================

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ============================================================
// CONFIG
// ============================================================

// Frankfurter current API
const EXCHANGE_API =
  "https://api.frankfurter.dev/v2/rate/USD/KES";

// Default fallback rate.
// This is ONLY used if the exchange API is temporarily
// unavailable.
const FALLBACK_USD_KES = 129;

// M-PESA details
const MPESA_NUMBER = "0792382641";

// PayPal
const PAYPAL_EMAIL = "davidthuku574@gmail.com";

// ============================================================
// STATE
// ============================================================

let currentUser = null;

let usdKesRate =
  FALLBACK_USD_KES;

let selectedPlan = null;

let exchangeRateLoaded = false;

// ============================================================
// DOM HELPERS
// ============================================================

function $(id) {
  return document.getElementById(id);
}

// ============================================================
// LOG
// ============================================================

console.log(
  "✅ GTRADES-AXIS™ payment.js loaded"
);

// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      console.warn(
        "No authenticated user."
      );

      return;
    }

    currentUser = user;

    console.log(
      "Payment system ready:",
      user.email
    );

    await loadExchangeRate();

    updatePaymentDisplay();

  }
);

// ============================================================
// LOAD USD/KES RATE
// ============================================================

async function loadExchangeRate() {

  try {

    console.log(
      "Fetching USD/KES exchange rate..."
    );

    const response =
      await fetch(
        EXCHANGE_API,
        {
          method: "GET",
          headers: {
            "Accept": "application/json"
          },
          cache: "no-store"
        }
      );

    console.log(
      "Exchange API status:",
      response.status
    );

    if (!response.ok) {

      throw new Error(
        `Exchange API returned ${response.status}`
      );

    }

    const data =
      await response.json();

    console.log(
      "USD/KES API response:",
      data
    );

    if (
      !data ||
      typeof data.rate !== "number" ||
      !Number.isFinite(data.rate) ||
      data.rate <= 0
    ) {

      throw new Error(
        "Invalid USD/KES rate received."
      );

    }

    usdKesRate =
      data.rate;

    exchangeRateLoaded = true;

    console.log(
      `USD/KES rate loaded: ${usdKesRate}`
    );

  } catch (error) {

    console.error(
      "EXCHANGE RATE ERROR:",
      error
    );

    // --------------------------------------------------------
    // FALLBACK
    // --------------------------------------------------------

    usdKesRate =
      FALLBACK_USD_KES;

    exchangeRateLoaded = false;

    console.warn(
      `Using fallback USD/KES rate: ${usdKesRate}`
    );

  }

  updateExchangeRateText();
}

// ============================================================
// UPDATE EXCHANGE RATE TEXT
// ============================================================

function updateExchangeRateText() {

  const elements =
    document.querySelectorAll(
      "[data-usd-kes-rate]"
    );

  elements.forEach(
    (element) => {

      element.textContent =
        `1 USD = ${usdKesRate.toFixed(2)} KES`;

    }
  );

  // Optional IDs
  const rateElement =
    $("exchangeRate");

  if (rateElement) {

    rateElement.textContent =
      `1 USD = ${usdKesRate.toFixed(2)} KES`;

  }

  const rateDisplay =
    $("usdKesRate");

  if (rateDisplay) {

    rateDisplay.textContent =
      usdKesRate.toFixed(2);

  }
}

// ============================================================
// USD -> KES
// ============================================================

function usdToKes(usd) {

  const amount =
    Number(usd);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {

    return 0;

  }

  return (
    amount *
    usdKesRate
  );

}

// ============================================================
// KES -> USD
// ============================================================

function kesToUsd(kes) {

  const amount =
    Number(kes);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {

    return 0;

  }

  return (
    amount /
    usdKesRate
  );

}

// ============================================================
// FORMAT KES
// ============================================================

function formatKES(amount) {

  return new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }
  ).format(amount);

}

// ============================================================
// FORMAT USD
// ============================================================

function formatUSD(amount) {

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(amount);

}

// ============================================================
// PLAN PRICES
// ============================================================
//
// Change these values to your actual USD prices.
//
// Example:
// $50 -> converted to current KES rate
//
// ============================================================

const PLANS = {

  monthly: {
    name: "Monthly Membership",
    usd: 50
  },

  quarterly: {
    name: "Quarterly Membership",
    usd: 120
  },

  yearly: {
    name: "Yearly Membership",
    usd: 400
  }

};

// ============================================================
// UPDATE PAYMENT DISPLAY
// ============================================================

function updatePaymentDisplay() {

  // ----------------------------------------------------------
  // PLAN ELEMENTS
  // ----------------------------------------------------------

  document
    .querySelectorAll(
      "[data-plan]"
    )
    .forEach(
      (element) => {

        const planKey =
          element.dataset.plan;

        const plan =
          PLANS[planKey];

        if (!plan) {
          return;
        }

        const usd =
          plan.usd;

        const kes =
          usdToKes(usd);

        element.dataset.usd =
          usd;

        element.dataset.kes =
          kes;

      }
    );

  // ----------------------------------------------------------
  // PRICE ELEMENTS
  // ----------------------------------------------------------

  document
    .querySelectorAll(
      "[data-usd-price]"
    )
    .forEach(
      (element) => {

        const usd =
          Number(
            element.dataset.usdPrice
          );

        if (!Number.isFinite(usd)) {
          return;
        }

        element.textContent =
          formatUSD(usd);

      }
    );

  document
    .querySelectorAll(
      "[data-kes-price]"
    )
    .forEach(
      (element) => {

        const usd =
          Number(
            element.dataset.kesPrice
          );

        if (!Number.isFinite(usd)) {
          return;
        }

        element.textContent =
          formatKES(
            usdToKes(usd)
          );

      }
    );

}

// ============================================================
// SELECT PLAN
// ============================================================

window.selectPlan =
function selectPlan(planKey) {

  const plan =
    PLANS[planKey];

  if (!plan) {

    console.error(
      "Unknown payment plan:",
      planKey
    );

    return;

  }

  selectedPlan =
    {
      key: planKey,
      ...plan
    };

  console.log(
    "Selected plan:",
    selectedPlan
  );

  const usd =
    plan.usd;

  const kes =
    usdToKes(usd);

  // ----------------------------------------------------------
  // SELECTED PLAN DISPLAY
  // ----------------------------------------------------------

  const selectedPlanElement =
    $("selectedPlan");

  if (selectedPlanElement) {

    selectedPlanElement.textContent =
      plan.name;

  }

  const selectedUSD =
    $("selectedUSD");

  if (selectedUSD) {

    selectedUSD.textContent =
      formatUSD(usd);

  }

  const selectedKES =
    $("selectedKES");

  if (selectedKES) {

    selectedKES.textContent =
      formatKES(kes);

  }

  const paymentAmount =
    $("paymentAmount");

  if (paymentAmount) {

    paymentAmount.value =
      usd;

  }

  // ----------------------------------------------------------
  // HIDDEN INPUTS
  // ----------------------------------------------------------

  const planInput =
    $("planInput");

  if (planInput) {

    planInput.value =
      planKey;

  }

  // ----------------------------------------------------------
  // SHOW KES
  // ----------------------------------------------------------

  const mpesaAmount =
    $("mpesaAmount");

  if (mpesaAmount) {

    mpesaAmount.textContent =
      formatKES(kes);

  }

};

// ============================================================
// UPDATE FROM PAYMENT AMOUNT
// ============================================================

const paymentAmountInput =
  $("paymentAmount");

paymentAmountInput?.addEventListener(
  "input",
  () => {

    const usd =
      Number(
        paymentAmountInput.value
      );

    if (
      !Number.isFinite(usd) ||
      usd <= 0
    ) {
      return;
    }

    const kes =
      usdToKes(usd);

    const kesDisplay =
      $("paymentKES");

    if (kesDisplay) {

      kesDisplay.textContent =
        formatKES(kes);

    }

    const mpesaDisplay =
      $("mpesaAmount");

    if (mpesaDisplay) {

      mpesaDisplay.textContent =
        formatKES(kes);

    }

  }
);

// ============================================================
// M-PESA AMOUNT DISPLAY
// ============================================================

function updateMpesaAmount() {

  if (!selectedPlan) {
    return;
  }

  const kes =
    usdToKes(
      selectedPlan.usd
    );

  const elements =
    document.querySelectorAll(
      "[data-mpesa-amount]"
    );

  elements.forEach(
    (element) => {

      element.textContent =
        formatKES(kes);

    }
  );

}

// ============================================================
// PAYMENT METHOD SELECTION
// ============================================================

window.selectPaymentMethod =
function selectPaymentMethod(method) {

  console.log(
    "Payment method:",
    method
  );

  const mpesaSection =
    $("mpesaPayment");

  const paypalSection =
    $("paypalPayment");

  if (mpesaSection) {

    mpesaSection.style.display =
      method === "mpesa"
        ? "block"
        : "none";

  }

  if (paypalSection) {

    paypalSection.style.display =
      method === "paypal"
        ? "block"
        : "none";

  }

};

// ============================================================
// COPY M-PESA NUMBER
// ============================================================

window.copyMpesaNumber =
async function copyMpesaNumber() {

  try {

    await navigator.clipboard.writeText(
      MPESA_NUMBER
    );

    alert(
      "M-PESA number copied."
    );

  } catch (error) {

    console.error(
      "COPY ERROR:",
      error
    );

    alert(
      `M-PESA Number: ${MPESA_NUMBER}`
    );

  }

};

// ============================================================
// COPY PAYPAL EMAIL
// ============================================================

window.copyPaypalEmail =
async function copyPaypalEmail() {

  try {

    await navigator.clipboard.writeText(
      PAYPAL_EMAIL
    );

    alert(
      "PayPal email copied."
    );

  } catch (error) {

    console.error(
      "COPY ERROR:",
      error
    );

    alert(
      `PayPal: ${PAYPAL_EMAIL}`
    );

  }

};

// ============================================================
// PAYMENT SUBMISSION
// ============================================================

const paymentForm =
  $("paymentForm");

paymentForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (!currentUser) {

      alert(
        "Please log in before submitting payment."
      );

      return;

    }

    if (!selectedPlan) {

      alert(
        "Please select a membership plan."
      );

      return;

    }

    const formData =
      new FormData(
        paymentForm
      );

    const method =
      formData.get(
        "paymentMethod"
      ) ||
      "mpesa";

    const transactionId =
      String(
        formData.get(
          "transactionId"
        ) ||
        ""
      ).trim();

    const senderName =
      String(
        formData.get(
          "senderName"
        ) ||
        ""
      ).trim();

    const phoneNumber =
      String(
        formData.get(
          "phoneNumber"
        ) ||
        ""
      ).trim();

    const notes =
      String(
        formData.get(
          "notes"
        ) ||
        ""
      ).trim();

    if (!transactionId) {

      alert(
        "Please enter your transaction ID."
      );

      return;

    }

    // --------------------------------------------------------
    // CALCULATE
    // --------------------------------------------------------

    const usdAmount =
      Number(
        selectedPlan.usd
      );

    const kesAmount =
      usdToKes(
        usdAmount
      );

    // --------------------------------------------------------
    // BUTTON
    // --------------------------------------------------------

    const submitButton =
      paymentForm.querySelector(
        "button[type='submit']"
      );

    const originalText =
      submitButton?.innerHTML ||
      "Submit Payment";

    if (submitButton) {

      submitButton.disabled = true;

      submitButton.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i>
         Submitting...`;

    }

    try {

      // ------------------------------------------------------
      // FIRESTORE
      // ------------------------------------------------------

      const paymentData = {

        uid:
          currentUser.uid,

        email:
          currentUser.email || "",

        name:
          senderName,

        phone:
          phoneNumber,

        paymentMethod:
          method,

        plan:
          selectedPlan.key,

        planName:
          selectedPlan.name,

        usdAmount:
          usdAmount,

        kesAmount:
          Math.round(
            kesAmount
          ),

        exchangeRate:
          usdKesRate,

        exchangeRateSource:
          "Frankfurter / Central Bank of Kenya",

        exchangeRateDate:
          new Date().toISOString(),

        transactionId:
          transactionId,

        notes:
          notes,

        status:
          "pending",

        createdAt:
          serverTimestamp()

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
        "Payment submitted:",
        paymentRef.id
      );

      alert(
        "Payment submitted successfully. Your payment is pending admin verification."
      );

      paymentForm.reset();

    } catch (error) {

      console.error(
        "PAYMENT SUBMISSION ERROR:",
        error
      );

      alert(
        error?.message ||
        "Unable to submit payment."
      );

    } finally {

      if (submitButton) {

        submitButton.disabled =
          false;

        submitButton.innerHTML =
          originalText;

      }

    }

  }
);

// ============================================================
// AUTO SELECT DEFAULT PLAN
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    // If your page has a default plan
    // you can change this.
    //
    // Example:
    // selectPlan("monthly");

    updateExchangeRateText();

    updatePaymentDisplay();

    updateMpesaAmount();

  }
);

// ============================================================
// DEBUG HELPERS
// ============================================================

window.GTRADES_PAYMENT = {

  getRate() {
    return usdKesRate;
  },

  usdToKes(amount) {
    return usdToKes(amount);
  },

  kesToUsd(amount) {
    return kesToUsd(amount);
  },

  formatKES(amount) {
    return formatKES(amount);
  },

  formatUSD(amount) {
    return formatUSD(amount);
  },

  reloadRate() {
    return loadExchangeRate();
  }

};

// ============================================================
// FINAL
// ============================================================

console.log(
  "💳 GTRADES-AXIS™ Payment System Ready"
);

console.log(
  "💱 Exchange API:",
  EXCHANGE_API
);