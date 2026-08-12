// ==========================================================
// GTRADES-AXIS™
// ADMIN PAYMENTS MANAGEMENT
// SINGLE CLEAN VERSION
// ==========================================================

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ==========================================================
// DOM
// ==========================================================

const tbody = document.getElementById("paymentsBody");

const statPending = document.getElementById("statPending");
const statApproved = document.getElementById("statApproved");
const statRejected = document.getElementById("statRejected");
const statRevenue = document.getElementById("statRevenue");

const searchInput = document.getElementById("paymentSearch");
const statusFilter = document.getElementById("paymentFilter");

const adminMessage = document.getElementById("adminMessage");

// ==========================================================
// STATE
// ==========================================================

let allPayments = [];
let unsubscribePayments = null;

// ==========================================================
// MESSAGE
// ==========================================================

function showMessage(message, type = "success") {

  if (!adminMessage) return;

  adminMessage.textContent = message;

  adminMessage.className =
    "admin-message " + type;

  setTimeout(() => {

    adminMessage.className =
      "admin-message";

    adminMessage.textContent = "";

  }, 5000);
}

// ==========================================================
// AUTH + ADMIN CHECK
// ==========================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.href = "login.html";

    return;
  }

  try {

    const userRef =
      doc(db, "users", user.uid);

    const userSnap =
      await getDoc(userRef);

    if (!userSnap.exists()) {

      window.location.href =
        "access-denied.html";

      return;
    }

    const userData =
      userSnap.data();

    if (userData.role !== "admin") {

      window.location.href =
        "access-denied.html";

      return;
    }

    console.log(
      "✅ Admin verified:",
      user.email
    );

    startPaymentListener();

  } catch (error) {

    console.error(
      "Admin verification error:",
      error
    );

    window.location.href =
      "login.html";
  }

});

// ==========================================================
// FIRESTORE PAYMENT LISTENER
// ==========================================================

function startPaymentListener() {

  if (unsubscribePayments) {

    unsubscribePayments();

  }

  const paymentsRef =
    collection(db, "payments");

  const paymentsQuery =
    query(
      paymentsRef,
      orderBy("createdAt", "desc")
    );

  unsubscribePayments =
    onSnapshot(
      paymentsQuery,

      (snapshot) => {

        allPayments = [];

        snapshot.forEach((paymentDoc) => {

          allPayments.push({

            id: paymentDoc.id,

            ...paymentDoc.data()

          });

        });

        updateStatistics(allPayments);

        applyFilters();

      },

      (error) => {

        console.error(
          "Payment listener error:",
          error
        );

        tbody.innerHTML = `
          <tr>
            <td colspan="8">
              <div class="empty">
                <i class="fa-solid fa-triangle-exclamation"></i>
                Failed to load payments.
              </div>
            </td>
          </tr>
        `;
      }
    );
}

// ==========================================================
// STATISTICS
// ==========================================================

function updateStatistics(payments) {

  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let revenue = 0;

  payments.forEach((payment) => {

    const status =
      payment.status || "pending";

    if (status === "pending") {

      pending++;

    } else if (status === "approved") {

      approved++;

      const amount =
        Number(payment.amount || 0);

      revenue += amount;

    } else if (status === "rejected") {

      rejected++;

    }

  });

  statPending.textContent = pending;

  statApproved.textContent = approved;

  statRejected.textContent = rejected;

  statRevenue.textContent =
    "$" + revenue.toFixed(2);
}

// ==========================================================
// SEARCH
// ==========================================================

if (searchInput) {

  searchInput.addEventListener(
    "input",
    applyFilters
  );

}

// ==========================================================
// FILTER
// ==========================================================

if (statusFilter) {

  statusFilter.addEventListener(
    "change",
    applyFilters
  );

}

// ==========================================================
// APPLY FILTERS
// ==========================================================

function applyFilters() {

  let filtered =
    [...allPayments];

  const search =
    searchInput
      ? searchInput.value
          .toLowerCase()
          .trim()
      : "";

  const status =
    statusFilter
      ? statusFilter.value
      : "all";

  if (search) {

    filtered =
      filtered.filter((payment) => {

        const name =
          String(payment.name || "")
            .toLowerCase();

        const email =
          String(payment.email || "")
            .toLowerCase();

        const transaction =
          String(payment.transactionId || "")
            .toLowerCase();

        return (
          name.includes(search) ||
          email.includes(search) ||
          transaction.includes(search)
        );

      });

  }

  if (status !== "all") {

    filtered =
      filtered.filter(
        payment =>
          (payment.status || "pending") === status
      );

  }

  renderPayments(filtered);
}

// ==========================================================
// ESCAPE HTML
// ==========================================================

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================
// RENDER
// ==========================================================

