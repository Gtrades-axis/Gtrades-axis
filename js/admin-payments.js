// ============================================================
// GTRADES-AXIS™
// ADMIN PAYMENT MANAGEMENT
// EXISTING STUDENT PAYMENT SYSTEM
// ============================================================

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


// ============================================================
// DOM
// ============================================================

const paymentsTable = document.getElementById("paymentsTable");
const paymentCount = document.getElementById("paymentCount");

const totalPayments = document.getElementById("totalPayments");
const pendingPayments = document.getElementById("pendingPayments");
const approvedPayments = document.getElementById("approvedPayments");
const totalRevenue = document.getElementById("totalRevenue");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const methodFilter = document.getElementById("methodFilter");
const refreshBtn = document.getElementById("refreshBtn");

const paymentModal = document.getElementById("paymentModal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");


// ============================================================
// STATE
// ============================================================

let allPayments = [];
let currentAdmin = null;


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.href = "login.html";
    return;

  }

  currentAdmin = user;

  try {

    const adminRef = doc(
      db,
      "users",
      user.uid
    );

    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {

      alert("Admin profile was not found.");

      window.location.href = "dashboard.html";
      return;

    }

    const adminData = adminSnap.data();

    if (adminData.role !== "admin") {

      alert("Access denied. Admins only.");

      window.location.href = "dashboard.html";
      return;

    }

    await loadPayments();

  } catch (error) {

    console.error(
      "Admin authentication error:",
      error
    );

    showError(
      "Unable to verify administrator access.",
      error
    );

  }

});


// ============================================================
// LOAD PAYMENTS
// IMPORTANT:
// DO NOT USE orderBy()
// This makes the admin page compatible with old
// payment documents that may not contain submittedAt.
// ============================================================

