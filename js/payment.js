// ============================================================
// GTRADES-AXIS™
// PAYMENT SYSTEM
// js/payment.js
//
// PAYMENT LOGIC
// ------------------------------------------------------------
// 1. One active payment record per user/plan.
// 2. Pending payment = user cannot submit another.
// 3. Rejected/failed payment = user can retry.
// 4. Retry updates the SAME payment document.
// 5. attemptCount records how many attempts were made.
// 6. Approved Monthly -> Lifetime is treated as an upgrade.
// 7. Approved Lifetime -> no further payment.
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
    updateDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    arrayUnion
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

const amountDisplay =
    document.getElementById("amountDisplay");

const transactionId =
    document.getElementById("transactionId");

const paymentProof =
    document.getElementById("paymentProof");

const notes =
    document.getElementById("notes");

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

let currentUserProfile = null;

let submitting = false;


// ============================================================
// HELPER
// ============================================================

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


function showLoading(show = true) {

    if (!loadingScreen) return;

    loadingScreen.classList.toggle(
        "active",
        show
    );
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
                maximumFractionDigits: 0
            }
        );
}


function normalizeStatus(status) {

    return String(status || "")
        .trim()
        .toLowerCase();
}


// ============================================================
// GET USER PAYMENT RECORDS
// ============================================================
//
// We deliberately use userId rather than email.
//
// This means changing email will NOT allow another payment.
// ============================================================

async function getUserPayments() {

    if (!currentUser) {
        return [];
    }

    const paymentsRef =
        collection(db, "payments");

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

    snapshot.forEach(paymentDoc => {

        payments.push({
            id: paymentDoc.id,
            ...paymentDoc.data()
        });

    });

    return payments;
}


// ============================================================
// FIND PAYMENT FOR PLAN
// ============================================================

function findPaymentForPlan(
    payments,
    plan
) {

    return payments.find(payment => {

        return payment.plan === plan;

    }) || null;
}


// ============================================================
// FIND ANY PENDING PAYMENT
// ============================================================

function findPendingPayment(
    payments
) {

    return payments.find(payment => {

        const status =
            normalizeStatus(
                payment.status
            );

        return (
            status === "pending" ||
            status === "processing"
        );

    }) || null;
}


// ============================================================
// CHECK MEMBERSHIP
// ============================================================

async function getMembershipStatus() {

    if (!currentUser) {

        return {
            membership: "member",
            role: "user"
        };
    }

    try {

        const userRef =
            doc(
                db,
                "users",
                currentUser.uid
            );

        const snap =
            await getDoc(userRef);

        if (!snap.exists()) {

            return {
                membership: "member",
                role: "user"
            };
        }

        const data =
            snap.data();

        currentUserProfile = data;

        return {

            membership:
                String(
                    data.membership ||
                    "member"
                ).toLowerCase(),

            role:
                String(
                    data.role ||
                    "user"
                ).toLowerCase(),

            ...data
        };

    } catch (error) {

        console.error(
            "Could not load membership:",
            error
        );

        return {
            membership: "member",
            role: "user"
        };
    }
}


// ============================================================
// DETERMINE IF USER IS ALLOWED TO PAY
// ============================================================

