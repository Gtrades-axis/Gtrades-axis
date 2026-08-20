// ============================================================
// GTRADES-AXIS™
// PAYMENT SYSTEM
// js/payment.js
//
// FEATURES
// ------------------------------------------------------------
// 1. Automatic USD/KES conversion
// 2. Conversion tab appears after plan selection
// 3. M-PESA shows KES amount
// 4. PayPal stays in USD
// 5. Amount Paid is read-only
// 6. Prevent duplicate membership payment submissions
// 7. Existing pending/approved payment blocks another payment
// 8. Lifetime Premium blocks normal payment
// 9. Monthly Premium can be upgraded to Lifetime
// 10. Firestore document uses userId == Firebase UID
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
    query,
    where,
    getDocs,
    serverTimestamp
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

const userIdInput =
    document.getElementById("userId");

const exchangeRateInput =
    document.getElementById("exchangeRate");

const userNameInput =
    document.getElementById("userName");

const userEmailInput =
    document.getElementById("userEmail");

const nameStatus =
    document.getElementById("nameStatus");

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

let currentUserName = "";

let currentExchangeRate = null;

let membershipData = null;

let checkingExistingPayment = false;


// ============================================================
// HELPERS
// ============================================================

function showLoading(show = true) {

    if (!loadingScreen) return;

    loadingScreen.classList.toggle(
        "active",
        show
    );
}


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


function getPlanPrice(plan) {

    if (plan === "Monthly") {
        return MONTHLY_PRICE;
    }

    if (plan === "Lifetime") {
        return LIFETIME_PRICE;
    }

    return 0;
}


function formatKES(amount) {

    return (
        "KSh " +
        Number(amount).toLocaleString(
            "en-KE",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }
        )
    );
}


// ============================================================
// SET AMOUNT FIELD AS READ ONLY
// ============================================================

if (amountDisplay) {

    amountDisplay.readOnly = true;

    amountDisplay.setAttribute(
        "readonly",
        "readonly"
    );

    amountDisplay.style.background =
        "#151923";

    amountDisplay.style.color =
        "#9aa4bf";

    amountDisplay.style.cursor =
        "not-allowed";

    amountDisplay.setAttribute(
        "tabindex",
        "-1"
    );
}


// ============================================================
// LOAD USER MEMBERSHIP
// ============================================================

async function loadMembership(user) {

    membershipData = null;

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

            membershipData =
                userSnap.data();

        }

        console.log(
            "GTRADES-AXIS membership:",
            membershipData
        );

    } catch (error) {

        console.error(
            "Could not load membership:",
            error
        );
    }
}


// ============================================================
// GET USER MEMBERSHIP TYPE
// ============================================================

function getMembership() {

    if (!membershipData) {
        return "";
    }

    return String(
        membershipData.membership ||
        ""
    ).toLowerCase();
}


// ============================================================
// MEMBERSHIP ALREADY PREMIUM?
// ============================================================

function hasLifetimePremium() {

    const membership =
        getMembership();

    return (
        membership === "lifetime" ||
        membership === "lifetime premium"
    );
}


function hasMonthlyPremium() {

    const membership =
        getMembership();

    return (
        membership === "premium" ||
        membership === "monthly" ||
        membership === "premium monthly"
    );
}


// ============================================================
// CHECK EXISTING PAYMENT
//
// IMPORTANT:
// We only count the payment as an active membership payment
// when it is pending or approved.
//
// Rejected payments do NOT permanently block the member.
// Therefore a failed/rejected attempt can be resubmitted.
// ============================================================

async function getExistingPayments() {

    if (!currentUser) {
        return [];
    }

    try {

        const paymentsRef =
            collection(
                db,
                "payments"
            );

        const q =
            query(
                paymentsRef,
                where(
                    "userId",
                    "==",
                    currentUser.uid
                )
            );

        const snapshot =
            await getDocs(q);

        const payments = [];

        snapshot.forEach(
            paymentDoc => {

                payments.push({
                    id: paymentDoc.id,
                    ...paymentDoc.data()
                });

            }
        );

        return payments;

    } catch (error) {

        console.error(
            "Could not check existing payments:",
            error
        );

        throw error;
    }
}


