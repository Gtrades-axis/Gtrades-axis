// ============================================================
// GTRADES-AXIS™
// PAYMENT SYSTEM
// js/payment.js
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
    getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ============================================================
// CONFIGURATION
// ============================================================

const MONTHLY_PRICE = 50;
const LIFETIME_PRICE = 200;

const MPESA_NUMBER = "0712416214";
const MPESA_NAME = "David Thuku";

const RATE_API =
    "https://api.frankfurter.dev/v2/rate/USD/KES";

// ============================================================
// DOM
// ============================================================

const paymentForm =
    document.getElementById("paymentForm");

const userId =
    document.getElementById("userId");

const userName =
    document.getElementById("userName");

const userEmail =
    document.getElementById("userEmail");

const nameStatus =
    document.getElementById("nameStatus");

const exchangeRate =
    document.getElementById("exchangeRate");

const membershipPlan =
    document.getElementById("membershipPlan");

const paymentMethod =
    document.getElementById("paymentMethod");

const currencyBox =
    document.getElementById("currencyBox");

const usdAmount =
    document.getElementById("usdAmount");

const rateDisplay =
    document.getElementById("rateDisplay");

const kesAmount =
    document.getElementById("kesAmount");

const rateTime =
    document.getElementById("rateTime");

const mpesaDetails =
    document.getElementById("mpesaDetails");

const mpesaAmount =
    document.getElementById("mpesaAmount");

const amountDisplay =
    document.getElementById("amountDisplay");

const transactionId =
    document.getElementById("transactionId");

const paymentProof =
    document.getElementById("paymentProof");

const notes =
    document.getElementById("notes");

const selectedPlanName =
    document.getElementById("selectedPlanName");

const selectedPlanPrice =
    document.getElementById("selectedPlanPrice");

const submitPayment =
    document.getElementById("submitPayment");

const paymentMessage =
    document.getElementById("paymentMessage");

const successModal =
    document.getElementById("successModal");

const successClose =
    document.getElementById("successClose");

const loadingScreen =
    document.getElementById("loadingScreen");

// ============================================================
// STATE
// ============================================================

let currentUser = null;
let currentExchangeRate = null;
let currentUserName = "";
let submitting = false;

// ============================================================
// HELPERS
// ============================================================

function showMessage(message, type = "error") {

    if (!paymentMessage) return;

    paymentMessage.textContent = message;

    paymentMessage.className =
        "payment-message " + type;
}

function clearMessage() {

    if (!paymentMessage) return;

    paymentMessage.textContent = "";

    paymentMessage.className =
        "payment-message";
}

function showLoading(show = true) {

    if (!loadingScreen) return;

    if (show) {
        loadingScreen.classList.add("active");
    } else {
        loadingScreen.classList.remove("active");
    }
}

function getPrice(plan) {

    if (plan === "Monthly") {
        return MONTHLY_PRICE;
    }

    if (plan === "Lifetime") {
        return LIFETIME_PRICE;
    }

    return 0;
}

function formatKES(value) {

    return "KSh " +
        Number(value).toLocaleString(
            "en-KE",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }
        );
}

function normalizeEmail(email) {

    return String(email || "")
        .trim()
        .toLowerCase();
}

// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            currentUser = null;

            if (userId) {
                userId.value = "";
            }

            if (userName) {
                userName.value = "";
            }

            if (userEmail) {
                userEmail.value = "";
            }

            if (nameStatus) {
                nameStatus.textContent =
                    "Please log in to continue.";

                nameStatus.style.color =
                    "#6a7490";
            }

            if (submitPayment) {
                submitPayment.disabled = true;
            }

            showMessage(
                "You must be logged in before submitting a payment.",
                "error"
            );

            return;
        }

        currentUser = user;

        // ----------------------------------------------------
        // UID
        // ----------------------------------------------------

        if (userId) {
            userId.value = user.uid;
        }

        // ----------------------------------------------------
        // EMAIL
        // ----------------------------------------------------

        let email =
            user.email || "";

        if (userEmail) {
            userEmail.value = email;
        }

        // ----------------------------------------------------
        // LOAD FIRESTORE PROFILE
        // ----------------------------------------------------

        let fullName = "";

        try {

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );

            const userSnap =
                await getDoc(userRef);

            if (userSnap.exists()) {

                const data =
                    userSnap.data();

                fullName =
                    data.name ||
                    data.fullName ||
                    data.displayName ||
                    "";

                if (!email && data.email) {

                    email =
                        data.email;

                    if (userEmail) {
                        userEmail.value =
                            email;
                    }
                }
            }

        } catch (error) {

            console.error(
                "Error loading user profile:",
                error
            );
        }

        // ----------------------------------------------------
        // AUTH DISPLAY NAME FALLBACK
        // ----------------------------------------------------

        if (!fullName) {

            fullName =
                user.displayName || "";
        }

        // ----------------------------------------------------
        // EMAIL NAME FALLBACK
        // ----------------------------------------------------

        if (!fullName) {

            fullName =
                email
                    ? email.split("@")[0]
                    : "GTRADES-AXIS Member";
        }

        currentUserName =
            fullName;

        if (userName) {
            userName.value =
                fullName;
        }

        if (userEmail) {
            userEmail.value =
                email;
        }

        if (nameStatus) {

            nameStatus.textContent =
                "Account information loaded.";

            nameStatus.style.color =
                "#00c897";
        }

        if (submitPayment) {
            submitPayment.disabled = false;
        }

        console.log(
            "Authenticated payment user:",
            {
                uid: user.uid,
                email: email,
                name: fullName
            }
        );
    }
);

// ============================================================
// EXCHANGE RATE
// ============================================================

async function loadExchangeRate() {

    if (rateDisplay) {
        rateDisplay.textContent =
            "Loading...";
    }

    if (rateTime) {
        rateTime.textContent =
            "Loading current USD/KES exchange rate...";
    }

    try {

        const response =
            await fetch(
                RATE_API,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                "Exchange-rate request failed."
            );
        }

        const data =
            await response.json();

        if (
            !data ||
            typeof data.rate !== "number"
        ) {

            throw new Error(
                "Invalid exchange-rate response."
            );
        }

        currentExchangeRate =
            Number(data.rate);

        if (exchangeRate) {
            exchangeRate.value =
                currentExchangeRate;
        }

        if (rateDisplay) {

            rateDisplay.textContent =
                "1 USD = " +
                currentExchangeRate.toFixed(2) +
                " KES";
        }

        if (rateTime) {

            rateTime.textContent =
                "Current USD/KES exchange rate. The rate used will be recorded with your payment.";
        }

        updatePaymentDisplay();

        console.log(
            "USD/KES exchange rate:",
            currentExchangeRate
        );

        return currentExchangeRate;

    } catch (error) {

        console.error(
            "Exchange-rate error:",
            error
        );

        currentExchangeRate =
            null;

        if (exchangeRate) {
            exchangeRate.value = "";
        }

        if (rateDisplay) {

            rateDisplay.textContent =
                "Unavailable";
        }

        if (rateTime) {

            rateTime.textContent =
                "Live exchange rate is temporarily unavailable. Please try again shortly.";
        }

        updatePaymentDisplay();

        return null;
    }
}

// ============================================================
// PAYMENT DISPLAY
// ============================================================