async function checkPaymentEligibility(
    selectedPlan
) {

    if (!currentUser) {

        return {
            allowed: false,
            message:
                "Please log in before submitting a payment."
        };
    }


    // --------------------------------------------------------
    // GET MEMBERSHIP
    // --------------------------------------------------------

    const membership =
        await getMembershipStatus();


    const currentMembership =
        membership.membership;


    // --------------------------------------------------------
    // LIFETIME MEMBER
    // --------------------------------------------------------

    if (
        currentMembership ===
        "lifetime"
    ) {

        return {

            allowed: false,

            message:
                "Your account already has Lifetime Premium. No additional payment is required."
        };
    }


    // --------------------------------------------------------
    // PREMIUM / MONTHLY MEMBER
    // --------------------------------------------------------

    if (
        currentMembership ===
            "premium" ||
        currentMembership ===
            "monthly"
    ) {

        // Monthly user choosing Monthly again
        if (selectedPlan === "Monthly") {

            return {

                allowed: false,

                message:
                    "Your account already has Premium membership. You cannot submit another Monthly payment."
            };
        }


        // Monthly -> Lifetime
        if (
            selectedPlan ===
            "Lifetime"
        ) {

            return {

                allowed: true,

                upgrade: true,

                message:
                    "This payment will be treated as a Lifetime Premium upgrade."
            };
        }
    }


    // --------------------------------------------------------
    // GET PAYMENT HISTORY
    // --------------------------------------------------------

    const payments =
        await getUserPayments();


    // --------------------------------------------------------
    // IMPORTANT:
    // If ANY payment is currently pending,
    // don't allow another one.
    // --------------------------------------------------------

    const pendingPayment =
        findPendingPayment(
            payments
        );


    if (pendingPayment) {

        return {

            allowed: false,

            pending: true,

            message:
                "You already have a payment awaiting verification. Please wait for the administrator to approve or reject it before submitting another payment."
        };
    }


    // --------------------------------------------------------
    // PAYMENT FOR SELECTED PLAN
    // --------------------------------------------------------

    const existingPayment =
        findPaymentForPlan(
            payments,
            selectedPlan
        );


    if (!existingPayment) {

        return {
            allowed: true,
            retry: false,
            upgrade: false
        };
    }


    const status =
        normalizeStatus(
            existingPayment.status
        );


    // --------------------------------------------------------
    // APPROVED
    // --------------------------------------------------------

    if (
        status === "approved" ||
        status === "paid" ||
        status === "completed"
    ) {

        return {

            allowed: false,

            message:
                `Your ${selectedPlan === "Monthly"
                    ? "Monthly Premium"
                    : "Lifetime Premium"
                } payment has already been approved. You cannot submit another payment for the same plan.`
        };
    }


    // --------------------------------------------------------
    // REJECTED / FAILED
    // --------------------------------------------------------
    //
    // THIS IS THE IMPORTANT PART.
    //
    // The user is allowed to try again.
    // We update the SAME document.
    // --------------------------------------------------------

    if (
        status === "rejected" ||
        status === "failed" ||
        status === "declined"
    ) {

        return {

            allowed: true,

            retry: true,

            existingPayment:
                existingPayment,

            message:
                "Your previous payment was not approved. You may submit a new payment attempt."
        };
    }


    // --------------------------------------------------------
    // UNKNOWN STATUS
    // --------------------------------------------------------

    return {

        allowed: true,

        retry: true,

        existingPayment:
            existingPayment
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


        currentUser = user;


        // ----------------------------------------------------
        // UID
        // ----------------------------------------------------

        if (userIdInput) {

            userIdInput.value =
                user.uid;
        }


        // ----------------------------------------------------
        // EMAIL
        // ----------------------------------------------------

        let email =
            user.email || "";


        if (userEmailInput) {

            userEmailInput.value =
                email;
        }


        // ----------------------------------------------------
        // NAME
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
                await getDoc(
                    userRef
                );


            if (userSnap.exists()) {

                const data =
                    userSnap.data();

                currentUserProfile =
                    data;


                fullName =
                    data.name ||
                    data.fullName ||
                    data.displayName ||
                    "";


                if (
                    !email &&
                    data.email
                ) {

                    email =
                        data.email;

                    if (userEmailInput) {

                        userEmailInput.value =
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


        if (!fullName) {

            fullName =
                user.displayName ||
                "";
        }


        if (!fullName) {

            fullName =
                email
                    ? email.split("@")[0]
                    : "GTRADES-AXIS Member";
        }


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
            "GTRADES-AXIS payment user:",
            {
                uid: user.uid,
                email,
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


    try {

        const response =
            await fetch(
                RATE_API,
                {
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


    } catch (error) {

        console.error(
            "Exchange-rate error:",
            error
        );


        // Fallback
        currentExchangeRate =
            129;
    }


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
            `USD/KES rate recorded at payment submission: ${currentExchangeRate.toFixed(2)}.`;
    }


    updatePaymentDisplay();
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


    if (!price) {

        currencyBox?.classList.remove(
            "active"
        );

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

        mpesaDetails?.classList.remove(
            "active"
        );

        return;
    }


    currencyBox?.classList.add(
        "active"
    );


    if (selectedPlanName) {

        selectedPlanName.textContent =
            plan === "Monthly"
                ? "Premium Monthly"
                : "Lifetime Premium";
    }


    if (selectedPlanPrice) {

        selectedPlanPrice.textContent =
            `$${price}`;
    }


    if (usdAmount) {

        usdAmount.textContent =
            `$${price}`;
    }


    const rate =
        currentExchangeRate || 129;


    const kes =
        Math.round(
            price * rate
        );


    if (kesAmount) {

        kesAmount.textContent =
            formatKES(kes);
    }


    if (method === "Mpesa") {

        if (amountDisplay) {

            amountDisplay.value =
                formatKES(kes);
        }

        if (mpesaAmount) {

            mpesaAmount.textContent =
                formatKES(kes);
        }

        mpesaDetails?.classList.add(
            "active"
        );

    } else if (
        method === "PayPal"
    ) {

        if (amountDisplay) {

            amountDisplay.value =
                `$${price}`;
        }

        mpesaDetails?.classList.remove(
            "active"
        );

    } else {

        if (amountDisplay) {

            amountDisplay.value = "";
        }

        mpesaDetails?.classList.remove(
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
            () => {

                const plan =
                    button.dataset.plan;

                if (membershipPlan) {

                    membershipPlan.value =
                        plan;
                }

                updatePaymentDisplay();

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
    });


// ============================================================
// PLAN CHANGE
// ============================================================

membershipPlan?.addEventListener(
    "change",
    () => {

        clearMessage();

        updatePaymentDisplay();
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

                    const old =
                        button.innerHTML;

                    button.innerHTML =
                        '<i class="fa-solid fa-check"></i>';

                    setTimeout(
                        () => {

                            button.innerHTML =
                                old;

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
// PROOF VALIDATION
// ============================================================

paymentProof?.addEventListener(
    "change",
    () => {

        const file =
            paymentProof.files?.[0];

        if (!file) return;


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
    async event => {

        event.preventDefault();


        // ----------------------------------------------------
        // DOUBLE SUBMISSION PROTECTION
        // ----------------------------------------------------

        if (submitting) {

            console.warn(
                "Payment submission already in progress."
            );

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
            userNameInput?.value.trim() || "";

        const email =
            userEmailInput?.value.trim() || "";

        const plan =
            membershipPlan?.value || "";

        const method =
            paymentMethod?.value || "";

        const transaction =
            transactionId?.value.trim() || "";

        const additionalNotes =
            notes?.value.trim() || "";


        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!name) {

            showMessage(
                "Your account name has not loaded yet.",
                "error"
            );

            return;
        }


        if (!email) {

            showMessage(
                "Your email has not loaded yet.",
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
        // CHECK ELIGIBILITY
        // ----------------------------------------------------

        showLoading(true);


        try {

            const eligibility =
                await checkPaymentEligibility(
                    plan
                );


            if (!eligibility.allowed) {

                showLoading(false);

                showMessage(
                    eligibility.message,
                    "error"
                );

                return;
            }


            // ------------------------------------------------
            // GET EXISTING PAYMENT
            // ------------------------------------------------

            const payments =
                await getUserPayments();


            const existingPayment =
                findPaymentForPlan(
                    payments,
                    plan
                );


            const isRetry =
                eligibility.retry &&
                existingPayment;


            // ------------------------------------------------
            // M-PESA
            // ------------------------------------------------

            let amountKES = null;


            if (method === "Mpesa") {

                if (!currentExchangeRate) {

                    await loadExchangeRate();
                }


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

                    showLoading(false);

                    showMessage(
                        "Payment proof must be 5MB or smaller.",
                        "error"
                    );

                    return;
                }
            }


            // ------------------------------------------------
            // LOCK
            // ------------------------------------------------

            submitting = true;

            submitPayment.disabled =
                true;

            submitPayment.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';


            // ------------------------------------------------
            // COMMON DATA
            // ------------------------------------------------

            const paymentData = {

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
                    additionalNotes,

                updatedAt:
                    serverTimestamp()
            };


            // ------------------------------------------------
            // MPESA
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
            // PAYPAL
            // ------------------------------------------------

            if (method === "PayPal") {

                paymentData.currency =
                    "USD";
            }


            // ------------------------------------------------
            // PROOF
            // ------------------------------------------------

            if (proofName) {

                paymentData.proofFileName =
                    proofName;

                paymentData.proofFileType =
                    proofType;

                paymentData.proofFileSize =
                    proofSize;
            }


            // =================================================
            // RETRY
            // =================================================
            //
            // VERY IMPORTANT:
            //
            // We DO NOT create another payment document.
            //
            // We update the existing rejected/failed document.
            //
            // Admin therefore continues seeing ONE payment.
            // =================================================

            if (isRetry) {

                const previousAttempt = {

                    transactionId:
                        existingPayment.transactionId ||
                        "",

                    paymentMethod:
                        existingPayment.paymentMethod ||
                        "",

                    amountUSD:
                        existingPayment.amountUSD ||
                        0,

                    amountKES:
                        existingPayment.amountKES ||
                        null,

                    status:
                        existingPayment.status ||
                        "rejected",

                    submittedAt:
                        existingPayment.submittedAt ||
                        null,

                    retryAt:
                        new Date().toISOString()
                };


                const currentAttemptCount =
                    Number(
                        existingPayment.attemptCount ||
                        1
                    );


                paymentData.attemptCount =
                    currentAttemptCount + 1;


                paymentData.lastRetryAt =
                    serverTimestamp();


                paymentData.retryReason =
                    "Previous payment was rejected or failed.";


                paymentData.previousAttempts =
                    arrayUnion(
                        previousAttempt
                    );


                // --------------------------------------------
                // UPDATE SAME DOCUMENT
                // --------------------------------------------

                const paymentRef =
                    doc(
                        db,
                        "payments",
                        existingPayment.id
                    );


                await updateDoc(
                    paymentRef,
                    paymentData
                );


                console.log(
                    "PAYMENT RETRY UPDATED:",
                    existingPayment.id
                );


            } else {

                // =================================================
                // FIRST PAYMENT
                // =================================================

                paymentData.attemptCount =
                    1;

                paymentData.submittedAt =
                    serverTimestamp();

                paymentData.previousAttempts =
                    [];

                paymentData.isUpgrade =
                    eligibility.upgrade === true;


                const paymentRef =
                    await addDoc(
                        collection(
                            db,
                            "payments"
                        ),
                        paymentData
                    );


                console.log(
                    "NEW PAYMENT CREATED:",
                    paymentRef.id
                );
            }


            // =================================================
            // SUCCESS
            // =================================================

            showLoading(false);


            if (successModal) {

                successModal.classList.add(
                    "active"
                );
            }


            // ------------------------------------------------
            // RESET PAYMENT FIELDS
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

            currencyBox?.classList.remove(
                "active"
            );

            mpesaDetails?.classList.remove(
                "active"
            );

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
                    "Payment was rejected by Firestore security rules. Please check your account permissions.";
            }


            else if (
                error.code ===
                "unauthenticated"
            ) {

                message =
                    "Your login session has expired. Please log in again.";
            }


            else if (error.message) {

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

        successModal?.classList.remove(
            "active"
        );

        window.location.href =
            "dashboard.html";
    }
);


// ============================================================
// INITIALIZE
// ============================================================

loadExchangeRate();


// ============================================================
// DEBUG
// ============================================================

console.log(
    "GTRADES-AXIS™ payment.js loaded — duplicate-payment protection ACTIVE."
);