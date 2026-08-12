// ============================================================
// GTRADES-AXIS™
// PAYMENT SYSTEM
// js/payment.js
// ============================================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "firebase/auth";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    serverTimestamp
} from "firebase/firestore";

// ============================================================
// CONFIGURATION
// ============================================================

const MONTHLY_PRICE = 50;
const LIFETIME_PRICE = 200;

const MPESA_NUMBER = "0712416214";
const MPESA_NAME = "David Thuku";

const PAYPAL_EMAIL = "Davidthuku574@gmail.com";

// Current exchange-rate API
const RATE_API =
    "https://api.frankfurter.dev/v2/rate/USD/KES";

// ============================================================
// DOM
// ============================================================

const paymentForm = document.getElementById("paymentForm");

const userIdInput = document.getElementById("userId");
const exchangeRateInput = document.getElementById("exchangeRate");

const userNameInput = document.getElementById("userName");
const userEmailInput = document.getElementById("userEmail");

const membershipPlan = document.getElementById("membershipPlan");
const paymentMethod = document.getElementById("paymentMethod");

const amountDisplay = document.getElementById("amountDisplay");
const transactionId = document.getElementById("transactionId");

const paymentProof = document.getElementById("paymentProof");
const notes = document.getElementById("notes");

const currencyBox = document.getElementById("currencyBox");

const usdAmount = document.getElementById("usdAmount");
const rateDisplay = document.getElementById("rateDisplay");
const kesAmount = document.getElementById("kesAmount");
const rateTime = document.getElementById("rateTime");

const mpesaDetails = document.getElementById("mpesaDetails");
const mpesaAmount = document.getElementById("mpesaAmount");

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

let selectedUSDPrice = 0;


// ============================================================
// HELPERS
// ============================================================

function showLoading(show = true) {

    if (!loadingScreen) return;

    loadingScreen.classList.toggle("active", show);
}


function showMessage(message, type = "error") {

    if (!paymentMessage) return;

    paymentMessage.textContent = message;

    paymentMessage.className =
        `payment-message ${type}`;

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

    return `KSh ${Number(amount).toLocaleString(
        "en-KE",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }
    )}`;
}


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        currentUser = null;

        showMessage(
            "You must be logged in before submitting a payment.",
            "error"
        );

        if (submitPayment) {
            submitPayment.disabled = true;
        }

        return;
    }


    // --------------------------------------------------------
    // USER IS LOGGED IN
    // --------------------------------------------------------

    currentUser = user;

    console.log(
        "GTRADES-AXIS payment user:",
        user.uid,
        user.email
    );


    // Hidden UID
    if (userIdInput) {
        userIdInput.value = user.uid;
    }


    // --------------------------------------------------------
    // EMAIL
    // Firebase Authentication is the primary source.
    // --------------------------------------------------------

    let email =
        user.email ||
        "";


    if (userEmailInput) {
        userEmailInput.value = email;
    }


    // --------------------------------------------------------
    // NAME
    // First try Firestore users/{uid}
    // --------------------------------------------------------

    let name = "";

    try {

        const userRef =
            doc(db, "users", user.uid);

        const userSnap =
            await getDoc(userRef);


        if (userSnap.exists()) {

            const data =
                userSnap.data();


            name =
                data.name ||
                data.fullName ||
                data.displayName ||
                "";


            // In case email exists in Firestore
            if (
                !email &&
                data.email
            ) {

                email = data.email;

                if (userEmailInput) {
                    userEmailInput.value = email;
                }
            }
        }

    } catch (error) {

        console.error(
            "Could not load Firestore user profile:",
            error
        );
    }


    // --------------------------------------------------------
    // Fallback to Firebase Auth displayName
    // --------------------------------------------------------

    if (!name) {

        name =
            user.displayName ||
            "";
    }


    // --------------------------------------------------------
    // Final fallback
    // --------------------------------------------------------

    if (!name) {

        name =
            email
                ? email.split("@")[0]
                : "GTRADES-AXIS Member";
    }


    currentUserName = name;


    if (userNameInput) {
        userNameInput.value = name;
    }


    if (userEmailInput) {
        userEmailInput.value = email;
    }


    console.log(
        "Payment form automatically filled:",
        {
            name,
            email,
            uid: user.uid
        }
    );


    if (submitPayment) {
        submitPayment.disabled = false;
    }

});


// ============================================================
// EXCHANGE RATE
// ============================================================

