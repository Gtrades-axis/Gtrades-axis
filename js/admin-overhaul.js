import { auth, db } from "/js/firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  collection,
  collectionGroup,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


// ============================================================
// HELPERS
// ============================================================

const $ = id => document.getElementById(id);

const esc = value =>
  String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );

const n = value => Number(value) || 0;


function millis(value) {
  if (!value) return 0;

  if (value?.toDate) {
    return value.toDate().getTime();
  }

  if (value?.seconds) {
    return value.seconds * 1000;
  }

  const parsed = Date.parse(String(value));

  return Number.isFinite(parsed) ? parsed : 0;
}


function date(value) {
  const timestamp = millis(value);

  return timestamp
    ? new Date(timestamp).toLocaleString()
    : "—";
}


function status(value) {
  const x = String(value || "pending")
    .trim()
    .toLowerCase();

  if (
    [
      "paid",
      "complete",
      "completed",
      "success",
      "successful"
    ].includes(x)
  ) {
    return "approved";
  }

  if (
    [
      "rejected",
      "declined",
      "failed"
    ].includes(x)
  ) {
    return "rejected";
  }

  return x;
}


function money(value) {
  return n(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


// ============================================================
// APPLICATION STATE
// ============================================================

const state = {
  users: [],
  academy: [],
  resources: [],
  videos: [],
  payments: [],
  trades: []
};


// ============================================================
// FIRESTORE SOURCES
// ============================================================

const SOURCES = {
  academy: [
    "academy_modules",
    "premium_academy"
  ],

  resources: [
    "resources",
    "premium_resources"
  ],

  videos: [
    "videos",
    "premium_videos"
  ],

  payments: [
    "payments",
    "paymentLogs"
  ]
};


// ============================================================
// FIRESTORE NORMALISATION
// ============================================================

function normaliseDocs(snapshot, source) {
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    _source: source,
    ...docSnap.data()
  }));
}


// ============================================================
// ERROR DISPLAY
// ============================================================

function showError(error, source = "Firestore") {
  const box = $("errorBox");

  if (!box) {
    console.error(source, error);
    return;
  }

  box.classList.remove("hidden");

  box.textContent =
    `${source}: ${error?.code || "error"} — ${error?.message || error}`;
}


// ============================================================
// LISTEN TO MULTIPLE COLLECTIONS
// ============================================================

function listenMany(names, key, renderer) {
  const unsubscribers = [];
  const buckets = new Map();

  for (const name of names) {

    const unsubscribe = onSnapshot(
      collection(db, name),

      snapshot => {

        buckets.set(
          name,
          normaliseDocs(snapshot, name)
        );

        state[key] = names.flatMap(
          collectionName =>
            buckets.get(collectionName) || []
        );


        // Remove duplicate document IDs.
        // Current collection appears first in SOURCES,
        // therefore it wins over legacy collections.

        const seen = new Set();

        state[key] = state[key].filter(item => {

          const id = String(item.id);

          if (seen.has(id)) {
            return false;
          }

          seen.add(id);

          return true;
        });


        renderer();
      },

      error => {
        console.error(
          `Firestore ${name} listener failed`,
          error
        );

        showError(error, name);
      }
    );

    unsubscribers.push(unsubscribe);
  }

  return () => {
    unsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error(error);
      }
    });
  };
}


// ============================================================
// START APPLICATION
// ============================================================

function start() {

  // USERS
  listenMany(
    ["users"],
    "users",
    renderAll
  );


  // ACADEMY
  listenMany(
    SOURCES.academy,
    "academy",
    renderAll
  );


  // RESOURCES
  listenMany(
    SOURCES.resources,
    "resources",
    renderAll
  );


  // VIDEOS
  listenMany(
    SOURCES.videos,
    "videos",
    renderAll
  );


  // PAYMENTS
  listenMany(
    SOURCES.payments,
    "payments",
    renderAll
  );


  // ==========================================================
  // TRADES
  // ==========================================================

  onSnapshot(
    collectionGroup(db, "trades"),

    snapshot => {

      state.trades = snapshot.docs.map(docSnap => {

        const data = docSnap.data();

        const parent =
          docSnap.ref.parent.parent;

        const ownerId =
          data.userId ||
          parent?.id ||
          "";

        return {
          id: docSnap.id,
          userId: ownerId,
          _path: docSnap.ref.path,
          ...data
        };
      });


      renderAll();
    },

    error => {

      console.error(
        "Firestore collectionGroup(trades) failed",
        error
      );

      showError(error, "Trades");
    }
  );


  bind();

  renderAll();
}