// ============================================================
// DETERMINE WHETHER NEW PAYMENT IS ALLOWED
// ============================================================

async function checkPaymentEligibility(plan) {

    if (!currentUser) {

        return {
            allowed: false,
            reason:
                "Please log in before making a payment."
        };
    }


    // --------------------------------------------------------
    // LIFETIME MEMBER
    // --------------------------------------------------------

    if (hasLifetimePremium()) {

        return {
            allowed: false,
            reason:
                "Your account already has Lifetime Premium. No additional payment is required."
        };
    }


    // --------------------------------------------------------
    // MONTHLY MEMBER
    //
    // Monthly members are allowed to upgrade to Lifetime.
    // They are NOT allowed to submit another normal Monthly
    // payment through this form.
    // --------------------------------------------------------

    if (
        hasMonthlyPremium() &&
        plan === "Monthly"
    ) {

        return {
            allowed: false,
            reason:
                "Your account already has Premium Monthly. You can upgrade to Lifetime Premium instead."
        };
    }


    const payments =
        await getExistingPayments();


    // --------------------------------------------------------
    // ACTIVE PAYMENT STATUSES
    // --------------------------------------------------------

    const activePayments =
        payments.filter(
            payment => {

                const status =
                    String(
                        payment.status ||
                        ""
                    ).toLowerCase();

                return (
                    status === "pending" ||
                    status === "approved"
                );
            }
        );


    // --------------------------------------------------------
    // LIFETIME PAYMENT ALREADY EXISTS
    // --------------------------------------------------------

    const lifetimePayment =
        activePayments.find(
            payment => {

                return (
                    payment.plan ===
                        "Lifetime" ||
                    payment.plan ===
                        "Lifetime Premium"
                );

            }
        );


    if (lifetimePayment) {

        return {
            allowed: false,
            reason:
                "You already have a Lifetime Premium payment being processed or approved."
        };
    }


    // --------------------------------------------------------
    // SAME PLAN PAYMENT ALREADY EXISTS
    // --------------------------------------------------------

    const samePlanPayment =
        activePayments.find(
            payment =>
                payment.plan === plan
        );


    if (samePlanPayment) {

        return {
            allowed: false,
            reason:
                plan === "Monthly"
                    ? "You already have a Premium Monthly payment pending or approved. Please wait for verification."
                    : "You already have a Lifetime Premium payment pending or approved. Please wait for verification."
        };
    }


    // --------------------------------------------------------
    // IF USER HAS MONTHLY AND SELECTS LIFETIME
    //
    // THIS IS ALLOWED.
    // --------------------------------------------------------

    return {
        allowed: true
    };
}


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            currentUser = null;

            if (userIdInput) {
                userIdInput.value = "";
            }

            if (userNameInput) {
                userNameInput.value = "";
            }

            if (userEmailInput) {
                userEmailInput.value = "";
            }

            if (nameStatus) {

                nameStatus.textContent =
                    "Please log in to continue.";

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


        // ----------------------------------------------------
        // USER LOGGED IN
        // ----------------------------------------------------

        currentUser = user;


        if (userIdInput) {

            userIdInput.value =
                user.uid;
        }


        if (userEmailInput) {

            userEmailInput.value =
                user.email || "";
        }


        // ----------------------------------------------------
        // LOAD USER DOCUMENT
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

                membershipData =
                    data;

                fullName =
                    data.name ||
                    data.fullName ||
                    data.displayName ||
                    "";


                if (
                    !userEmailInput.value &&
                    data.email
                ) {

                    userEmailInput.value =
                        data.email;

                }

            }

        } catch (error) {

            console.error(
                "Error loading user profile:",
                error
            );
        }


        // ----------------------------------------------------
        // FALLBACK NAME
        // ----------------------------------------------------

        if (!fullName) {

            fullName =
                user.displayName ||
                "";
        }


        if (!fullName) {

            fullName =
                user.email
                    ? user.email.split("@")[0]
                    : "GTRADES-AXIS Member";
        }


        currentUserName =
            fullName;


        if (userNameInput) {

            userNameInput.value =
                fullName;
        }


        if (nameStatus) {

            nameStatus.textContent =
                "Account information loaded.";

            nameStatus.style.color =
                "#00c897";
        }


        if (submitPayment) {

            submitPayment.disabled =
                false;
        }


        console.log(
            "Authenticated payment user:",
            {
                uid: user.uid,
                email: user.email,
                name: fullName,
                membership:
                    getMembership()
            }
        );
    }
);