async function getExchangeRate() {

    try {

        if (rateDisplay) {
            rateDisplay.textContent =
                "Loading...";
        }


        const response =
            await fetch(RATE_API, {
                method: "GET",
                cache: "no-store"
            });


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
                `Latest available USD/KES rate: ${currentExchangeRate.toFixed(2)}. Rate will be recorded with your payment submission.`;
        }


        updateAmounts();


        return currentExchangeRate;


    } catch (error) {

        console.error(
            "Exchange rate error:",
            error
        );


        /*
         * Do NOT block the entire payment page.
         *
         * This fallback is only used if the public
         * exchange-rate service is temporarily unavailable.
         */

        currentExchangeRate = 129;

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
                "Exchange-rate service temporarily unavailable. Fallback rate displayed.";
        }


        updateAmounts();


        return currentExchangeRate;
    }
}


// ============================================================
// UPDATE PLAN / AMOUNTS
// ============================================================

function updateAmounts() {

    const plan =
        membershipPlan?.value || "";


    selectedUSDPrice =
        getPlanPrice(plan);


    // --------------------------------------------------------
    // No plan selected
    // --------------------------------------------------------

    if (!selectedUSDPrice) {

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

        if (amountDisplay) {
            amountDisplay.value = "";
        }

        return;
    }


    // --------------------------------------------------------
    // Show currency section
    // --------------------------------------------------------

    if (currencyBox) {
        currencyBox.classList.add("active");
    }


    const planName =
        plan === "Monthly"
            ? "Premium Monthly"
            : "Lifetime Premium";


    if (selectedPlanName) {
        selectedPlanName.textContent =
            planName;
    }


    if (selectedPlanPrice) {
        selectedPlanPrice.textContent =
            `$${selectedUSDPrice}`;
    }


    if (usdAmount) {
        usdAmount.textContent =
            `$${selectedUSDPrice}`;
    }


    // --------------------------------------------------------
    // Calculate KES
    // --------------------------------------------------------

    if (currentExchangeRate) {

        const kes =
            selectedUSDPrice *
            currentExchangeRate;


        if (kesAmount) {
            kesAmount.textContent =
                formatKES(kes);
        }


        if (mpesaAmount) {
            mpesaAmount.textContent =
                formatKES(kes);
        }


        if (amountDisplay) {

            if (
                paymentMethod?.value === "Mpesa"
            ) {

                amountDisplay.value =
                    formatKES(kes);

            } else {

                amountDisplay.value =
                    `$${selectedUSDPrice}`;
            }
        }

    }


    updatePaymentMethodDisplay();
}


// ============================================================
// PAYMENT METHOD DISPLAY
// ============================================================