// ============================================================
// EVENT BINDINGS
// ============================================================

function bind() {

  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.onclick = () => {
        openTab(button.dataset.tab);
      };

    });


  document
    .querySelectorAll("[data-open-tab]")
    .forEach(button => {

      button.onclick = () => {
        openTab(button.dataset.openTab);
      };

    });


  const menuButton = $("menuBtn");

  if (menuButton) {
    menuButton.onclick = () => {
      $("sidebar")?.classList.toggle("open");
    };
  }


  const logoutButton = $("logoutBtn");

  if (logoutButton) {

    logoutButton.onclick = async () => {

      try {

        await signOut(auth);

        location.href = "/login";

      } catch (error) {

        console.error(
          "Logout failed:",
          error
        );

        showError(error, "Logout");
      }

    };
  }


  [
    "memberSearch",
    "memberFilter",
    "tradeSearch",
    "tradeStatus",
    "tradeVisibility",
    "paymentSearch",
    "paymentStatus"
  ].forEach(id => {

    const element = $(id);

    if (element) {
      element.addEventListener(
        "input",
        renderAll
      );
    }

  });
}


// ============================================================
// TAB NAVIGATION
// ============================================================

function openTab(tab) {

  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.tab === tab
      );

    });


  document
    .querySelectorAll(".tab")
    .forEach(section => {

      section.classList.toggle(
        "active",
        section.id === `tab-${tab}`
      );

    });


  $("sidebar")?.classList.remove("open");
}


// ============================================================
// MAIN RENDER
// ============================================================

function renderAll() {

  const s = state;


  const welcomeText = $("welcomeText");

  if (welcomeText) {

    welcomeText.textContent =
      `Live data • ${s.users.length} members • ` +
      `${s.trades.length} journal trades • ` +
      `${s.payments.length} payments`;

  }


  [
    "members",
    "academy",
    "resources",
    "videos",
    "trades",
    "payments"
  ].forEach(key => {

    const badgeElement = $(`${key}Badge`);

    if (badgeElement) {
      badgeElement.textContent =
        s[key].length;
    }

  });


  // ==========================================================
  // DASHBOARD STATISTICS
  // ==========================================================

  const dashboardStats = $("dashboardStats");

  if (dashboardStats) {

    dashboardStats.innerHTML = [

      stat(
        "fa-users",
        s.users.length,
        "Total Members"
      ),

      stat(
        "fa-star",
        s.users.filter(
          user =>
            String(
              user.membership || ""
            ).toLowerCase() === "premium"
        ).length,
        "Premium Members"
      ),

      stat(
        "fa-graduation-cap",
        s.academy.length,
        "Academy Lessons"
      ),

      stat(
        "fa-circle-play",
        s.videos.length,
        "Videos"
      ),

      stat(
        "fa-chart-line",
        s.trades.length,
        "Journal Trades"
      )

    ].join("");
  }


  // ==========================================================
  // PAYMENT STATISTICS
  // ==========================================================

  const approvedPayments =
    s.payments.filter(
      payment =>
        status(payment.status) === "approved"
    );


  const revenue =
    approvedPayments.reduce(
      (total, payment) =>
        total +
        n(
          payment.amountUSD ??
          payment.amount ??
          payment.amountPaidUSD
        ),
      0
    );


  const paymentStats = $("paymentStats");

  if (paymentStats) {

    paymentStats.innerHTML = [

      stat(
        "fa-receipt",
        s.payments.length,
        "Payments"
      ),

      stat(
        "fa-clock",
        s.payments.filter(
          payment =>
            status(payment.status) === "pending"
        ).length,
        "Pending"
      ),

      stat(
        "fa-dollar-sign",
        `$${money(revenue)}`,
        "Approved Revenue"
      )

    ].join("");
  }


  // ==========================================================
  // TABLES
  // ==========================================================

  renderMembers();
  renderAcademy();
  renderResources();
  renderVideos();
  renderTrades();
  renderPayments();
  renderRecent();
}


// ============================================================
// STAT CARD
// ============================================================