function updatePaymentDisplay() {

    const plan =
        membershipPlan?.value || "";

    const method =
        paymentMethod?.value || "";

    const price =
        getPrice(plan);

    // --------------------------------------------------------
    // NO PLAN
    // --------------------------------------------------------

    if (!price) {

        if (currencyBox) {
            currencyBox.classList.remove("active");
        }

        if (selectedPlanName) {
            selectedPlanName.textContent =
                "No Plan Selected";
        }

        if (selectedPlanPrice) {
            selectedPlanPrice.textContent =
                "$0";
        }

        if (usdAmount) {
            usdAmount.textContent =
                "$0";
        }

        if (kesAmount) {
            kesAmount.textContent =
                "KSh 0";
        }

        if (mpesaAmount) {
            mpesaAmount.textContent =
                "KSh 0";
        }

        if (amountDisplay) {
            amountDisplay.value = "";
        }

        if (mpesaDetails) {
            mpesaDetails.classList.remove("active");
        }

        return;
    }

    // --------------------------------------------------------
    // SHOW CURRENCY BOX
    // --------------------------------------------------------

    if (currencyBox) {
        currencyBox.classList.add("active");
    }

    // --------------------------------------------------------
    // PLAN NAME
    // --------------------------------------------------------

    if (plan === "Monthly") {

        selectedPlanName.textContent =
            "Premium Monthly";

    } else if (plan === "Lifetime") {

        selectedPlanName.textContent =
            "Lifetime Premium";
    }

    if (selectedPlanPrice) {

        selectedPlanPrice.textContent =
            "$" + price;
    }

    if (usdAmount) {

        usdAmount.textContent =
            "$" + price;
    }

    // --------------------------------------------------------
    // M-PESA
    // --------------------------------------------------------

    if (method === "Mpesa") {

        if (mpesaDetails) {
            mpesaDetails.classList.add("active");
        }

        if (!currentExchangeRate) {

            if (amountDisplay) {
                amountDisplay.value =
                    "Exchange rate unavailable";
            }

            if (kesAmount) {
                kesAmount.textContent =
                    "Unavailable";
            }

            if (mpesaAmount) {
                mpesaAmount.textContent =
                    "Unavailable";
            }

            return;
        }

        const kes =
            Math.round(
                price *
                currentExchangeRate
            );

        if (kesAmount) {

            kesAmount.textContent =
                formatKES(kes);
        }

        if (mpesaAmount) {

            mpesaAmount.textContent =
                formatKES(kes);
        }

        // ----------------------------------------------------
        // AMOUNT PAID IS AUTOMATIC + LOCKED
        // ----------------------------------------------------

        if (amountDisplay) {

            amountDisplay.value =
                formatKES(kes);
        }

        return;
    }

    // --------------------------------------------------------
    // PAYPAL
    // --------------------------------------------------------

    if (method === "PayPal") {

        if (mpesaDetails) {
            mpesaDetails.classList.remove("active");
        }

        // ----------------------------------------------------
        // PAYPAL ALWAYS REMAINS USD
        // ----------------------------------------------------

        if (amountDisplay) {

            amountDisplay.value =
                "$" + price;
        }

        // Show KES equivalent only as information
        if (currentExchangeRate) {

            const kes =
                Math.round(
                    price *
                    currentExchangeRate
                );

            if (kesAmount) {

                kesAmount.textContent =
                    formatKES(kes);
            }
        }

        return;
    }

    // --------------------------------------------------------
    // METHOD NOT SELECTED
    // --------------------------------------------------------

    if (amountDisplay) {
        amountDisplay.value = "";
    }

    if (mpesaDetails) {
        mpesaDetails.classList.remove("active");
    }
}

// ============================================================
// CHECK EXISTING PAYMENTS
// ============================================================