// ============================================================
// EXCHANGE RATE
// ============================================================

async function getExchangeRate() {

    if (rateDisplay) {

        rateDisplay.textContent =
            "Loading...";
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
                `Exchange API returned ${response.status}`
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


        if (exchangeRateInput) {

            exchangeRateInput.value =
                currentExchangeRate;
        }


        if (rateDisplay) {

            rateDisplay.textContent =
                `1 USD = ${currentExchangeRate.toFixed(2)} KES`;
        }


        if (rateTime) {

            rateTime.textContent =
                `Current USD/KES exchange rate: ${currentExchangeRate.toFixed(2)}.`;
        }


        updatePaymentDisplay();


        return currentExchangeRate;


    } catch (error) {

        console.error(
            "Exchange-rate error:",
            error
        );


        // ----------------------------------------------------
        // FALLBACK
        // ----------------------------------------------------

        currentExchangeRate =
            129;


        if (exchangeRateInput) {

            exchangeRateInput.value =
                currentExchangeRate;
        }


        if (rateDisplay) {

            rateDisplay.textContent =
                "1 USD = 129.00 KES";
        }


        if (rateTime) {

            rateTime.textContent =
                "Live exchange rate unavailable. Fallback rate of 129 KES is being used.";
        }


        updatePaymentDisplay();


        return currentExchangeRate;
    }
}


// ============================================================
// UPDATE PAYMENT DISPLAY
//
// THIS IS THE IMPORTANT AUTOMATIC CALCULATION METHOD.
// ============================================================