function stat(icon, value, label) {

  return `
    <div class="stat-card">
      <div class="icon">
        <i class="fa-solid ${esc(icon)}"></i>
      </div>

      <strong>${esc(value)}</strong>

      <span>${esc(label)}</span>
    </div>
  `;
}


// ============================================================
// RECENT ACTIVITY
// ============================================================

function renderRecent() {

  // ==========================================================
  // RECENT MEMBERS
  // ==========================================================

  const users = [...state.users]
    .sort(
      (a, b) =>
        millis(
          b.createdAt ||
          b.joinedAt ||
          b.created
        ) -
        millis(
          a.createdAt ||
          a.joinedAt ||
          a.created
        )
    )
    .slice(0, 5);


  const recentMembers = $("recentMembers");

  if (recentMembers) {

    recentMembers.innerHTML = `
      <div class="list">

        ${
          users.length

            ? users
                .map(
                  user => `
                    <div class="list-row">

                      <div>

                        <strong>
                          ${esc(
                            user.name ||
                            user.fullName ||
                            user.email ||
                            "Member"
                          )}
                        </strong>

                        <small>
                          ${esc(user.email || "")}
                        </small>

                      </div>

                      <span class="badge ${
                        String(
                          user.membership || ""
                        ).toLowerCase() === "premium"
                          ? "gold"
                          : ""
                      }">

                        ${esc(
                          user.membership ||
                          "free"
                        )}

                      </span>

                    </div>
                  `
                )
                .join("")

            : empty()
        }

      </div>
    `;
  }


  // ==========================================================
  // RECENT PAYMENTS
  // ==========================================================

  const payments = [...state.payments]
    .sort(
      (a, b) =>
        millis(
          b.submittedAt ||
          b.createdAt ||
          b.created
        ) -
        millis(
          a.submittedAt ||
          a.createdAt ||
          a.created
        )
    )
    .slice(0, 5);


  const recentPayments = $("recentPayments");

  if (recentPayments) {

    recentPayments.innerHTML = `
      <div class="list">

        ${
          payments.length

            ? payments
                .map(payment => {

                  const paymentStatus =
                    status(payment.status);

                  const badgeClass =
                    paymentStatus === "approved"
                      ? "green"
                      : paymentStatus === "rejected"
                        ? "red"
                        : "gold";


                  return `
                    <div class="list-row">

                      <div>

                        <strong>
                          ${esc(
                            payment.name ||
                            payment.fullName ||
                            payment.email ||
                            "Payment"
                          )}
                        </strong>

                        <small>
                          ${esc(
                            payment.plan ||
                            payment.package ||
                            "—"
                          )}

                          •

                          ${esc(
                            payment.transactionId ||
                            payment.transaction ||
                            payment.mpesaCode ||
                            ""
                          )}
                        </small>

                      </div>

                      <span class="badge ${badgeClass}">
                        ${esc(
                          payment.status ||
                          "pending"
                        )}
                      </span>

                    </div>
                  `;
                })
                .join("")

            : empty()
        }

      </div>
    `;
  }


  // ==========================================================
  // RECENT TRADES
  // ==========================================================

  const trades = [...state.trades]
    .sort(
      (a, b) =>
        millis(
          b.updated ||
          b.created ||
          b.date
        ) -
        millis(
          a.updated ||
          a.created ||
          a.date
        )
    )
    .slice(0, 8);


  const recentTrades = $("recentTrades");

  if (recentTrades) {

    recentTrades.innerHTML = trades.length

      ? `
        <div class="list">

          ${trades
            .map(
              trade => `
                <div class="list-row">

                  <div>

                    <strong>
                      ${esc(
                        trade.pair ||
                        "Trade"
                      )}

                      ${esc(
                        trade.direction ||
                        ""
                      )}
                    </strong>

                    <small>

                      ${esc(
                        trade.userEmail ||
                        trade.userId ||
                        ""
                      )}

                      •

                      ${date(
                        trade.updated ||
                        trade.created ||
                        trade.date
                      )}

                    </small>

                  </div>

                  <span class="value ${
                    n(trade.rr) >= 0
                      ? "positive"
                      : "negative"
                  }">

                    ${
                      n(trade.rr) >= 0
                        ? "+"
                        : ""
                    }

                    ${n(trade.rr).toFixed(2)}R

                  </span>

                </div>
              `
            )
            .join("")}

        </div>
      `

      : empty();
  }
}