function updatePaymentMethodDisplay() {

    const method =
        paymentMethod?.value || "";


    if (method === "Mpesa") {

        if (mpesaDetails) {
            mpesaDetails.classList.add("active");
        }


        if (
            currentExchangeRate &&
            selectedUSDPrice
        ) {

            const kes =
                selectedUSDPrice *
                currentExchangeRate;


            if (amountDisplay) {

                amountDisplay.value =
                    formatKES(kes);
            }


            if (mpesaAmount) {

                mpesaAmount.textContent =
                    formatKES(kes);
            }
        }

    } else {

        if (mpesaDetails) {
            mpesaDetails.classList.remove("active");
        }


        if (
            method === "PayPal" &&
            selectedUSDPrice
        ) {

            if (amountDisplay) {

                amountDisplay.value =
                    `$${selectedUSDPrice}`;
            }
        }
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


                updateAmounts();


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

        updateAmounts();


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

        updatePaymentMethodDisplay();
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


                    setTimeout(() => {

                        button.innerHTML =
                            original;

                    }, 1500);


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
// PAYMENT VALIDATION
// ============================================================

function validatePayment() {

    // --------------------------------------------------------
    // AUTH
    // --------------------------------------------------------

    if (!currentUser) {

        return {
            valid: false,
            message:
                "Your session has expired. Please log in again."
        };
    }


    // --------------------------------------------------------
    // NAME
    // --------------------------------------------------------

    const name =
        userNameInput?.value.trim();


    if (!name) {

        return {
            valid: false,
            message:
                "Your account name could not be loaded. Please refresh the page and try again."
        };
    }


    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    const email =
        userEmailInput?.value.trim();


    if (!email) {

        return {
            valid: false,
            message:
                "Your account email could not be loaded. Please refresh the page and try again."
        };
    }


    // --------------------------------------------------------
    // PLAN
    // --------------------------------------------------------

    const plan =
        membershipPlan?.value;


    if (!plan) {

        return {
            valid: false,
            message:
                "Please select a membership plan."
        };
    }


    // --------------------------------------------------------
    // PAYMENT METHOD
    // --------------------------------------------------------

    const method =
        paymentMethod?.value;


    if (!method) {

        return {
            valid: false,
            message:
                "Please select a payment method."
        };
    }


    // --------------------------------------------------------
    // TRANSACTION
    // --------------------------------------------------------

    const transaction =
        transactionId?.value.trim();


    if (!transaction) {

        return {
            valid: false,
            message:
                "Please enter your transaction code / PayPal ID."
        };
    }


    // --------------------------------------------------------
    // EXCHANGE RATE FOR MPESA
    // --------------------------------------------------------

    if (
        method === "Mpesa" &&
        !currentExchangeRate
    ) {

        return {
            valid: false,
            message:
                "The exchange rate has not loaded yet. Please wait a moment and try again."
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
    async (event) => {

        event.preventDefault();

        clearMessage();


        // ----------------------------------------------------
        // IMPORTANT:
        // HTML required validation can fire BEFORE our JS.
        // We manually validate everything here.
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


        // ----------------------------------------------------
        // GET FINAL VALUES
        // ----------------------------------------------------

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

        const additionalNotes =
            notes?.value.trim() || "";


        const price =
            getPlanPrice(plan);


        // ----------------------------------------------------
        // CALCULATE AMOUNT
        // ----------------------------------------------------

        let amount = price;

        let amountKES = null;


        if (method === "Mpesa") {

            amountKES =
                Math.round(
                    price *
                    currentExchangeRate
                );

        }


        // ----------------------------------------------------
        // PAYMENT PROOF
        // ----------------------------------------------------

        let proofName = "";
        let proofType = "";
        let proofSize = 0;


        if (paymentProof?.files?.length) {

            const file =
                paymentProof.files[0];


            proofName =
                file.name;

            proofType =
                file.type;

            proofSize =
                file.size;


            // 5MB limit
            if (
                proofSize >
                5 * 1024 * 1024
            ) {

                showMessage(
                    "Payment proof must be 5MB or smaller.",
                    "error"
                );

                return;
            }


            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "application/pdf"
            ];


            if (
                !allowedTypes.includes(
                    proofType
                )
            ) {

                showMessage(
                    "Payment proof must be JPG, PNG or PDF.",
                    "error"
                );

                return;
            }
        }


        // ----------------------------------------------------
        // DISABLE BUTTON
        // ----------------------------------------------------

        submitPayment.disabled = true;

        submitPayment.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';


        showLoading(true);


        try {

            // ------------------------------------------------
            // SAVE PAYMENT TO FIRESTORE
            // ------------------------------------------------

            const paymentData = {

                uid: currentUser.uid,

                name: name,

                email: email,

                plan: plan,

                paymentMethod: method,

                transactionId: transaction,

                amount: Number(amount),

                status: "pending",

                notes: additionalNotes,

                submittedAt:
                    serverTimestamp()
            };


            // ------------------------------------------------
            // M-PESA DATA
            // ------------------------------------------------

            if (method === "Mpesa") {

                paymentData.amountKES =
                    Number(amountKES);

                paymentData.exchangeRate =
                    Number(currentExchangeRate);

                paymentData.currency =
                    "KES";

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

            /*
             * We save the proof metadata here.
             *
             * The actual file should be uploaded to
             * your R2 system separately.
             */

            if (proofName) {

                paymentData.proofFileName =
                    proofName;

                paymentData.proofFileType =
                    proofType;

                paymentData.proofFileSize =
                    proofSize;
            }


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


            // ------------------------------------------------
            // SUCCESS
            // ------------------------------------------------

            showLoading(false);


            if (successModal) {

                successModal.classList.add(
                    "active"
                );
            }


            paymentForm.reset();


            // Restore authenticated fields
            if (userIdInput) {
                userIdInput.value =
                    currentUser.uid;
            }


            if (userNameInput) {
                userNameInput.value =
                    name;
            }


            if (userEmailInput) {
                userEmailInput.value =
                    email;
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


        } catch (error) {

            console.error(
                "PAYMENT SUBMISSION ERROR:",
                error
            );


            showLoading(false);


            showMessage(
                error.message ||
                "Unable to submit payment. Please try again.",
                "error"
            );


        } finally {

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

        successModal?.classList.remove(
            "active"
        );

        window.location.href =
            "dashboard.html";
    }
);


// ============================================================
// INITIAL EXCHANGE RATE
// ============================================================

getExchangeRate();


// ============================================================
// DEBUG
// ============================================================

console.log(
    "GTRADES-AXIS payment.js loaded."
);