function updatePaymentDisplay() {

    const plan =
        membershipPlan?.value || "";

    const method =
        paymentMethod?.value || "";

    const price =
        getPlanPrice(plan);


    // --------------------------------------------------------
    // NO PLAN
    // --------------------------------------------------------

    if (!price) {

        if (currencyBox) {

            currencyBox.classList.remove(
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


        if (amountDisplay) {

            amountDisplay.value =
                "";
        }


        if (mpesaDetails) {

            mpesaDetails.classList.remove(
                "active"
            );
        }


        return;
    }


    // --------------------------------------------------------
    // SHOW CONVERSION TAB
    // --------------------------------------------------------

    if (currencyBox) {

        currencyBox.classList.add(
            "active"
        );
    }


    // --------------------------------------------------------
    // PLAN NAME
    // --------------------------------------------------------

    if (plan === "Monthly") {

        if (selectedPlanName) {

            selectedPlanName.textContent =
                "Premium Monthly";
        }

    } else {

        if (selectedPlanName) {

            selectedPlanName.textContent =
                "Lifetime Premium";
        }
    }


    // --------------------------------------------------------
    // USD PRICE
    // --------------------------------------------------------

    if (selectedPlanPrice) {

        selectedPlanPrice.textContent =
            `$${price}`;
    }


    if (usdAmount) {

        usdAmount.textContent =
            `$${price}`;
    }


    // --------------------------------------------------------
    // CURRENT RATE
    // --------------------------------------------------------

    const rate =
        currentExchangeRate;


    if (rate && rate > 0) {

        const calculatedKES =
            Math.round(
                price * rate
            );


        if (kesAmount) {

            kesAmount.textContent =
                formatKES(
                    calculatedKES
                );
        }


        if (mpesaAmount) {

            mpesaAmount.textContent =
                formatKES(
                    calculatedKES
                );
        }
    }


    // --------------------------------------------------------
    // M-PESA
    // --------------------------------------------------------

    if (method === "Mpesa") {

        if (!rate) {

            if (amountDisplay) {

                amountDisplay.value =
                    "Loading exchange rate...";
            }

        } else {

            const calculatedKES =
                Math.round(
                    price * rate
                );


            if (amountDisplay) {

                amountDisplay.value =
                    formatKES(
                        calculatedKES
                    );
            }


            if (mpesaAmount) {

                mpesaAmount.textContent =
                    formatKES(
                        calculatedKES
                    );
            }
        }


        if (mpesaDetails) {

            mpesaDetails.classList.add(
                "active"
            );
        }

        return;
    }


    // --------------------------------------------------------
    // PAYPAL
    // --------------------------------------------------------

    if (method === "PayPal") {

        if (amountDisplay) {

            amountDisplay.value =
                `$${price} USD`;
        }


        if (mpesaDetails) {

            mpesaDetails.classList.remove(
                "active"
            );
        }

        return;
    }


    // --------------------------------------------------------
    // PLAN SELECTED BUT NO PAYMENT METHOD
    // --------------------------------------------------------

    if (amountDisplay) {

        amountDisplay.value =
            "";
    }


    if (mpesaDetails) {

        mpesaDetails.classList.remove(
            "active"
        );
    }
}


// ============================================================
// PLAN BUTTONS
// ============================================================

document
    .querySelectorAll(".select-plan")
    .forEach(button => {

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


                document
                    .querySelector(
                        ".payment-form-section"
                    )
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });


                if (!currentExchangeRate) {

                    await getExchangeRate();
                }
            }
        );

    });


// ============================================================
// PLAN CHANGE
// ============================================================