// ============================================================
// MEMBERS
// ============================================================

function renderMembers() {

  const tableElement = $("membersTable");

  if (!tableElement) return;


  let members = state.users;


  const searchElement = $("memberSearch");
  const filterElement = $("memberFilter");


  const queryText =
    searchElement?.value
      ?.toLowerCase()
      .trim() || "";


  const filter =
    filterElement?.value || "all";


  members = members.filter(user => {

    const matchesSearch =
      !queryText ||
      `${user.name || ""} ${user.email || ""}`
        .toLowerCase()
        .includes(queryText);


    const matchesFilter =
      filter === "all" ||

      (
        filter === "premium" &&
        String(
          user.membership || ""
        ).toLowerCase() === "premium"
      ) ||

      (
        filter === "admin" &&
        user.role === "admin"
      ) ||

      (
        filter === "pending" &&
        (
          !user.active ||
          user.status === "pending"
        )
      ) ||

      (
        filter === "active" &&
        user.active === true
      ) ||

      (
        filter === "suspended" &&
        user.status === "suspended"
      );


    return (
      matchesSearch &&
      matchesFilter
    );
  });


  tableElement.innerHTML = members.length

    ? table(
        [
          "User",
          "Email",
          "Membership",
          "Role",
          "Status",
          "Joined"
        ],

        members.map(user => [

          `<strong>${esc(
            user.name || "—"
          )}</strong>`,

          esc(
            user.email || "—"
          ),

          badge(
            user.membership || "free",

            String(
              user.membership || ""
            ).toLowerCase() === "premium"
              ? "gold"
              : ""
          ),

          badge(
            user.role || "member",

            user.role === "admin"
              ? "blue"
              : ""
          ),

          badge(
            user.status ||
            (
              user.active === false
                ? "pending"
                : "active"
            ),

            user.active === false
              ? "gold"
              : "green"
          ),

          date(
            user.createdAt ||
            user.joinedAt ||
            user.created
          )

        ])
      )

    : empty();
}


// ============================================================
// ACADEMY
// ============================================================

function renderAcademy() {

  const tableElement = $("academyTable");

  if (!tableElement) return;


  const academy = [...state.academy]
    .sort(
      (a, b) =>
        n(a.order) -
        n(b.order)
    );


  tableElement.innerHTML = academy.length

    ? table(

        [
          "Title",
          "Module",
          "Order",
          "Status",
          "Source",
          "Updated"
        ],

        academy.map(item => [

          esc(
            item.title ||
            item.name ||
            item.lessonTitle ||
            "Untitled"
          ),

          esc(
            item.module ||
            item.moduleTitle ||
            item.category ||
            item.section ||
            "—"
          ),

          esc(
            item.order ??
            item.position ??
            "—"
          ),

          badge(
            item.status ||
            (
              item.published === false
                ? "draft"
                : "published"
            ),

            String(
              item.status || ""
            ).toLowerCase() === "draft" ||
            item.published === false
              ? "gold"
              : "green"
          ),

          badge(
            item._source ||
            "academy",

            item._source ===
            "premium_academy"
              ? "gold"
              : ""
          ),

          date(
            item.updatedAt ||
            item.updated ||
            item.createdAt ||
            item.created
          )

        ])

      )

    : empty();
}


// ============================================================
// RESOURCES
// ============================================================

function renderResources() {

  const tableElement = $("resourcesTable");

  if (!tableElement) return;


  const resources =
    state.resources;


  tableElement.innerHTML = resources.length

    ? table(

        [
          "Title",
          "Category",
          "Type",
          "Premium",
          "Source",
          "Updated"
        ],

        resources.map(item => {

          const isPremium =
            item.premium === true ||
            item.premiumOnly === true ||
            item._source ===
              "premium_resources";


          return [

            esc(
              item.title ||
              item.name ||
              item.resourceName ||
              "Untitled"
            ),

            esc(
              item.category ||
              item.section ||
              "—"
            ),

            esc(
              item.type ||
              item.fileType ||
              item.mimeType ||
              "—"
            ),

            badge(
              isPremium
                ? "Premium"
                : "Free",

              isPremium
                ? "gold"
                : "green"
            ),

            badge(
              item._source ||
              "resources",

              item._source ===
              "premium_resources"
                ? "gold"
                : ""
            ),

            date(
              item.updatedAt ||
              item.createdAt ||
              item.created
            )

          ];
        })

      )

    : empty();
}


