// ============================================================
// GTRADES-AXIS™
// ADMIN PAYMENT MANAGEMENT
// Works with the EXISTING student payment.html
// ============================================================

import {
  auth,
  db
} from "./firebase.js";

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
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


// ============================================================
// DOM
// ============================================================

const paymentsTable =
  document.getElementById("paymentsTable");

const paymentCount =
  document.getElementById("paymentCount");

const totalPayments =
  document.getElementById("totalPayments");

const pendingPayments =
  document.getElementById("pendingPayments");

const approvedPayments =
  document.getElementById("approvedPayments");

const totalRevenue =
  document.getElementById("totalRevenue");

const searchInput =
  document.getElementById("searchInput");

const statusFilter =
  document.getElementById("statusFilter");

const methodFilter =
  document.getElementById("methodFilter");

const refreshBtn =
  document.getElementById("refreshBtn");

const paymentModal =
  document.getElementById("paymentModal");

const modalBody =
  document.getElementById("modalBody");

const closeModal =
  document.getElementById("closeModal");


// ============================================================
// STATE
// ============================================================

let allPayments = [];

let currentAdmin = null;


// ============================================================
// AUTH + ADMIN CHECK
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;

    }

    currentAdmin = user;

    try {

      const userRef =
        doc(
          db,
          "users",
          user.uid
        );

      const userSnap =
        await getDoc(userRef);

      if (!userSnap.exists()) {

        alert(
          "Admin profile was not found."
        );

        window.location.href =
          "dashboard.html";

        return;

      }

      const userData =
        userSnap.data();

      if (
        userData.role !== "admin"
      ) {

        alert(
          "Access denied. Admins only."
        );

        window.location.href =
          "dashboard.html";

        return;

      }

      await loadPayments();

    } catch (error) {

      console.error(
        "Admin authentication error:",
        error
      );

      paymentsTable.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <br>
            Unable to verify administrator access.
            <br><br>
            ${escapeHtml(error.message)}
          </td>
        </tr>
      `;

    }

  }
);


// ============================================================
// LOAD PAYMENTS
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

    /*
     * We read the existing /payments collection.
     *
     * No new fields are required.
     */

    let snapshot;

    try {

      const paymentsQuery =
        query(
          collection(
            db,
            "payments"
          ),
          orderBy(
            "submittedAt",
            "desc"
          )
        );

      snapshot =
        await getDocs(
          paymentsQuery
        );

    } catch (indexError) {

      /*
       * If Firestore requires an index or
       * old documents have no submittedAt,
       * fall back to a normal collection read.
       */

      console.warn(
        "Ordered payment query failed. Falling back to normal query.",
        indexError
      );

      snapshot =
        await getDocs(
          collection(
            db,
            "payments"
          )
        );

    }

    allPayments = [];

    snapshot.forEach(
      paymentDoc => {

        allPayments.push({
          id: paymentDoc.id,
          ...paymentDoc.data()
        });

      }
    );

    /*
     * Sort locally as a second layer.
     */

    allPayments.sort(
      (a, b) => {

        const aTime =
          getTimestamp(
            a.submittedAt
          );

        const bTime =
          getTimestamp(
            b.submittedAt
          );

        return bTime - aTime;

      }
    );

    updateStatistics();

    renderPayments();

  } catch (error) {

    console.error(
      "Failed to load payments:",
      error
    );

    paymentsTable.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <br>
          Failed to load payments.
          <br><br>
          <small>
            ${escapeHtml(error.message)}
          </small>
        </td>
      </tr>
    `;

  }

}


// ============================================================
// STATISTICS
// ============================================================