membershipPlan?.addEventListener(
    "change",
    async () => {

        clearMessage();

        updatePaymentDisplay();


        if (!currentExchangeRate) {

            await getExchangeRate();
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
    .forEach(button => {

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

    });


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

            paymentProof.value =
                "";

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

            paymentProof.value =
                "";

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
// VALIDATION
// ============================================================

function validatePayment() {

    if (!currentUser) {

        return {
            valid: false,
            message:
                "Please log in before submitting your payment."
        };
    }


    const name =
        userNameInput?.value.trim() || "";


    const email =
        userEmailInput?.value.trim() || "";


    const plan =
        membershipPlan?.value || "";


    const method =
        paymentMethod?.value || "";


    const transaction =
        transactionId?.value.trim() || "";


    if (!name) {

        return {
            valid: false,
            message:
                "Your account name has not loaded yet."
        };
    }


    if (!email) {

        return {
            valid: false,
            message:
                "Your account email has not loaded yet."
        };
    }


    if (!plan) {

        return {
            valid: false,
            message:
                "Please select a membership plan."
        };
    }


    if (!method) {

        return {
            valid: false,
            message:
                "Please select a payment method."
        };
    }


    if (!transaction) {

        return {
            valid: false,
            message:
                "Please enter your transaction code or PayPal transaction ID."
        };
    }


    const price =
        getPlanPrice(plan);


    if (!price) {

        return {
            valid: false,
            message:
                "Invalid membership plan."
        };
    }


    if (
        method === "Mpesa" &&
        !currentExchangeRate
    ) {

        return {
            valid: false,
            message:
                "The exchange rate is still loading. Please wait a moment."
        };
    }


    return {
        valid: true
    };
}


// ============================================================
// SUBMIT PAYMENT
// ============================================================

paymentForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        clearMessage();


        if (checkingExistingPayment) {
            return;
        }


        // ----------------------------------------------------
        // BASIC VALIDATION
        // ----------------------------------------------------

        const validation =
            validatePayment();


        if (!validation.valid) {

            showMessage(
                validation.message,
                "error"
            );

            return;
        }


        const name =
            userNameInput.value.trim();

        const email =
            userEmailInput.value.trim();

        const plan =
            membershipPlan.value;

        const method =
            paymentMethod.value;

        const transaction =
            transactionId.value.trim();

        const price =
            getPlanPrice(plan);


        // ----------------------------------------------------
        // CHECK DUPLICATE / EXISTING PAYMENT
        // ----------------------------------------------------

        checkingExistingPayment =
            true;

        submitPayment.disabled =
            true;

        submitPayment.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';


        try {

            const eligibility =
                await checkPaymentEligibility(
                    plan
                );


            if (!eligibility.allowed) {

                showMessage(
                    eligibility.reason,
                    "error"
                );

                submitPayment.disabled =
                    false;

                submitPayment.innerHTML =
                    '<i class="fa-solid fa-paper-plane"></i> Submit Payment';

                checkingExistingPayment =
                    false;

                return;
            }


            // ------------------------------------------------
            // CALCULATE FINAL AMOUNT
            // ------------------------------------------------

            let amountKES =
                null;


            if (method === "Mpesa") {

                if (!currentExchangeRate) {

                    await getExchangeRate();
                }


                amountKES =
                    Math.round(
                        price *
                        currentExchangeRate
                    );
            }


            // ------------------------------------------------
            // PAYMENT PROOF METADATA
            // ------------------------------------------------

            let proofName =
                "";

            let proofType =
                "";

            let proofSize =
                0;


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
            }


            // ------------------------------------------------
            // PROCESSING
            // ------------------------------------------------

            submitPayment.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

            showLoading(true);


            // ------------------------------------------------
            // CREATE PAYMENT
            // ------------------------------------------------

            const paymentData = {

                // IMPORTANT
                // Must match Firestore rules.
                userId:
                    currentUser.uid,

                name:
                    name,

                email:
                    email,

                plan:
                    plan,

                paymentMethod:
                    method,

                transactionId:
                    transaction,

                amountUSD:
                    Number(price),

                status:
                    "pending",

                notes:
                    notes?.value.trim() || "",

                submittedAt:
                    serverTimestamp()
            };


            // ------------------------------------------------
            // M-PESA DATA
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
            }


            // ------------------------------------------------
            // PAYPAL DATA
            // ------------------------------------------------

            if (method === "PayPal") {

                paymentData.currency =
                    "USD";
            }


            // ------------------------------------------------
            // PROOF METADATA
            // ------------------------------------------------

            if (proofName) {

                paymentData.proofFileName =
                    proofName;

                paymentData.proofFileType =
                    proofType;

                paymentData.proofFileSize =
                    proofSize;
            }


            console.log(
                "Submitting GTRADES-AXIS payment:",
                paymentData
            );


            const paymentRef =
                await addDoc(
                    collection(
                        db,
                        "payments"
                    ),
                    paymentData
                );


            console.log(
                "Payment created:",
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
            // RESET PAYMENT FIELDS
            // ------------------------------------------------

            membershipPlan.value =
                "";

            paymentMethod.value =
                "";

            transactionId.value =
                "";

            if (paymentProof) {

                paymentProof.value =
                    "";
            }

            if (notes) {

                notes.value =
                    "";
            }

            if (amountDisplay) {

                amountDisplay.value =
                    "";
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
                    "Payment was rejected by Firestore security rules. Please check your login session and payment rules.";
            }


            if (
                error.code ===
                "unauthenticated"
            ) {

                message =
                    "Your login session has expired. Please log in again.";
            }


            if (error.message) {

                console.error(
                    error.message
                );
            }


            showMessage(
                message,
                "error"
            );


        } finally {

            checkingExistingPayment =
                false;

            submitPayment.disabled =
                false;

            submitPayment.innerHTML =
                '<i class="fa-solid fa-paper-plane"></i> Submit Payment';
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
            "/dashboard";
    }
);


// ============================================================
// INITIALIZE
// ============================================================

getExchangeRate();


console.log(
    "GTRADES-AXIS™ payment.js loaded successfully."
);