async function checkExistingPayments(
    uid,
    selectedPlan
) {

    try {

        const paymentsRef =
            collection(
                db,
                "payments"
            );

        const paymentQuery =
            query(
                paymentsRef,
                where(
                    "userId",
                    "==",
                    uid
                )
            );

        const snapshot =
            await getDocs(
                paymentQuery
            );

        let activeMonthly = false;
        let activeLifetime = false;

        let pendingMonthly = false;
        let pendingLifetime = false;

        let rejectedFound = false;

        snapshot.forEach(
            (paymentDoc) => {

                const data =
                    paymentDoc.data();

                const status =
                    String(
                        data.status || ""
                    ).toLowerCase();

                const plan =
                    data.plan;

                // ------------------------------------------------
                // REJECTED = CAN TRY AGAIN
                // ------------------------------------------------

                if (
                    status === "rejected" ||
                    status === "declined" ||
                    status === "failed"
                ) {

                    rejectedFound = true;

                    return;
                }

                // ------------------------------------------------
                // APPROVED
                // ------------------------------------------------

                if (
                    status === "approved" ||
                    status === "paid" ||
                    status === "completed"
                ) {

                    if (
                        plan === "Lifetime"
                    ) {
                        activeLifetime = true;
                    }

                    if (
                        plan === "Monthly"
                    ) {
                        activeMonthly = true;
                    }
                }

                // ------------------------------------------------
                // PENDING
                // ------------------------------------------------

                if (
                    status === "pending"
                ) {

                    if (
                        plan === "Lifetime"
                    ) {
                        pendingLifetime = true;
                    }

                    if (
                        plan === "Monthly"
                    ) {
                        pendingMonthly = true;
                    }
                }
            }
        );

        // --------------------------------------------------------
        // LIFETIME ALREADY ACTIVE
        // --------------------------------------------------------

        if (activeLifetime) {

            return {
                allowed: false,
                message:
                    "You already have Lifetime Premium. No additional payment is required."
            };
        }

        // --------------------------------------------------------
        // LIFETIME PENDING
        // --------------------------------------------------------

        if (
            selectedPlan === "Lifetime" &&
            pendingLifetime
        ) {

            return {
                allowed: false,
                message:
                    "You already have a Lifetime Premium payment awaiting verification. Please wait for the administrator to review it."
            };
        }

        // --------------------------------------------------------
        // MONTHLY ALREADY ACTIVE
        // --------------------------------------------------------

        if (
            selectedPlan === "Monthly" &&
            activeMonthly
        ) {

            return {
                allowed: false,
                message:
                    "Your Premium Monthly membership is already active."
            };
        }

        // --------------------------------------------------------
        // MONTHLY PENDING
        // --------------------------------------------------------

        if (
            selectedPlan === "Monthly" &&
            pendingMonthly
        ) {

            return {
                allowed: false,
                message:
                    "You already have a Premium Monthly payment awaiting verification. Please wait for the administrator to review it."
            };
        }

        // --------------------------------------------------------
        // LIFETIME UPGRADE
        //
        // If Monthly is active, Lifetime is allowed.
        // --------------------------------------------------------

        if (
            selectedPlan === "Lifetime" &&
            activeMonthly
        ) {

            return {
                allowed: true,
                upgrade: true
            };
        }

        return {
            allowed: true,
            upgrade: false
        };

    } catch (error) {

        console.error(
            "Error checking existing payments:",
            error
        );

        throw error;
    }
}

// ============================================================
// PLAN BUTTONS
// ============================================================

document
    .querySelectorAll(".select-plan")
    .forEach(
        (button) => {

            button.addEventListener(
                "click",
                async () => {

                    const plan =
                        button.dataset.plan;

                    if (membershipPlan) {

                        membershipPlan.value =
                            plan;
                    }

                    clearMessage();

                    updatePaymentDisplay();

                    // Make sure exchange rate is loaded
                    if (!currentExchangeRate) {

                        await loadExchangeRate();
                    }

                    document
                        .querySelector(
                            ".payment-form-section"
                        )
                        ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                }
            );
        }
    );

// ============================================================
// PLAN CHANGE
// ============================================================

membershipPlan?.addEventListener(
    "change",
    async () => {

        clearMessage();

        updatePaymentDisplay();

        if (!currentExchangeRate) {

            await loadExchangeRate();
        }
    }
);

// ============================================================
// PAYMENT METHOD CHANGE
// ============================================================

paymentMethod?.addEventListener(
    "change",
    () => {

        clearMessage();

        updatePaymentDisplay();
    }
);

// ============================================================
// COPY BUTTONS
// ============================================================

document
    .querySelectorAll(".copy-btn")
    .forEach(
        (button) => {

            button.addEventListener(
                "click",
                async () => {

                    const value =
                        button.dataset.copy;

                    if (!value) return;

                    try {

                        await navigator.clipboard.writeText(
                            value
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
                            "Copy failed:",
                            error
                        );
                    }
                }
            );
        }
    );

// ============================================================
// PAYMENT PROOF VALIDATION
// ============================================================

paymentProof?.addEventListener(
    "change",
    () => {

        const file =
            paymentProof.files?.[0];

        if (!file) {
            return;
        }

        const maxSize =
            5 * 1024 * 1024;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "application/pdf"
        ];

        if (file.size > maxSize) {

            paymentProof.value = "";

            showMessage(
                "Payment proof must be 5MB or smaller.",
                "error"
            );

            return;
        }

        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            paymentProof.value = "";

            showMessage(
                "Payment proof must be JPG, PNG or PDF.",
                "error"
            );

            return;
        }

        clearMessage();
    }
);

// ============================================================
// SUBMIT PAYMENT
// ============================================================