async function loadPayments() {

  paymentsTable.innerHTML = `
    <tr>
      <td colspan="8" class="loading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <br>
        Loading payments...
      </td>
    </tr>
  `;

  try {

    console.log(
      "GTRADES-AXIS: Reading /payments..."
    );

    const snapshot = await getDocs(
      collection(db, "payments")
    );

    console.log(
      "GTRADES-AXIS: Payments found:",
      snapshot.size
    );

    allPayments = [];

    snapshot.forEach((paymentDoc) => {

      const data = paymentDoc.data();

      console.log(
        "Payment:",
        paymentDoc.id,
        data
      );

      allPayments.push({
        id: paymentDoc.id,
        ...data
      });

    });


    // --------------------------------------------------------
    // SORT LOCALLY
    // Supports multiple possible date fields
    // --------------------------------------------------------

    allPayments.sort((a, b) => {

      const aTime = getPaymentTime(a);
      const bTime = getPaymentTime(b);

      return bTime - aTime;

    });


    updateStatistics();
    renderPayments();

  } catch (error) {

    console.error(
      "FAILED TO LOAD PAYMENTS:",
      error
    );

    paymentsTable.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">

            <i class="fa-solid fa-triangle-exclamation"></i>

            <br><br>

            <strong>
              Failed to load payments
            </strong>

            <br><br>

            <small>
              ${escapeHtml(error.message)}
            </small>

          </div>
        </td>
      </tr>
    `;

  }

}


// ============================================================
// STATISTICS
// ============================================================

function updateStatistics() {

  const total = allPayments.length;

  const pending = allPayments.filter(
    payment =>
      getStatus(payment) === "pending"
  ).length;

  const approved = allPayments.filter(
    payment =>
      getStatus(payment) === "approved"
  ).length;

  const revenue = allPayments
    .filter(
      payment =>
        getStatus(payment) === "approved"
    )
    .reduce(
      (sum, payment) =>
        sum + getAmountUSD(payment),
      0
    );


  totalPayments.textContent = total;

  pendingPayments.textContent = pending;

  approvedPayments.textContent = approved;

  totalRevenue.textContent =
    "$" +
    revenue.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

}


// ============================================================
// RENDER PAYMENTS
// ============================================================

function renderPayments() {

  const search =
    searchInput.value
      .trim()
      .toLowerCase();

  const selectedStatus =
    statusFilter.value;

  const selectedMethod =
    methodFilter.value;


  const filtered = allPayments.filter(
    payment => {

      const status =
        getStatus(payment);

      const method =
        getPaymentMethod(payment);


      const searchable = [

        payment.name,

        payment.fullName,

        payment.email,

        payment.transactionId,

        payment.transaction,

        payment.mpesaCode,

        payment.reference,

        payment.plan,

        method

      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();


      const matchesSearch =
        !search ||
        searchable.includes(search);


      const matchesStatus =
        selectedStatus === "all" ||
        status === selectedStatus;


      const matchesMethod =
        selectedMethod === "all" ||
        normalizeMethod(method) ===
          normalizeMethod(selectedMethod);


      return (
        matchesSearch &&
        matchesStatus &&
        matchesMethod
      );

    }
  );


  paymentCount.textContent =
    filtered.length +
    (
      filtered.length === 1
        ? " payment"
        : " payments"
    );


  if (!filtered.length) {

    paymentsTable.innerHTML = `
      <tr>

        <td colspan="8">

          <div class="empty-state">

            <i class="fa-solid fa-receipt"></i>

            <br><br>

            No payments found.

          </div>

        </td>

      </tr>
    `;

    return;

  }


  paymentsTable.innerHTML =
    filtered
      .map(createPaymentRow)
      .join("");

}


// ============================================================
// CREATE PAYMENT ROW
// ============================================================

function createPaymentRow(payment) {

  const id = payment.id;

  const name =
    payment.name ||
    payment.fullName ||
    "Unknown Student";

  const email =
    payment.email ||
    "No email";

  const plan =
    payment.plan ||
    payment.package ||
    payment.membershipPlan ||
    "Unknown";

  const method =
    getPaymentMethod(payment);

  const transaction =
    getTransactionId(payment);

  const status =
    getStatus(payment);

  const amountUSD =
    getAmountUSD(payment);

  const amountKES =
    getAmountKES(payment);

  const date =
    formatDate(
      getPaymentDate(payment)
    );


  const planClass =
    plan
      .toLowerCase()
      .includes("lifetime")
      ? "plan-lifetime"
      : "plan-monthly";


  const isMpesa =
    normalizeMethod(method)
      .includes("mpesa");


  const methodClass =
    isMpesa
      ? "method-mpesa"
      : "method-paypal";


  const methodIcon =
    isMpesa
      ? "fa-mobile-screen-button"
      : "fa-brands fa-paypal";


  return `

    <tr>

      <td>

        <div class="student-name">

          ${escapeHtml(name)}

        </div>

        <div class="student-email">

          ${escapeHtml(email)}

        </div>

      </td>


      <td>

        <span class="plan ${planClass}">

          ${escapeHtml(plan)}

        </span>

      </td>


      <td>

        <span class="method ${methodClass}">

          <i class="${methodIcon}"></i>

          ${escapeHtml(method)}

        </span>

      </td>


      <td>

        <span class="amount-usd">

          $${amountUSD.toLocaleString(
            "en-US",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}

        </span>

        ${
          amountKES
            ? `
              <span class="amount-kes">

                KSh ${amountKES.toLocaleString(
                  "en-KE"
                )}

              </span>
            `
            : ""
        }

      </td>


      <td>

        <span class="transaction">

          ${escapeHtml(transaction)}

        </span>

      </td>


      <td>

        ${createStatusBadge(status)}

      </td>


      <td>

        ${date}

      </td>


      <td>

        <div class="actions">

          <button
            class="action-btn"
            title="View Payment"
            data-action="view"
            data-id="${escapeAttribute(id)}"
          >

            <i class="fa-solid fa-eye"></i>

          </button>


          ${
            status === "pending"
              ? `

                <button
                  class="action-btn approve-btn"
                  title="Approve Payment"
                  data-action="approve"
                  data-id="${escapeAttribute(id)}"
                >

                  <i class="fa-solid fa-check"></i>

                </button>


                <button
                  class="action-btn reject-btn"
                  title="Reject Payment"
                  data-action="reject"
                  data-id="${escapeAttribute(id)}"
                >

                  <i class="fa-solid fa-xmark"></i>

                </button>

              `
              : ""
          }


          <button
            class="action-btn delete-btn"
            title="Delete Payment"
            data-action="delete"
            data-id="${escapeAttribute(id)}"
          >

            <i class="fa-solid fa-trash"></i>

          </button>

        </div>

      </td>

    </tr>

  `;

}


// ============================================================
// PAYMENT STATUS
// ============================================================

function getStatus(payment) {

  const value =
    payment.status ||
    payment.paymentStatus ||
    "pending";

  const status =
    String(value)
      .trim()
      .toLowerCase();


  // Handle older payment records

  if (
    status === "paid" ||
    status === "complete" ||
    status === "completed" ||
    status === "success" ||
    status === "successful"
  ) {

    return "approved";

  }


  if (
    status === "declined" ||
    status === "cancelled" ||
    status === "canceled"
  ) {

    return "rejected";

  }


  return status;

}


// ============================================================
// PAYMENT METHOD
// ============================================================

function getPaymentMethod(payment) {

  return (
    payment.paymentMethod ||
    payment.method ||
    payment.payment_method ||
    "Unknown"
  );

}


function normalizeMethod(method) {

  return String(method || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

}


// ============================================================
// TRANSACTION ID
// ============================================================

function getTransactionId(payment) {

  return (
    payment.transactionId ||
    payment.transactionID ||
    payment.transaction ||
    payment.mpesaCode ||
    payment.mpesaTransactionId ||
    payment.reference ||
    payment.paypalTransactionId ||
    payment.paypalOrderId ||
    "—"
  );

}


// ============================================================
// USER ID
// IMPORTANT:
// SUPPORT BOTH uid AND userId
// ============================================================

function getUserId(payment) {

  return (
    payment.uid ||
    payment.userId ||
    payment.userUID ||
    payment.userUid ||
    null
  );

}


// ============================================================
// AMOUNT USD
// ============================================================

function getAmountUSD(payment) {

  const amount =
    payment.amountUSD ??
    payment.amountUsd ??
    payment.amount ??
    payment.price ??
    0;

  return Number(amount) || 0;

}


// ============================================================
// AMOUNT KES
// ============================================================

function getAmountKES(payment) {

  const amount =
    payment.amountKES ??
    payment.amountKes ??
    payment.kesAmount ??
    null;

  if (
    amount === null ||
    amount === undefined ||
    amount === ""
  ) {

    return null;

  }

  const number =
    Number(amount);

  return Number.isFinite(number)
    ? number
    : null;

}


// ============================================================
// PAYMENT DATE
// ============================================================

function getPaymentDate(payment) {

  return (
    payment.submittedAt ||
    payment.createdAt ||
    payment.paymentDate ||
    payment.timestamp ||
    payment.date ||
    null
  );

}


// ============================================================
// PAYMENT TIME
// ============================================================

function getPaymentTime(payment) {

  const value =
    getPaymentDate(payment);

  return getTimestamp(value);

}


// ============================================================
// STATUS BADGE
// ============================================================

function createStatusBadge(status) {

  let className =
    "status-pending";

  let label =
    "Pending";


  if (status === "approved") {

    className =
      "status-approved";

    label =
      "Approved";

  }


  if (status === "rejected") {

    className =
      "status-rejected";

    label =
      "Rejected";

  }


  return `

    <span class="status ${className}">

      ${escapeHtml(label)}

    </span>

  `;

}


// ============================================================
// PAYMENT TABLE CLICK
// ============================================================

paymentsTable.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "[data-action]"
      );


    if (!button) {
      return;
    }


    const action =
      button.dataset.action;

    const id =
      button.dataset.id;


    const payment =
      allPayments.find(
        item =>
          item.id === id
      );


    if (!payment) {

      alert(
        "Payment record could not be found."
      );

      return;

    }


    if (action === "view") {

      openPaymentModal(payment);

    }


    if (action === "approve") {

      await approvePayment(payment);

    }


    if (action === "reject") {

      await rejectPayment(payment);

    }


    if (action === "delete") {

      await deletePayment(payment);

    }

  }
);


// ============================================================
// PAYMENT MODAL
// ============================================================

function openPaymentModal(payment) {

  const status =
    getStatus(payment);

  const userId =
    getUserId(payment);

  const amountUSD =
    getAmountUSD(payment);

  const amountKES =
    getAmountKES(payment);

  const transaction =
    getTransactionId(payment);

  const method =
    getPaymentMethod(payment);

  const date =
    formatDate(
      getPaymentDate(payment)
    );


  const proofUrl =
    payment.proofUrl ||
    payment.proofURL ||
    payment.paymentProofUrl ||
    payment.receiptUrl ||
    null;


  const proofName =
    payment.proofFileName ||
    payment.proofName ||
    null;


  let proofHTML = "";


  if (proofUrl) {

    proofHTML = `

      <div class="detail-item full">

        <label>Payment Proof</label>

        <strong>

          ${escapeHtml(
            proofName ||
            "Payment proof"
          )}

        </strong>

        <br><br>

        <a
          href="${escapeAttribute(proofUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          style="
            display:inline-block;
            padding:10px 15px;
            background:#4f7cff;
            color:white;
            border-radius:7px;
            text-decoration:none;
            font-size:12px;
          "
        >

          <i class="fa-solid fa-file-arrow-up"></i>

          View Payment Proof

        </a>

      </div>

    `;

  } else if (proofName) {

    proofHTML = `

      <div class="detail-item full">

        <label>Payment Proof</label>

        <strong>

          ${escapeHtml(proofName)}

        </strong>

        <div style="
          color:#68748d;
          font-size:11px;
          margin-top:6px;
        ">

          Payment proof is attached to this
          payment record.

        </div>

      </div>

    `;

  } else {

    proofHTML = `

      <div class="detail-item full">

        <label>Payment Proof</label>

        <strong>

          No proof file attached

        </strong>

      </div>

    `;

  }


  modalBody.innerHTML = `

    <div class="detail-grid">


      <div class="detail-item">

        <label>Student Name</label>

        <strong>

          ${escapeHtml(
            payment.name ||
            payment.fullName ||
            "Unknown"
          )}

        </strong>

      </div>


      <div class="detail-item">

        <label>Email</label>

        <strong>

          ${escapeHtml(
            payment.email ||
            "—"
          )}

        </strong>

      </div>


      <div class="detail-item">

        <label>User UID</label>

        <strong style="
          font-family:monospace;
          font-size:11px;
        ">

          ${escapeHtml(
            userId ||
            "—"
          )}

        </strong>

      </div>


      <div class="detail-item">

        <label>Payment ID</label>

        <strong style="
          font-family:monospace;
          font-size:11px;
        ">

          ${escapeHtml(
            payment.id
          )}

        </strong>

      </div>


      <div class="detail-item">

        <label>Plan</label>

        <strong>

          ${escapeHtml(
            payment.plan ||
            payment.package ||
            "—"
          )}

        </strong>

      </div>


      <div class="detail-item">

        <label>Payment Method</label>

        <strong>

          ${escapeHtml(method)}

        </strong>

      </div>


      <div class="detail-item">

        <label>USD Amount</label>

        <strong>

          $${amountUSD.toFixed(2)}

        </strong>

      </div>


      <div class="detail-item">

        <label>KES Amount</label>

        <strong>

          ${
            amountKES !== null
              ? "KSh " +
                amountKES.toLocaleString(
                  "en-KE"
                )
              : "—"
          }

        </strong>

      </div>


      <div class="detail-item">

        <label>Exchange Rate</label>

        <strong>

          ${
            payment.exchangeRate
              ? "1 USD = " +
                Number(
                  payment.exchangeRate
                ).toFixed(2) +
                " KES"
              : "—"
          }

        </strong>

      </div>


      <div class="detail-item">

        <label>Status</label>

        <strong>

          ${createStatusBadge(status)}

        </strong>

      </div>


      <div class="detail-item full">

        <label>
          Transaction / Reference
        </label>

        <strong style="
          font-family:monospace;
        ">

          ${escapeHtml(transaction)}

        </strong>

      </div>


      <div class="detail-item full">

        <label>Notes</label>

        <strong>

          ${
            payment.notes
              ? escapeHtml(
                  payment.notes
                )
              : "No notes"
          }

        </strong>

      </div>


      ${proofHTML}


      <div class="detail-item full">

        <label>Submitted</label>

        <strong>

          ${date}

        </strong>

      </div>


    </div>


    ${
      status === "pending"
        ? `

          <div class="modal-actions">

            <button
              class="modal-approve"
              id="modalApprove"
              type="button"
            >

              <i class="fa-solid fa-check"></i>

              Approve Payment

            </button>


            <button
              class="modal-reject"
              id="modalReject"
              type="button"
            >

              <i class="fa-solid fa-xmark"></i>

              Reject Payment

            </button>

          </div>

        `
        : ""
    }

  `;


  paymentModal.classList.add(
    "active"
  );


  const modalApprove =
    document.getElementById(
      "modalApprove"
    );


  const modalReject =
    document.getElementById(
      "modalReject"
    );


  if (modalApprove) {

    modalApprove.onclick =
      async () => {

        closePaymentModal();

        await approvePayment(
          payment
        );

      };

  }


  if (modalReject) {

    modalReject.onclick =
      async () => {

        closePaymentModal();

        await rejectPayment(
          payment
        );

      };

  }

}


// ============================================================
// APPROVE PAYMENT
// ============================================================

async function approvePayment(payment) {

  if (!currentAdmin) {

    alert(
      "Administrator session not found."
    );

    return;

  }


  const userId =
    getUserId(payment);


  if (!userId) {

    alert(
      "This payment does not contain a user ID (uid/userId).\n\n" +
      "The payment cannot automatically activate the student's membership."
    );

    return;

  }


  const confirmed =
    confirm(
      "Approve this payment?\n\n" +

      "Student: " +
      (
        payment.name ||
        payment.email ||
        "Unknown"
      ) +

      "\nPlan: " +
      (
        payment.plan ||
        "Unknown"
      ) +

      "\nAmount: $" +
      getAmountUSD(payment).toFixed(2) +

      "\n\n" +

      "The student's membership will be changed to PREMIUM."
    );


  if (!confirmed) {
    return;
  }


  try {

    // --------------------------------------------------------
    // FIRST VERIFY USER
    // --------------------------------------------------------

    const userRef =
      doc(
        db,
        "users",
        userId
      );


    const userSnap =
      await getDoc(userRef);


    if (!userSnap.exists()) {

      throw new Error(
        "Student user document was not found: " +
        userId
      );

    }


    // --------------------------------------------------------
    // UPDATE PAYMENT
    // --------------------------------------------------------

    await updateDoc(
      doc(
        db,
        "payments",
        payment.id
      ),
      {

        status:
          "approved",

        approvedAt:
          serverTimestamp(),

        approvedBy:
          currentAdmin.uid

      }
    );


    // --------------------------------------------------------
    // UPDATE STUDENT
    // --------------------------------------------------------

    await updateDoc(
      userRef,
      {

        membership:
          "premium",

        status:
          "active",

        role:
          "member",

        membershipUpdatedAt:
          serverTimestamp(),

        membershipUpdatedBy:
          currentAdmin.uid

      }
    );


    alert(
      "Payment approved successfully.\n\n" +
      "Student membership is now PREMIUM."
    );


    closePaymentModal();

    await loadPayments();


  } catch (error) {

    console.error(
      "APPROVE PAYMENT ERROR:",
      error
    );


    alert(
      "Unable to approve payment.\n\n" +
      error.message
    );


    await loadPayments();

  }

}


// ============================================================
// REJECT PAYMENT
// ============================================================

async function rejectPayment(payment) {

  if (!currentAdmin) {

    alert(
      "Administrator session not found."
    );

    return;

  }


  const reason =
    prompt(
      "Why are you rejecting this payment?\n\n" +
      "Leave blank if you do not want to add a reason."
    );


  if (reason === null) {
    return;
  }


  try {

    await updateDoc(
      doc(
        db,
        "payments",
        payment.id
      ),
      {

        status:
          "rejected",

        rejectionReason:
          reason.trim(),

        rejectedAt:
          serverTimestamp(),

        rejectedBy:
          currentAdmin.uid

      }
    );


    alert(
      "Payment rejected."
    );


    closePaymentModal();

    await loadPayments();


  } catch (error) {

    console.error(
      "REJECT PAYMENT ERROR:",
      error
    );


    alert(
      "Unable to reject payment.\n\n" +
      error.message
    );

  }

}


// ============================================================
// DELETE PAYMENT
// ============================================================

async function deletePayment(payment) {

  if (!currentAdmin) {
    return;
  }


  const confirmed =
    confirm(
      "Delete this payment record?\n\n" +
      "This cannot be undone."
    );


  if (!confirmed) {
    return;
  }


  try {

    await deleteDoc(
      doc(
        db,
        "payments",
        payment.id
      )
    );


    alert(
      "Payment record deleted."
    );


    await loadPayments();


  } catch (error) {

    console.error(
      "DELETE PAYMENT ERROR:",
      error
    );


    alert(
      "Unable to delete payment.\n\n" +
      error.message
    );

  }

}


// ============================================================
// CLOSE MODAL
// ============================================================

function closePaymentModal() {

  paymentModal.classList.remove(
    "active"
  );

}


closeModal.addEventListener(
  "click",
  closePaymentModal
);


paymentModal.addEventListener(
  "click",
  (event) => {

    if (
      event.target ===
      paymentModal
    ) {

      closePaymentModal();

    }

  }
);


// ============================================================
// FILTERS
// ============================================================

searchInput.addEventListener(
  "input",
  renderPayments
);


statusFilter.addEventListener(
  "change",
  renderPayments
);


methodFilter.addEventListener(
  "change",
  renderPayments
);


// ============================================================
// REFRESH
// ============================================================

refreshBtn.addEventListener(
  "click",
  async () => {

    refreshBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i>';


    await loadPayments();


    refreshBtn.innerHTML =
      '<i class="fa-solid fa-rotate"></i> Refresh';

  }
);


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(value) {

  if (!value) {
    return "—";
  }


  const time =
    getTimestamp(value);


  if (!time) {
    return "—";
  }


  const date =
    new Date(time);


  return date.toLocaleString(
    "en-KE",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


// ============================================================
// TIMESTAMP
// ============================================================

function getTimestamp(value) {

  if (!value) {
    return 0;
  }


  try {

    if (
      typeof value.toMillis ===
      "function"
    ) {

      return value.toMillis();

    }


    if (
      typeof value.toDate ===
      "function"
    ) {

      return value
        .toDate()
        .getTime();

    }


    if (
      value.seconds !== undefined
    ) {

      return (
        Number(value.seconds) *
        1000
      );

    }


    if (
      typeof value === "number"
    ) {

      return value < 10000000000
        ? value * 1000
        : value;

    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return 0;

    }


    return date.getTime();

  } catch {

    return 0;

  }

}


// ============================================================
// HTML SECURITY
// ============================================================

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttribute(value) {

  return escapeHtml(value);

}


// ============================================================
// ERROR DISPLAY
// ============================================================

function showError(message, error) {

  paymentsTable.innerHTML = `

    <tr>

      <td colspan="8">

        <div class="empty-state">

          <i class="fa-solid fa-triangle-exclamation"></i>

          <br><br>

          <strong>
            ${escapeHtml(message)}
          </strong>

          <br><br>

          <small>
            ${escapeHtml(
              error?.message ||
              "Unknown error"
            )}
          </small>

        </div>

      </td>

    </tr>

  `;

}


// ============================================================
// DEBUG
// ============================================================

console.log(
  "GTRADES-AXIS™ Admin Payments loaded successfully."
);