// ============================================================
// VIDEOS
// ============================================================

function renderVideos() {

  const tableElement = $("videosTable");

  if (!tableElement) return;


  const videos =
    state.videos;


  tableElement.innerHTML = videos.length

    ? table(

        [
          "Title",
          "Category",
          "Duration",
          "Premium",
          "Published",
          "Source"
        ],

        videos.map(item => {

          const isPremium =
            item.premiumOnly === true ||
            item.premium === true ||
            item._source ===
              "premium_videos";


          const isDraft =
            item.published === false ||
            item.status === "draft";


          return [

            esc(
              item.title ||
              item.name ||
              item.videoTitle ||
              "Untitled"
            ),

            esc(
              item.category ||
              item.section ||
              "—"
            ),

            esc(
              item.duration ||
              item.length ||
              "—"
            ),

            badge(
              isPremium
                ? "Premium"
                : "Free",

              isPremium
                ? "gold"
                : "green"
            ),

            badge(
              isDraft
                ? "Draft"
                : "Published",

              isDraft
                ? "gold"
                : "green"
            ),

            badge(
              item._source ||
              "videos",

              item._source ===
              "premium_videos"
                ? "gold"
                : ""
            )

          ];
        })

      )

    : empty();
}


// ============================================================
// TRADES
// ============================================================

function renderTrades() {

  const tableElement = $("tradesTable");

  if (!tableElement) return;


  let trades =
    state.trades;


  const searchElement =
    $("tradeSearch");

  const statusElement =
    $("tradeStatus");

  const visibilityElement =
    $("tradeVisibility");


  const search =
    searchElement?.value
      ?.toLowerCase()
      .trim() || "";


  const selectedStatus =
    statusElement?.value ||
    "all";


  const selectedVisibility =
    visibilityElement?.value ||
    "all";


  trades = trades.filter(trade => {

    const searchMatches =
      !search ||

      `
        ${trade.userEmail || ""}
        ${trade.userId || ""}
        ${trade.pair || ""}
        ${trade.account || ""}
        ${trade.accountId || ""}
      `
        .toLowerCase()
        .includes(search);


    const tradeResult =
      String(
        trade.result ||
        trade.status ||
        "Pending"
      ).toLowerCase();


    const statusMatches =
      selectedStatus === "all" ||
      tradeResult ===
        selectedStatus.toLowerCase();


    const visibilityMatches =
      selectedVisibility === "all" ||

      (
        selectedVisibility === "public" &&
        trade.public === true
      ) ||

      (
        selectedVisibility === "private" &&
        trade.public !== true
      );


    return (
      searchMatches &&
      statusMatches &&
      visibilityMatches
    );
  });


  trades.sort(
    (a, b) =>
      millis(
        b.updated ||
        b.created ||
        b.date
      ) -
      millis(
        a.updated ||
        a.created ||
        a.date
      )
  );


  tableElement.innerHTML = trades.length

    ? table(

        [
          "Date / Time",
          "Student",
          "Account",
          "Pair",
          "Direction",
          "Result",
          "RR",
          "P/L",
          "Visibility"
        ],

        trades.map(trade => {

          const profit =
            n(trade.profit);

          const commission =
            n(trade.commission);

          const pl =
            profit -
            commission;


          const result =
            trade.result ||
            trade.status ||
            "Pending";


          const resultLower =
            String(result)
              .toLowerCase();


          const resultClass =
            resultLower === "win"
              ? "green"
              : resultLower === "loss"
                ? "red"
                : "gold";


          return [

            date(
              trade.updated ||
              trade.created ||
              trade.date
            ),

            esc(
              trade.userEmail ||
              trade.userId ||
              "—"
            ),

            esc(
              trade.account ||
              trade.accountId ||
              "—"
            ),

            `<strong>${esc(
              trade.pair ||
              "—"
            )}</strong>`,

            esc(
              trade.direction ||
              "—"
            ),

            badge(
              result,
              resultClass
            ),

            `
              <span class="${
                n(trade.rr) >= 0
                  ? "positive"
                  : "negative"
              }">

                ${n(trade.rr).toFixed(2)}R

              </span>
            `,

            `
              <span class="${
                pl >= 0
                  ? "positive"
                  : "negative"
              }">

                ${pl >= 0 ? "+" : "-"}$
                ${money(Math.abs(pl))}

              </span>
            `,

            badge(
              trade.public === true
                ? "Public"
                : "Private",

              trade.public === true
                ? "blue"
                : ""
            )

          ];
        })

      )

    : empty();
}