function renderPayments(payments) {

  if (!payments.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8">

          <div class="empty">

            <i class="fa-solid fa-inbox"></i>

            No payments found.

          </div>

        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    payments.map((payment) => {

      const status =
        payment.status || "pending";

      const statusLabel =
        status.charAt(0).toUpperCase() +
        status.slice(1);

      const proofKey =
        payment.proofKey || "";

      const proofURL =
        payment.proofURL || "";

      let proofHTML = "—";

      if (proofURL) {

        proofHTML = `
          <a
            href="${escapeHtml(proofURL)}"
            target="_blank"
            rel="noopener noreferrer"
            class="proof-btn"
          >
            <i class="fa-solid fa-eye"></i>
            View
          </a>
        `;

      } else if (proofKey) {

        proofHTML = `
          <span
            style="color:#9aa4bf;font-size:11px;"
            title="${escapeHtml(proofKey)}"
          >
            R2 file
          </span>
        `;

      }

      let actions = "—";

      if (status === "pending") {

        actions = `

          <div class="action-btns">

            <button
              class="action-btn approve-btn"
              data-id="${escapeHtml(payment.id)}"
              data-user="${escapeHtml(payment.userId || "")}"
            >
              <i class="fa-solid fa-check"></i>
              Approve
            </button>

            <button
              class="action-btn reject-btn"
              data-id="${escapeHtml(payment.id)}"
              data-user="${escapeHtml(payment.userId || "")}"
            >
              <i class="fa-solid fa-xmark"></i>
              Reject
            </button>

          </div>

        `;

      } else {

        actions = `
          <span class="completed">
            <i class="fa-solid fa-check"></i>
            Completed
          </span>
        `;
      }

      return `

        <tr>

          <td>

            <div class="user-name">
              ${escapeHtml(payment.name || "N/A")}
            </div>

            <div class="user-email">
              ${escapeHtml(payment.email || "")}
            </div>

          </td>

          <td>
            ${escapeHtml(payment.plan || "N/A")}
          </td>

          <td>
            ${escapeHtml(payment.paymentMethod || "N/A")}
          </td>

          <td>

            <code>
              ${escapeHtml(payment.transactionId || "N/A")}
            </code>

          </td>

          <td>
            $${Number(payment.amount || 0).toFixed(2)}
          </td>

          <td>
            ${proofHTML}
          </td>

          <td>

            <span
              class="status-badge ${escapeHtml(status)}"
            >
              ${escapeHtml(statusLabel)}
            </span>

          </td>

          <td>
            ${actions}
          </td>

        </tr>

      `;

    }).join("");
}

// ==========================================================
// BUTTON EVENTS
// ==========================================================

document.addEventListener("click", async (event) => {

  const approveButton =
    event.target.closest(".approve-btn");

  const rejectButton =
    event.target.closest(".reject-btn");

  if (approveButton) {

    await handlePaymentAction(
      approveButton.dataset.id,
      approveButton.dataset.user,
      "approved"
    );

  }

  if (rejectButton) {

    await handlePaymentAction(
      rejectButton.dataset.id,
      rejectButton.dataset.user,
      "rejected"
    );

  }

});

// ==========================================================
// APPROVE / REJECT
// ==========================================================

async function handlePaymentAction(
  paymentId,
  userId,
  status
) {

  if (!paymentId) {

    alert("Invalid payment.");

    return;
  }

  const actionText =
    status === "approved"
      ? "approve"
      : "reject";

  const confirmed =
    confirm(
      `Are you sure you want to ${actionText} this payment?`
    );

  if (!confirmed) return;

  try {

    // ------------------------------------------------------
    // Re-read payment first
    // ------------------------------------------------------

    const paymentRef =
      doc(db, "payments", paymentId);

    const paymentSnap =
      await getDoc(paymentRef);

    if (!paymentSnap.exists()) {

      alert(
        "Payment no longer exists."
      );

      return;
    }

    const payment =
      paymentSnap.data();

    // ------------------------------------------------------
    // Prevent double processing
    // ------------------------------------------------------

    if (payment.status !== "pending") {

      alert(
        `This payment is already ${payment.status}.`
      );

      return;
    }

    // ------------------------------------------------------
    // UPDATE PAYMENT
    // ------------------------------------------------------

    const paymentUpdate = {

      status,

      reviewedAt:
        serverTimestamp(),

      reviewedBy:
        auth.currentUser.uid

    };

    if (status === "approved") {

      paymentUpdate.approvedAt =
        serverTimestamp();

    }

    if (status === "rejected") {

      paymentUpdate.rejectedAt =
        serverTimestamp();

    }

    await updateDoc(
      paymentRef,
      paymentUpdate
    );

    // ------------------------------------------------------
    // APPROVED → PREMIUM
    // ------------------------------------------------------

    if (
      status === "approved" &&
      userId
    ) {

      const userRef =
        doc(db, "users", userId);

      const userSnap =
        await getDoc(userRef);

      if (!userSnap.exists()) {

        throw new Error(
          "User account does not exist."
        );

      }

      await updateDoc(
        userRef,
        {

          membership:
            "premium",

          status:
            "active",

          updatedAt:
            serverTimestamp()

        }
      );

    }

    // ------------------------------------------------------
    // AUDIT LOG
    // ------------------------------------------------------

    await createPaymentLog({

      action:
        status.toUpperCase(),

      paymentId,

      userId:
        userId || null,

      details:
        status === "approved"
          ? "Payment approved and user upgraded to Premium."
          : "Payment rejected by administrator."

    });

    // ------------------------------------------------------
    // MESSAGE
    // ------------------------------------------------------

    if (status === "approved") {

      showMessage(
        "Payment approved. User is now Premium.",
        "success"
      );

    } else {

      showMessage(
        "Payment rejected.",
        "success"
      );

    }

  } catch (error) {

    console.error(
      "Payment action error:",
      error
    );

    showMessage(
      "Failed to process payment. Check Firestore permissions.",
      "error"
    );

  }

}

// ==========================================================
// PAYMENT AUDIT LOG
// ==========================================================

async function createPaymentLog({
  action,
  paymentId,
  userId,
  details
}) {

  try {

    await addDoc(
      collection(db, "paymentLogs"),
      {

        action,

        paymentId,

        userId,

        details,

        adminUid:
          auth.currentUser
            ? auth.currentUser.uid
            : null,

        adminEmail:
          auth.currentUser
            ? auth.currentUser.email
            : null,

        createdAt:
          serverTimestamp()

      }
    );

  } catch (error) {

    console.error(
      "Audit log error:",
      error
    );

  }

}

console.log(
  "✅ GTRADES-AXIS™ Admin Payments loaded."
);