function updateStatistics() {

  const total =
    allPayments.length;

  const pending =
    allPayments.filter(
      payment =>
        getStatus(payment) === "pending"
    ).length;

  const approved =
    allPayments.filter(
      payment =>
        getStatus(payment) === "approved"
    ).length;

  /*
   * Revenue is based on approved
   * amountUSD only.
   */

  const revenue =
    allPayments
      .filter(
        payment =>
          getStatus(payment) === "approved"
      )
      .reduce(
        (sum, payment) => {

          return sum +
            Number(
              payment.amountUSD || 0
            );

        },
        0
      );

  totalPayments.textContent =
    total;

  pendingPayments.textContent =
    pending;

  approvedPayments.textContent =
    approved;

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
// RENDER
// ============================================================

function renderPayments() {

  const search =
    searchInput.value
      .trim()
      .toLowerCase();

  const status =
    statusFilter.value;

  const method =
    methodFilter.value;

  const filtered =
    allPayments.filter(
      payment => {

        const paymentStatus =
          getStatus(payment);

        const paymentMethod =
          payment.paymentMethod || "";

        const searchable = [
          payment.name,
          payment.email,
          payment.transactionId,
          payment.plan,
          paymentMethod
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !search ||
          searchable.includes(search);

        const matchesStatus =
          status === "all" ||
          paymentStatus === status;

        const matchesMethod =
          method === "all" ||
          paymentMethod === method;

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
            <br>
            No payments found.
          </div>
        </td>
      </tr>
    `;

    return;

  }

  paymentsTable.innerHTML =
    filtered
      .map(
        payment =>
          createPaymentRow(payment)
      )
      .join("");

}


// ============================================================
// PAYMENT ROW
// ============================================================

function createPaymentRow(payment) {

  const id =
    payment.id;

  const name =
    payment.name ||
    "Unknown Student";

  const email =
    payment.email ||
    "No email";

  const plan =
    payment.plan ||
    "Unknown";

  const method =
    payment.paymentMethod ||
    "Unknown";

  const transaction =
    payment.transactionId ||
    "—";

  const status =
    getStatus(payment);

  const amountUSD =
    Number(
      payment.amountUSD || 0
    );

  const amountKES =
    payment.amountKES
      ? Number(payment.amountKES)
      : null;

  const date =
    formatDate(
      payment.submittedAt
    );

  const planClass =
    plan.toLowerCase()
      .includes("lifetime")
      ? "plan-lifetime"
      : "plan-monthly";

  const methodClass =
    method.toLowerCase()
      .includes("mpesa")
      ? "method-mpesa"
      : "method-paypal";

  const methodIcon =
    method.toLowerCase()
      .includes("mpesa")
      ? "fa-mobile-screen-button"
      : "fa-brands fa-paypal";

  return `
    <tr>

      <!-- STUDENT -->

      <td>

        <div class="student-name">
          ${escapeHtml(name)}
        </div>

        <div class="student-email">
          ${escapeHtml(email)}
        </div>

      </td>


      <!-- PLAN -->

      <td>

        <span class="plan ${planClass}">
          ${escapeHtml(plan)}
        </span>

      </td>


      <!-- METHOD -->

      <td>

        <span class="method ${methodClass}">

          <i class="fa-solid ${methodIcon}"></i>

          ${escapeHtml(method)}

        </span>

      </td>


      <!-- AMOUNT -->

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


      <!-- TRANSACTION -->

      <td>

        <span class="transaction">

          ${escapeHtml(transaction)}

        </span>

      </td>


      <!-- STATUS -->

      <td>

        ${createStatusBadge(status)}

      </td>


      <!-- DATE -->

      <td>

        ${date}

      </td>


      <!-- ACTIONS -->

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

        </div>

      </td>

    </tr>
  `;

}


// ============================================================
// STATUS
// ============================================================

function getStatus(payment) {

  return (
    payment.status ||
    "pending"
  )
    .toString()
    .toLowerCase();

}


function createStatusBadge(status) {

  let label =
    status;

  let className =
    "status-pending";

  if (status === "approved") {

    className =
      "status-approved";

    label =
      "Approved";

  } else if (
    status === "rejected"
  ) {

    className =
      "status-rejected";

    label =
      "Rejected";

  } else {

    className =
      "status-pending";

    label =
      "Pending";

  }

  return `
    <span class="status ${className}">
      ${escapeHtml(label)}
    </span>
  `;

}


// ============================================================
// CLICK HANDLER
// ============================================================

paymentsTable.addEventListener(
  "click",
  async event => {

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

      await approvePayment(
        payment
      );

    }

    if (action === "reject") {

      await rejectPayment(
        payment
      );

    }

  }
);


// ============================================================
// VIEW PAYMENT
// ============================================================

function openPaymentModal(payment) {

  const status =
    getStatus(payment);

  const amountUSD =
    Number(
      payment.amountUSD || 0
    );

  const amountKES =
    payment.amountKES
      ? Number(payment.amountKES)
      : null;

  const submittedDate =
    formatDate(
      payment.submittedAt
    );

  const proof =
    payment.proofFileName
      ? `
        <div class="detail-item full">

          <label>Payment Proof</label>

          <strong>
            ${escapeHtml(
              payment.proofFileName
            )}
          </strong>

          <div style="
            color:#68748d;
            font-size:11px;
            margin-top:5px;
          ">

            ${
              payment.proofFileType
                ? escapeHtml(
                    payment.proofFileType
                  )
                : ""
            }

            ${
              payment.proofFileSize
                ? " • " +
                  formatFileSize(
                    payment.proofFileSize
                  )
                : ""
            }

          </div>

        </div>
      `
      : `
        <div class="detail-item full">

          <label>Payment Proof</label>

          <strong>
            No proof file attached
          </strong>

        </div>
      `;

  modalBody.innerHTML = `

    <div class="detail-grid">

      <div class="detail-item">

        <label>Student Name</label>

        <strong>
          ${escapeHtml(
            payment.name ||
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
            payment.uid ||
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
            "—"
          )}
        </strong>

      </div>


      <div class="detail-item">

        <label>Payment Method</label>

        <strong>
          ${escapeHtml(
            payment.paymentMethod ||
            "—"
          )}
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
          Transaction / PayPal ID
        </label>

        <strong style="
          font-family:monospace;
        ">

          ${escapeHtml(
            payment.transactionId ||
            "—"
          )}

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


      ${proof}


      <div class="detail-item full">

        <label>Submitted</label>

        <strong>
          ${submittedDate}
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
            >

              <i class="fa-solid fa-check"></i>

              Approve Payment

            </button>

            <button
              class="modal-reject"
              id="modalReject"
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

  const confirmed =
    confirm(
      `Approve payment from ${payment.name || payment.email}?\n\n` +
      `Plan: ${payment.plan || "Unknown"}\n` +
      `Amount: $${Number(payment.amountUSD || 0).toFixed(2)}\n\n` +
      `This will activate Premium membership.`
    );

  if (!confirmed) {
    return;
  }


  try {

    /*
     * ----------------------------------------------------
     * STEP 1
     * Mark payment approved
     * ----------------------------------------------------
     */

    await updateDoc(
      doc(
        db,
        "payments",
        payment.id
      ),
      {
        status: "approved",

        approvedAt:
          new Date(),

        approvedBy:
          currentAdmin.uid
      }
    );


    /*
     * ----------------------------------------------------
     * STEP 2
     * Update student membership
     * ----------------------------------------------------
     */

    if (!payment.uid) {

      throw new Error(
        "This payment does not contain a student UID. Payment was approved, but the student's membership could not be updated."
      );

    }


    const userRef =
      doc(
        db,
        "users",
        payment.uid
      );


    const userSnap =
      await getDoc(
        userRef
      );


    if (!userSnap.exists()) {

      throw new Error(
        "The student user document does not exist."
      );

    }


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
          new Date(),

        membershipUpdatedBy:
          currentAdmin.uid

      }
    );


    alert(
      "Payment approved successfully.\n\nThe student's membership is now Premium."
    );


    await loadPayments();


  } catch (error) {

    console.error(
      "Approve payment error:",
      error
    );

    alert(
      "Unable to approve payment:\n\n" +
      error.message
    );

    /*
     * Reload because payment may have
     * changed even if membership update failed.
     */

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
      "You can leave this blank."
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
          new Date(),

        rejectedBy:
          currentAdmin.uid

      }
    );


    alert(
      "Payment rejected."
    );


    await loadPayments();


  } catch (error) {

    console.error(
      "Reject payment error:",
      error
    );

    alert(
      "Unable to reject payment:\n\n" +
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
  event => {

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
// DATE
// ============================================================

function formatDate(timestamp) {

  if (!timestamp) {

    return "—";

  }

  let date;

  try {

    if (
      typeof timestamp.toDate ===
      "function"
    ) {

      date =
        timestamp.toDate();

    } else if (
      timestamp.seconds
    ) {

      date =
        new Date(
          timestamp.seconds *
          1000
        );

    } else if (
      timestamp instanceof Date
    ) {

      date =
        timestamp;

    } else {

      date =
        new Date(timestamp);

    }

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "—";

    }

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

  } catch {

    return "—";

  }

}


// ============================================================
// TIMESTAMP
// ============================================================

function getTimestamp(timestamp) {

  if (!timestamp) {

    return 0;

  }

  try {

    if (
      typeof timestamp.toMillis ===
      "function"
    ) {

      return timestamp.toMillis();

    }

    if (
      typeof timestamp.toDate ===
      "function"
    ) {

      return timestamp
        .toDate()
        .getTime();

    }

    if (
      timestamp.seconds
    ) {

      return Number(
        timestamp.seconds
      ) * 1000;

    }

    const date =
      new Date(timestamp);

    return Number.isNaN(
      date.getTime()
    )
      ? 0
      : date.getTime();

  } catch {

    return 0;

  }

}


// ============================================================
// FILE SIZE
// ============================================================

function formatFileSize(bytes) {

  if (!bytes) {

    return "0 B";

  }

  const sizes = [
    "B",
    "KB",
    "MB",
    "GB"
  ];

  const i =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return (
    bytes /
    Math.pow(
      1024,
      i
    )
  ).toFixed(1) +
  " " +
  sizes[i];

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
// END
// ============================================================

console.log(
  "GTRADES-AXIS™ Admin Payments loaded."
);