// ============================================================
// PAYMENTS
// ============================================================

function renderPayments() {

  const tableElement =
    $("paymentsTable");

  if (!tableElement) return;


  let payments =
    state.payments;


  const searchElement =
    $("paymentSearch");

  const statusElement =
    $("paymentStatus");


  const search =
    searchElement?.value
      ?.toLowerCase()
      .trim() || "";


  const selectedStatus =
    statusElement?.value ||
    "all";


  payments =
    payments.filter(payment => {

      const searchMatches =
        !search ||

        `
          ${payment.name || ""}
          ${payment.fullName || ""}
          ${payment.email || ""}
          ${payment.transactionId || ""}
          ${payment.transaction || ""}
          ${payment.mpesaCode || ""}
          ${payment.plan || ""}
          ${payment.package || ""}
        `
          .toLowerCase()
          .includes(search);


      const statusMatches =
        selectedStatus === "all" ||
        status(payment.status) ===
          selectedStatus;


      return (
        searchMatches &&
        statusMatches
      );
    });


  payments.sort(
    (a, b) =>
      millis(
        b.submittedAt ||
        b.createdAt ||
        b.created
      ) -
      millis(
        a.submittedAt ||
        a.createdAt ||
        a.created
      )
  );


  tableElement.innerHTML = payments.length

    ? table(

        [
          "Student",
          "Plan",
          "Method",
          "Amount",
          "Transaction",
          "Status",
          "Date"
        ],

        payments.map(payment => {

          const paymentStatus =
            status(payment.status);


          const badgeClass =
            paymentStatus === "approved"
              ? "green"
              : paymentStatus === "rejected"
                ? "red"
                : "gold";


          return [

            `
              ${esc(
                payment.name ||
                payment.fullName ||
                "—"
              )}

              <small class="muted">
                ${esc(
                  payment.email ||
                  ""
                )}
              </small>
            `,

            esc(
              payment.plan ||
              payment.package ||
              payment.membershipPlan ||
              "—"
            ),

            esc(
              payment.paymentMethod ||
              payment.method ||
              payment.payment_method ||
              "—"
            ),

            `
              $${money(
                payment.amountUSD ??
                payment.amount ??
                payment.amountPaidUSD
              )}
            `,

            esc(
              payment.transactionId ||
              payment.transaction ||
              payment.mpesaCode ||
              payment.reference ||
              "—"
            ),

            badge(
              payment.status ||
              "pending",

              badgeClass
            ),

            date(
              payment.submittedAt ||
              payment.createdAt ||
              payment.created
            )

          ];
        })

      )

    : empty();
}


// ============================================================
// EMPTY STATE
// ============================================================

function empty() {

  return `
    <div class="empty">
      No data found.
    </div>
  `;
}


// ============================================================
// BADGE
// ============================================================

function badge(value, className = "") {

  return `
    <span class="badge ${esc(className)}">
      ${esc(value)}
    </span>
  `;
}


// ============================================================
// TABLE BUILDER
// ============================================================

function table(head, rows) {

  return `
    <table class="data-table">

      <thead>
        <tr>

          ${head
            .map(
              heading =>
                `<th>${esc(heading)}</th>`
            )
            .join("")}

        </tr>
      </thead>


      <tbody>

        ${rows
          .map(
            row => `
              <tr>

                ${row
                  .map(
                    cell =>
                      `<td>${cell}</td>`
                  )
                  .join("")}

              </tr>
            `
          )
          .join("")}

      </tbody>

    </table>
  `;
}


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(
  auth,
  user => {

    if (!user) {

      location.href = "/login";

      return;
    }


    console.log(
      "Admin authenticated:",
      user.email
    );


    start();
  },

  error => {

    console.error(
      "Authentication state error:",
      error
    );

    showError(
      error,
      "Authentication"
    );
  }
);