paymentForm?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        if (submitting) {
            return;
        }

        clearMessage();

        // ----------------------------------------------------
        // AUTH
        // ----------------------------------------------------

        if (!currentUser) {

            showMessage(
                "Please log in before submitting your payment.",
                "error"
            );

            return;
        }

        // ----------------------------------------------------
        // VALUES
        // ----------------------------------------------------

        const name =
            userName?.value.trim();

        const email =
            userEmail?.value.trim();

        const plan =
            membershipPlan?.value;

        const method =
            paymentMethod?.value;

        const transaction =
            transactionId?.value.trim();

        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!name) {

            showMessage(
                "Your account name has not loaded yet. Please wait and try again.",
                "error"
            );

            return;
        }

        if (!email) {

            showMessage(
                "Your account email has not loaded. Please refresh the page.",
                "error"
            );

            return;
        }

        if (!plan) {

            showMessage(
                "Please select a membership plan.",
                "error"
            );

            return;
        }

        if (!method) {

            showMessage(
                "Please select a payment method.",
                "error"
            );

            return;
        }

        if (!transaction) {

            showMessage(
                "Please enter your transaction code or PayPal transaction ID.",
                "error"
            );

            return;
        }

        const price =
            getPrice(plan);

        if (!price) {

            showMessage(
                "Invalid membership plan.",
                "error"
            );

            return;
        }

        // ----------------------------------------------------
        // EXCHANGE RATE FOR M-PESA
        // ----------------------------------------------------

        if (
            method === "Mpesa" &&
            !currentExchangeRate
        ) {

            await loadExchangeRate();

            if (!currentExchangeRate) {

                showMessage(
                    "The live USD/KES exchange rate is currently unavailable. Please try again shortly.",
                    "error"
                );

                return;
            }
        }

        // ----------------------------------------------------
        // CHECK DUPLICATE / EXISTING PAYMENT
        // ----------------------------------------------------

        submitting = true;

        submitPayment.disabled = true;

        submitPayment.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';

        showLoading(true);

        try {

            const existing =
                await checkExistingPayments(
                    currentUser.uid,
                    plan
                );

            if (!existing.allowed) {

                showLoading(false);

                submitting = false;

                submitPayment.disabled =
                    false;

                submitPayment.innerHTML =
                    '<i class="fa-solid fa-paper-plane"></i> Submit Payment';

                showMessage(
                    existing.message,
                    "error"
                );

                return;
            }

            // ------------------------------------------------
            // CALCULATE PAYMENT
            // ------------------------------------------------

            let amountKES = null;

            if (method === "Mpesa") {

                amountKES =
                    Math.round(
                        price *
                        currentExchangeRate
                    );
            }

            // ------------------------------------------------
            // PAYMENT PROOF
            // ------------------------------------------------

            let proofName = "";
            let proofType = "";
            let proofSize = 0;

            if (
                paymentProof?.files?.length
            ) {

                const file =
                    paymentProof.files[0];

                proofName =
                    file.name;

                proofType =
                    file.type;

                proofSize =
                    file.size;

                if (
                    proofSize >
                    5 * 1024 * 1024
                ) {

                    throw new Error(
                        "Payment proof must be 5MB or smaller."
                    );
                }
            }

            // ------------------------------------------------
            // PAYMENT DATA
            // ------------------------------------------------

            const paymentData = {

                // Identity
                userId:
                    currentUser.uid,

                uid:
                    currentUser.uid,

                name:
                    name,

                email:
                    email,

                // Plan
                plan:
                    plan,

                planPriceUSD:
                    Number(price),

                // Payment
                paymentMethod:
                    method,

                transactionId:
                    transaction,

                // Status
                status:
                    "pending",

                // Notes
                notes:
                    notes?.value.trim() || "",

                // Metadata
                submittedAt:
                    serverTimestamp(),

                createdAt:
                    serverTimestamp()
            };

            // ------------------------------------------------
            // M-PESA
            // ------------------------------------------------

            if (method === "Mpesa") {

                paymentData.currency =
                    "KES";

                paymentData.amountKES =
                    Number(amountKES);

                paymentData.exchangeRate =
                    Number(
                        currentExchangeRate
                    );

                paymentData.amountUSD =
                    Number(price);
            }

            // ------------------------------------------------
            // PAYPAL
            // ------------------------------------------------

            if (method === "PayPal") {

                paymentData.currency =
                    "USD";

                paymentData.amountUSD =
                    Number(price);
            }

            // ------------------------------------------------
            // UPGRADE FLAG
            // ------------------------------------------------

            if (existing.upgrade) {

                paymentData.paymentType =
                    "upgrade";

                paymentData.upgradeFrom =
                    "Monthly";

                paymentData.upgradeTo =
                    "Lifetime";

            } else {

                paymentData.paymentType =
                    "new_membership";
            }

            // ------------------------------------------------
            // PAYMENT PROOF
            // ------------------------------------------------

            if (proofName) {

                paymentData.proofFileName =
                    proofName;

                paymentData.proofFileType =
                    proofType;

                paymentData.proofFileSize =
                    proofSize;
            }

            // ------------------------------------------------
            // DEBUG
            // ------------------------------------------------

            console.log(
                "Submitting GTRADES-AXIS payment:",
                paymentData
            );

            // ------------------------------------------------
            // CREATE PAYMENT
            // ------------------------------------------------

            const paymentRef =
                await addDoc(
                    collection(
                        db,
                        "payments"
                    ),
                    paymentData
                );

            console.log(
                "PAYMENT CREATED:",
                paymentRef.id
            );

            // ------------------------------------------------
            // SUCCESS
            // ------------------------------------------------

            showLoading(false);

            if (successModal) {

                successModal.classList.add(
                    "active"
                );
            }

            // ------------------------------------------------
            // RESET USER-ENTERED FIELDS
            // ------------------------------------------------

            if (membershipPlan) {
                membershipPlan.value = "";
            }

            if (paymentMethod) {
                paymentMethod.value = "";
            }

            if (transactionId) {
                transactionId.value = "";
            }

            if (paymentProof) {
                paymentProof.value = "";
            }

            if (notes) {
                notes.value = "";
            }

            if (amountDisplay) {
                amountDisplay.value = "";
            }

            if (currencyBox) {
                currencyBox.classList.remove(
                    "active"
                );
            }

            if (mpesaDetails) {
                mpesaDetails.classList.remove(
                    "active"
                );
            }

            if (selectedPlanName) {
                selectedPlanName.textContent =
                    "No Plan Selected";
            }

            if (selectedPlanPrice) {
                selectedPlanPrice.textContent =
                    "$0";
            }

            if (usdAmount) {
                usdAmount.textContent =
                    "$0";
            }

            if (kesAmount) {
                kesAmount.textContent =
                    "KSh 0";
            }

            if (mpesaAmount) {
                mpesaAmount.textContent =
                    "KSh 0";
            }

        } catch (error) {

            console.error(
                "================================"
            );

            console.error(
                "PAYMENT SUBMISSION ERROR"
            );

            console.error(
                error
            );

            console.error(
                "CODE:",
                error.code
            );

            console.error(
                "MESSAGE:",
                error.message
            );

            console.error(
                "================================"
            );

            showLoading(false);

            let message =
                "Unable to submit payment. Please try again.";

            if (
                error.code ===
                "permission-denied"
            ) {

                message =
                    "Payment was rejected by Firestore security rules. Please make sure you are logged in and try again.";

            } else if (
                error.code ===
                "unauthenticated"
            ) {

                message =
                    "Your login session has expired. Please log in again.";

            } else if (
                error.message
            ) {

                message =
                    error.message;
            }

            showMessage(
                message,
                "error"
            );

        } finally {

            submitting = false;

            if (submitPayment) {

                submitPayment.disabled =
                    false;

                submitPayment.innerHTML =
                    '<i class="fa-solid fa-paper-plane"></i> Submit Payment';
            }
        }
    }
);

// ============================================================
// SUCCESS MODAL
// ============================================================

successClose?.addEventListener(
    "click",
    () => {

        if (successModal) {

            successModal.classList.remove(
                "active"
            );
        }

        window.location.href =
            "dashboard.html";
    }
);

// ============================================================
// START
// ============================================================

loadExchangeRate();

console.log(
    "GTRADES-AXIS™ payment.js loaded successfully."
);