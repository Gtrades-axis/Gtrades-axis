import { auth, db } from "/js/firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  collection,
  collectionGroup,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


// ============================================================
// GTRADES-AXIS™ ADMIN OVERHAUL
// Dashboard + Members + Academy + Resources + Videos
// + Trades + Payments + Multi-file R2 Upload System
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const R2_WORKER_ENDPOINT =
  window.R2_WORKER_ENDPOINT ||
  document
    .querySelector('meta[name="r2-worker-endpoint"]')
    ?.content ||
  "https://r2-uploader.davidthuku574.workers.dev";

const MAX_RESOURCE_SIZE =
  250 * 1024 * 1024;

const MAX_VIDEO_SIZE =
  2 * 1024 * 1024 * 1024;

const RESOURCE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".csv",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp"
];

const VIDEO_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".mov",
  ".m4v"
];


// ============================================================
// DOM HELPERS
// ============================================================

const $ = id =>
  document.getElementById(id);


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


const n = value =>
  Number(value) || 0;


// ============================================================
// DATE HELPERS
// ============================================================

function millis(value) {

  if (!value) {
    return 0;
  }

  if (value?.toDate) {
    return value.toDate().getTime();
  }

  if (value?.seconds) {
    return value.seconds * 1000;
  }

  const parsed =
    Date.parse(String(value));

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}


function date(value) {

  const timestamp =
    millis(value);

  return timestamp
    ? new Date(timestamp).toLocaleString()
    : "—";
}


// ============================================================
// STATUS HELPERS
// ============================================================

function status(value) {

  const x =
    String(value || "pending")
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

  return n(value).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
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
// UPLOAD STATE
// ============================================================

const uploadState = {

  type: "resources",

  queue: [],

  uploading: false,

  currentIndex: 0,

  completed: 0,

  failed: 0,

  duplicates: 0

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

function normaliseDocs(
  snapshot,
  source
) {

  return snapshot.docs.map(
    docSnap => ({
      id: docSnap.id,
      _source: source,
      ...docSnap.data()
    })
  );
}


// ============================================================
// ERROR DISPLAY
// ============================================================

function showError(
  error,
  source = "Firestore"
) {

  console.error(
    source,
    error
  );

  const box =
    $("errorBox");

  if (!box) {
    return;
  }

  box.classList.remove(
    "hidden"
  );

  box.textContent =
    `${source}: ${
      error?.code || "error"
    } — ${
      error?.message || error
    }`;
}


// ============================================================
// TOAST
// ============================================================

function toast(
  message,
  type = "info"
) {

  let container =
    $("adminToastContainer");

  if (!container) {

    container =
      document.createElement("div");

    container.id =
      "adminToastContainer";

    container.className =
      "admin-toast-container";

    document.body.appendChild(
      container
    );
  }


  const item =
    document.createElement("div");

  item.className =
    `admin-toast ${type}`;

  item.innerHTML = `
    <span class="toast-icon">
      ${
        type === "success"
          ? "✓"
          : type === "error"
            ? "!"
            : "i"
      }
    </span>

    <span>
      ${esc(message)}
    </span>
  `;


  container.appendChild(
    item
  );


  setTimeout(() => {

    item.classList.add(
      "hide"
    );

    setTimeout(
      () => item.remove(),
      300
    );

  }, 4000);
}


// ============================================================
// MULTIPLE COLLECTION LISTENER
// ============================================================

function listenMany(
  names,
  key,
  renderer
) {

  const unsubscribers = [];

  const buckets =
    new Map();


  for (const name of names) {

    const unsubscribe =
      onSnapshot(

        collection(
          db,
          name
        ),

        snapshot => {

          buckets.set(
            name,
            normaliseDocs(
              snapshot,
              name
            )
          );


          state[key] =
            names.flatMap(
              collectionName =>
                buckets.get(
                  collectionName
                ) || []
            );


          const seen =
            new Set();


          state[key] =
            state[key].filter(
              item => {

                const id =
                  `${item._source || ""}:${String(item.id)}`;

                if (
                  seen.has(id)
                ) {
                  return false;
                }

                seen.add(id);

                return true;
              }
            );


          renderer();
        },

        error => {

          console.error(
            `Firestore ${name} listener failed`,
            error
          );

          showError(
            error,
            name
          );
        }
      );


    unsubscribers.push(
      unsubscribe
    );
  }


  return () => {

    unsubscribers.forEach(
      unsubscribe => {

        try {
          unsubscribe();
        } catch (error) {
          console.error(error);
        }

      }
    );
  };
}


// ============================================================
// START
// ============================================================

function start() {

  listenMany(
    ["users"],
    "users",
    renderAll
  );


  listenMany(
    SOURCES.academy,
    "academy",
    renderAll
  );


  listenMany(
    SOURCES.resources,
    "resources",
    renderAll
  );


  listenMany(
    SOURCES.videos,
    "videos",
    renderAll
  );


  listenMany(
    SOURCES.payments,
    "payments",
    renderAll
  );


  onSnapshot(

    collectionGroup(
      db,
      "trades"
    ),

    snapshot => {

      state.trades =
        snapshot.docs.map(
          docSnap => {

            const data =
              docSnap.data();

            const parent =
              docSnap.ref.parent.parent;

            const ownerId =
              data.userId ||
              parent?.id ||
              "";


            return {

              id: docSnap.id,

              userId: ownerId,

              _path:
                docSnap.ref.path,

              ...data

            };
          }
        );


      renderAll();
    },

    error => {

      console.error(
        "Trades listener failed",
        error
      );

      showError(
        error,
        "Trades"
      );
    }
  );


  injectUploadInterface();

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

      button.onclick =
        () =>
          openTab(
            button.dataset.tab
          );

    });


  document
    .querySelectorAll("[data-open-tab]")
    .forEach(button => {

      button.onclick =
        () =>
          openTab(
            button.dataset.openTab
          );

    });


  const menuButton =
    $("menuBtn");

  if (menuButton) {

    menuButton.onclick =
      () =>
        $("sidebar")
          ?.classList.toggle(
            "open"
          );
  }


  const logoutButton =
    $("logoutBtn");

  if (logoutButton) {

    logoutButton.onclick =
      async () => {

        try {

          await signOut(auth);

          location.href =
            "/login";

        } catch (error) {

          showError(
            error,
            "Logout"
          );
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

    const element =
      $(id);

    if (element) {

      element.addEventListener(
        "input",
        renderAll
      );
    }
  });


  bindUploadEvents();

  // Content CRUD uses one delegated handler so it continues to work
  // after every live Firestore re-render.
  document.addEventListener("click", async event => {
    const editButton = event.target.closest(".content-edit");
    const deleteButton = event.target.closest(".content-delete");
    const paymentButton = event.target.closest(".payment-action");

    if (!editButton && !deleteButton && !paymentButton) return;

    const button = editButton || deleteButton || paymentButton;
    const type = button.dataset.type;
    const source = button.dataset.source;
    const id = button.dataset.id;

    button.disabled = true;

    try {
      if (paymentButton) {
        await reviewPayment(
          id,
          button.dataset.userId,
          button.dataset.action
        );
        toast(
          button.dataset.action === "approve"
            ? "Payment approved and membership updated."
            : "Payment rejected.",
          "success"
        );
      } else if (editButton) {
        await editContent(type, source, id);
        toast("Content updated successfully.", "success");
      } else {
        await deleteContent(type, source, id);
        toast("Content record deleted. The R2 file was kept.", "success");
      }
    } catch (error) {
      console.error("CONTENT CRUD ERROR:", error);
      showError(error, "Content management");
      toast(error?.message || "Content operation failed.", "error");
    } finally {
      button.disabled = false;
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
        section.id ===
          `tab-${tab}`
      );

    });


  $("sidebar")
    ?.classList.remove(
      "open"
    );


  if (
    tab === "resources" ||
    tab === "videos"
  ) {

    setTimeout(
      () =>
        setUploadType(
          tab
        ),
      50
    );
  }
}


// ============================================================
// MAIN RENDER
// ============================================================

function renderAll() {

  const s =
    state;


  const welcome =
    $("welcomeText");

  if (welcome) {

    welcome.textContent =
      `Live data • ${
        s.users.length
      } members • ${
        s.trades.length
      } journal trades • ${
        s.payments.length
      } payments`;
  }


  const badgeSources = {
    members: s.users,
    academy: s.academy,
    resources: s.resources,
    videos: s.videos,
    trades: s.trades,
    payments: s.payments
  };

  Object.entries(badgeSources).forEach(([key, value]) => {
    const badge = $(`${key}Badge`);
    if (badge) badge.textContent = Array.isArray(value) ? value.length : 0;
  });


  const dashboard =
    $("dashboardStats");

  if (dashboard) {

    dashboard.innerHTML = [

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
            ).toLowerCase() ===
            "premium"
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


  const approved =
    s.payments.filter(
      payment =>
        status(
          payment.status
        ) === "approved"
    );


  const revenue =
    approved.reduce(
      (
        total,
        payment
      ) =>
        total +
        n(
          payment.amountUSD ??
          payment.amount ??
          payment.amountPaidUSD
        ),
      0
    );


  const paymentStats =
    $("paymentStats");

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
            status(
              payment.status
            ) === "pending"
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


  renderMembers();
  renderAcademy();
  renderResources();
  renderVideos();
  renderTrades();
  renderPayments();
  renderRecent();
  updateUploadSummary();
}


// ============================================================
// STAT
// ============================================================

function stat(
  icon,
  value,
  label
) {

  return `
    <div class="stat-card">

      <div class="icon">
        <i class="fa-solid ${esc(icon)}"></i>
      </div>

      <strong>
        ${esc(value)}
      </strong>

      <span>
        ${esc(label)}
      </span>

    </div>
  `;
}


// ============================================================
// RECENT
// ============================================================

function renderRecent() {

  const users =
    [...state.users]
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


  const recentMembers =
    $("recentMembers");


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
                          ${esc(
                            user.email ||
                            ""
                          )}
                        </small>

                      </div>

                      <span class="badge ${
                        String(
                          user.membership ||
                          ""
                        ).toLowerCase() ===
                        "premium"
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


  const payments =
    [...state.payments]
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


  const recentPayments =
    $("recentPayments");


  if (recentPayments) {

    recentPayments.innerHTML = `
      <div class="list">

        ${
          payments.length

            ? payments
                .map(
                  payment => {

                    const paymentStatus =
                      status(
                        payment.status
                      );


                    const badgeClass =
                      paymentStatus ===
                      "approved"
                        ? "green"
                        : paymentStatus ===
                          "rejected"
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
                  }
                )
                .join("")

            : empty()
        }

      </div>
    `;
  }


  const trades =
    [...state.trades]
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


  const recentTrades =
    $("recentTrades");


  if (recentTrades) {

    recentTrades.innerHTML =
      trades.length

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

                      ${n(
                        trade.rr
                      ).toFixed(2)}R

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

  const element =
    $("membersTable");

  if (!element) {
    return;
  }


  const search =
    $("memberSearch")
      ?.value
      ?.toLowerCase()
      .trim() || "";


  const filter =
    $("memberFilter")
      ?.value || "all";


  let members =
    state.users;


  members =
    members.filter(
      user => {

        const searchMatches =
          !search ||
          `${user.name || ""} ${
            user.email || ""
          }`
            .toLowerCase()
            .includes(search);


        const filterMatches =

          filter === "all" ||

          (
            filter === "premium" &&
            String(
              user.membership || ""
            ).toLowerCase() ===
              "premium"
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
            user.status ===
              "suspended"
          );


        return (
          searchMatches &&
          filterMatches
        );
      }
    );


  element.innerHTML =
    members.length

      ? table(

          [
            "User",
            "Email",
            "Membership",
            "Role",
            "Status",
            "Joined"
          ],

          members.map(
            user => [

              `<strong>${esc(
                user.name ||
                "—"
              )}</strong>`,

              esc(
                user.email ||
                "—"
              ),

              badge(
                user.membership ||
                "free",

                String(
                  user.membership ||
                  ""
                ).toLowerCase() ===
                  "premium"
                  ? "gold"
                  : ""
              ),

              badge(
                user.role ||
                "member",

                user.role ===
                  "admin"
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

            ]
          )

        )

      : empty();
}


// ============================================================
// CONTENT MANAGEMENT ACTIONS
// ============================================================

function contentActions(item, type) {
  const source = item._source || type;
  const id = item.id || "";

  return `
    <div class="admin-actions">
      <button type="button" class="manage-btn content-edit"
        data-type="${esc(type)}"
        data-source="${esc(source)}"
        data-id="${esc(id)}">
        <i class="fa-solid fa-pen"></i> Edit
      </button>
      <button type="button" class="manage-btn content-delete"
        data-type="${esc(type)}"
        data-source="${esc(source)}"
        data-id="${esc(id)}"
        style="color:var(--red);">
        <i class="fa-solid fa-trash"></i> Delete
      </button>
    </div>
  `;
}

async function editContent(type, source, id) {
  if (!id || !source) throw new Error("Missing content identifier.");

  const snap = await getDoc(doc(db, source, id));
  if (!snap.exists()) throw new Error("This content no longer exists.");

  const data = snap.data();

  if (type === "academy") {
    const title = prompt("Lesson title:", data.title || data.name || "");
    if (title === null) return;
    const description = prompt("Description:", data.description || "");
    if (description === null) return;
    const orderValue = prompt("Order number:", String(data.order ?? data.position ?? 0));
    if (orderValue === null) return;
    const publishedValue = prompt(
      "Published? Enter yes or no:",
      data.published === false || data.status === "draft" ? "no" : "yes"
    );
    if (publishedValue === null) return;

    await updateDoc(doc(db, source, id), {
      title: title.trim(),
      name: title.trim(),
      description: description.trim(),
      order: Number(orderValue) || 0,
      published: publishedValue.trim().toLowerCase() !== "no",
      status: publishedValue.trim().toLowerCase() === "no" ? "draft" : "published",
      updatedAt: serverTimestamp()
    });
    return;
  }

  if (type === "resources") {
    const title = prompt("Resource title:", data.title || data.name || "");
    if (title === null) return;
    const category = prompt("Category:", data.category || "General");
    if (category === null) return;
    const premiumValue = prompt(
      "Premium? Enter yes or no:",
      data.premiumOnly === true || data.premium === true ? "yes" : "no"
    );
    if (premiumValue === null) return;

    const premium = premiumValue.trim().toLowerCase() === "yes";
    await updateDoc(doc(db, source, id), {
      title: title.trim(),
      name: title.trim(),
      category: category.trim() || "General",
      premium,
      premiumOnly: premium,
      updatedAt: serverTimestamp()
    });
    return;
  }

  if (type === "videos") {
    const title = prompt("Video title:", data.title || data.name || "");
    if (title === null) return;
    const category = prompt("Category:", data.category || "General");
    if (category === null) return;
    const duration = prompt("Duration:", data.duration || "");
    if (duration === null) return;
    const premiumValue = prompt(
      "Premium? Enter yes or no:",
      data.premiumOnly === true || data.premium === true ? "yes" : "no"
    );
    if (premiumValue === null) return;
    const publishedValue = prompt(
      "Published? Enter yes or no:",
      data.published === false || data.status === "draft" ? "no" : "yes"
    );
    if (publishedValue === null) return;

    const premium = premiumValue.trim().toLowerCase() === "yes";
    const published = publishedValue.trim().toLowerCase() !== "no";
    await updateDoc(doc(db, source, id), {
      title: title.trim(),
      name: title.trim(),
      category: category.trim() || "General",
      duration: duration.trim(),
      premium,
      premiumOnly: premium,
      published,
      status: published ? "published" : "draft",
      updatedAt: serverTimestamp()
    });
  }
}

async function deleteContent(type, source, id) {
  if (!id || !source) throw new Error("Missing content identifier.");

  const snap = await getDoc(doc(db, source, id));
  if (!snap.exists()) throw new Error("This content no longer exists.");

  const data = snap.data();
  const label = data.title || data.name || data.fileName || "this item";

  if (!confirm(`Delete "${label}" from ${source}? This removes the Firestore record. The R2 file is kept.`)) {
    return;
  }

  await deleteDoc(doc(db, source, id));
}

// ============================================================
// ACADEMY
// ============================================================

function renderAcademy() {

  const element =
    $("academyTable");

  if (!element) {
    return;
  }


  const academy =
    [...state.academy]
      .sort(
        (a, b) =>
          n(a.order) -
          n(b.order)
      );


  element.innerHTML =
    academy.length

      ? table(

          [
            "Title",
            "Module",
            "Order",
            "Status",
            "Source",
            "Updated",
            "Actions"
          ],

          academy.map(
            item => [

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
                ).toLowerCase() ===
                  "draft" ||
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
              ),

              contentActions(item, "academy")

            ]
          )

        )

      : empty();
}


// ============================================================
// RESOURCES
// ============================================================

function renderResources() {

  const element =
    $("resourcesTable");

  if (!element) {
    return;
  }


  const resources =
    state.resources;


  element.innerHTML =
    resources.length

      ? table(

          [
            "Title",
            "Category",
            "Type",
            "Premium",
            "Source",
            "Updated",
            "Actions"
          ],

          resources.map(
            item => {

              const premium =
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
                  premium
                    ? "Premium"
                    : "Free",

                  premium
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
                ),

                contentActions(item, "resources")

              ];
            }
          )

        )

      : empty();
}


// ============================================================
// VIDEOS
// ============================================================

function renderVideos() {

  const element =
    $("videosTable");

  if (!element) {
    return;
  }


  const videos =
    state.videos;


  element.innerHTML =
    videos.length

      ? table(

          [
            "Title",
            "Category",
            "Duration",
            "Premium",
            "Published",
            "Source",
            "Actions"
          ],

          videos.map(
            item => {

              const premium =
                item.premiumOnly === true ||
                item.premium === true ||
                item._source ===
                  "premium_videos";


              const draft =
                item.published === false ||
                item.status ===
                  "draft";


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
                  premium
                    ? "Premium"
                    : "Free",

                  premium
                    ? "gold"
                    : "green"
                ),

                badge(
                  draft
                    ? "Draft"
                    : "Published",

                  draft
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
                ),

                contentActions(item, "videos")

              ];
            }
          )

        )

      : empty();
}


// ============================================================
// TRADES
// ============================================================

function renderTrades() {

  const element =
    $("tradesTable");

  if (!element) {
    return;
  }


  const search =
    $("tradeSearch")
      ?.value
      ?.toLowerCase()
      .trim() || "";


  const selectedStatus =
    $("tradeStatus")
      ?.value || "all";


  const visibility =
    $("tradeVisibility")
      ?.value || "all";


  let trades =
    state.trades.filter(
      trade => {

        const matchesSearch =
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


        const result =
          String(
            trade.result ||
            trade.status ||
            "Pending"
          ).toLowerCase();


        const matchesStatus =
          selectedStatus ===
            "all" ||
          result ===
            selectedStatus
              .toLowerCase();


        const matchesVisibility =
          visibility === "all" ||

          (
            visibility ===
              "public" &&
            trade.public ===
              true
          ) ||

          (
            visibility ===
              "private" &&
            trade.public !==
              true
          );


        return (
          matchesSearch &&
          matchesStatus &&
          matchesVisibility
        );
      }
    );


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


  element.innerHTML =
    trades.length

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

          trades.map(
            trade => {

              const pl =
                n(trade.profit) -
                n(trade.commission);


              const result =
                trade.result ||
                trade.status ||
                "Pending";


              const resultClass =
                String(result)
                  .toLowerCase() ===
                  "win"
                    ? "green"
                    : String(result)
                        .toLowerCase() ===
                      "loss"
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

                    ${n(
                      trade.rr
                    ).toFixed(2)}R

                  </span>
                `,

                `
                  <span class="${
                    pl >= 0
                      ? "positive"
                      : "negative"
                  }">

                    ${
                      pl >= 0
                        ? "+"
                        : "-"
                    }$

                    ${money(
                      Math.abs(pl)
                    )}

                  </span>
                `,

                badge(
                  trade.public ===
                    true
                    ? "Public"
                    : "Private",

                  trade.public ===
                    true
                    ? "blue"
                    : ""
                )

              ];
            }
          )

        )

      : empty();
}


// ============================================================
// PAYMENT ACTIONS
// ============================================================

function paymentActions(payment) {
  const current = status(payment.status);
  if (current !== "pending") {
    return `<span class="muted">Reviewed</span>`;
  }

  const id = payment.id || "";
  const userId = payment.userId || payment.uid || "";

  return `
    <div class="admin-actions">
      <button type="button" class="manage-btn payment-action"
        data-action="approve"
        data-id="${esc(id)}"
        data-user-id="${esc(userId)}"
        style="color:var(--green);">
        <i class="fa-solid fa-check"></i> Approve
      </button>
      <button type="button" class="manage-btn payment-action"
        data-action="reject"
        data-id="${esc(id)}"
        data-user-id="${esc(userId)}"
        style="color:var(--red);">
        <i class="fa-solid fa-xmark"></i> Reject
      </button>
    </div>
  `;
}

async function reviewPayment(paymentId, userId, action) {
  if (!paymentId) throw new Error("Missing payment ID.");

  const nextStatus = action === "approve" ? "approved" : "rejected";
  if (!confirm(`${action === "approve" ? "Approve" : "Reject"} this payment?`)) return;

  await updateDoc(doc(db, "payments", paymentId), {
    status: nextStatus,
    reviewedAt: serverTimestamp(),
    reviewedBy: auth.currentUser?.uid || "",
    reviewedByEmail: auth.currentUser?.email || ""
  });

  if (action === "approve" && userId) {
    await updateDoc(doc(db, "users", userId), {
      membership: "premium",
      updatedAt: serverTimestamp()
    });
  }
}

// ============================================================
// PAYMENTS
// ============================================================

function renderPayments() {

  const element =
    $("paymentsTable");

  if (!element) {
    return;
  }


  const search =
    $("paymentSearch")
      ?.value
      ?.toLowerCase()
      .trim() || "";


  const selectedStatus =
    $("paymentStatus")
      ?.value || "all";


  let payments =
    state.payments.filter(
      payment => {

        const matchesSearch =
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


        const matchesStatus =
          selectedStatus ===
            "all" ||
          status(
            payment.status
          ) ===
            selectedStatus;


        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );


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


  element.innerHTML =
    payments.length

      ? table(

          [
            "Student",
            "Plan",
            "Method",
            "Amount",
            "Transaction",
            "Status",
            "Date",
            "Actions"
          ],

          payments.map(
            payment => {

              const currentStatus =
                status(
                  payment.status
                );


              const className =
                currentStatus ===
                  "approved"
                  ? "green"
                  : currentStatus ===
                    "rejected"
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
                  className
                ),

                date(
                  payment.submittedAt ||
                  payment.createdAt ||
                  payment.created
                ),

                paymentActions(payment)

              ];
            }
          )

        )

      : empty();
}


// ============================================================
// TABLE HELPERS
// ============================================================

function empty() {

  return `
    <div class="empty">
      No data found.
    </div>
  `;
}


function badge(
  value,
  className = ""
) {

  return `
    <span class="badge ${esc(
      className
    )}">
      ${esc(value)}
    </span>
  `;
}


function table(
  head,
  rows
) {

  return `
    <table class="data-table">

      <thead>

        <tr>

          ${head
            .map(
              heading =>
                `<th>${esc(
                  heading
                )}</th>`
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
// UPLOAD UI
// ============================================================

function injectUploadInterface() {

  injectUploadStyles();


  const resourceTab =
    document.querySelector(
      "#tab-resources"
    );


  const videoTab =
    document.querySelector(
      "#tab-videos"
    );


  if (
    resourceTab &&
    !resourceTab.querySelector(
      "#resourceUploadStudio"
    )
  ) {

    resourceTab.insertAdjacentHTML(
      "afterbegin",
      createUploadStudio(
        "resources"
      )
    );
  }


  if (
    videoTab &&
    !videoTab.querySelector(
      "#videoUploadStudio"
    )
  ) {

    videoTab.insertAdjacentHTML(
      "afterbegin",
      createUploadStudio(
        "videos"
      )
    );
  }
}


// ============================================================
// UPLOAD STUDIO HTML
// ============================================================

function createUploadStudio(
  type
) {

  const isVideo =
    type === "videos";


  const prefix =
    isVideo
      ? "video"
      : "resource";


  return `

    <section
      id="${prefix}UploadStudio"
      class="upload-studio"
      data-upload-type="${type}"
    >

      <div class="upload-studio-header">

        <div>

          <div class="upload-eyebrow">
            GTRADES-AXIS™
          </div>

          <h2>
            ${
              isVideo
                ? "Video Upload Studio"
                : "Resource Upload Studio"
            }
          </h2>

          <p>
            Upload multiple ${
              isVideo
                ? "academy videos"
                : "academy resources"
            }
            securely with live progress tracking.
          </p>

        </div>

        <div class="upload-header-icon">
          <i class="fa-solid ${
            isVideo
              ? "fa-video"
              : "fa-cloud-arrow-up"
          }"></i>
        </div>

      </div>


      <div class="upload-settings-grid">

        <label class="upload-field">

          <span>
            Category
          </span>

          <input
            id="${prefix}UploadCategory"
            type="text"
            placeholder="${
              isVideo
                ? "e.g. Market Structure"
                : "e.g. Trading Plans"
            }"
          >

        </label>


        <label class="upload-field">

          <span>
            Access
          </span>

          <select
            id="${prefix}UploadAccess"
          >

            <option value="free">
              Free
            </option>

            <option value="premium">
              Premium
            </option>

          </select>

        </label>


        ${
          isVideo

            ? `

              <label class="upload-field">

                <span>
                  Publishing
                </span>

                <select
                  id="videoUploadPublished"
                >

                  <option value="published">
                    Published
                  </option>

                  <option value="draft">
                    Draft
                  </option>

                </select>

              </label>

            `

            : `

              <label class="upload-field">

                <span>
                  Resource Type
                </span>

                <select
                  id="resourceUploadType"
                >

                  <option value="document">
                    Document
                  </option>

                  <option value="worksheet">
                    Worksheet
                  </option>

                  <option value="template">
                    Template
                  </option>

                  <option value="checklist">
                    Checklist
                  </option>

                  <option value="other">
                    Other
                  </option>

                </select>

              </label>

            `
        }

      </div>


      <div
        class="upload-dropzone"
        id="${prefix}Dropzone"
        data-upload-type="${type}"
      >

        <input
          id="${prefix}FileInput"
          type="file"
          ${
            isVideo
              ? `accept="${VIDEO_EXTENSIONS.join(",")}"`
              : `accept="${RESOURCE_EXTENSIONS.join(",")}"`
          }
          multiple
          hidden
        >


        <div class="upload-cloud">

          <i class="fa-solid fa-cloud-arrow-up"></i>

        </div>


        <h3>
          Drop ${
            isVideo
              ? "videos"
              : "files"
          } here
        </h3>


        <p>
          or click to browse your computer
        </p>


        <button
          type="button"
          class="upload-browse-btn"
          data-upload-browse="${prefix}"
        >
          <i class="fa-solid fa-folder-open"></i>
          Choose Multiple Files
        </button>


        <div class="upload-supported">

          ${
            isVideo
              ? "MP4, WebM, MOV • Maximum 2 GB per video"
              : "PDF, DOC, XLS, PPT, ZIP, images and more • Maximum 250 MB"
          }

        </div>

      </div>


      <div
        class="upload-overall"
        id="${prefix}UploadOverall"
      >

        <div class="upload-overall-top">

          <strong>
            Upload Queue
          </strong>

          <span
            id="${prefix}QueueCount"
          >
            0 files
          </span>

        </div>


        <div class="upload-progress-track">

          <div
            class="upload-progress-bar"
            id="${prefix}OverallProgress"
          ></div>

        </div>


        <div
          class="upload-progress-text"
          id="${prefix}OverallText"
        >
          Ready
        </div>

      </div>


      <div
        class="upload-queue"
        id="${prefix}UploadQueue"
      ></div>


      <div class="upload-actions">

        <button
          type="button"
          class="upload-primary-btn"
          id="${prefix}StartUpload"
        >

          <i class="fa-solid fa-cloud-arrow-up"></i>

          Upload All

        </button>


        <button
          type="button"
          class="upload-secondary-btn"
          id="${prefix}ClearUpload"
        >

          <i class="fa-solid fa-broom"></i>

          Clear Completed

        </button>

      </div>

    </section>
  `;
}


// ============================================================
// UPLOAD STYLES
// ============================================================

function injectUploadStyles() {

  if (
    document.getElementById(
      "gtradesUploadStyles"
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "gtradesUploadStyles";


  style.textContent = `

    .upload-studio {
      margin: 0 0 28px;
      padding: 28px;
      border: 1px solid rgba(70, 140, 255, .18);
      border-radius: 24px;
      background:
        radial-gradient(
          circle at top right,
          rgba(45, 118, 255, .12),
          transparent 35%
        ),
        linear-gradient(
          145deg,
          rgba(12, 18, 30, .98),
          rgba(8, 12, 22, .98)
        );
      box-shadow:
        0 20px 60px rgba(0,0,0,.22);
    }


    .upload-studio-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }


    .upload-eyebrow {
      font-size: 11px;
      letter-spacing: 2px;
      font-weight: 800;
      opacity: .6;
      margin-bottom: 6px;
    }


    .upload-studio h2 {
      margin: 0;
      font-size: 25px;
      font-weight: 800;
    }


    .upload-studio-header p {
      margin: 7px 0 0;
      opacity: .62;
    }


    .upload-header-icon {
      width: 58px;
      height: 58px;
      min-width: 58px;
      display: grid;
      place-items: center;
      border-radius: 17px;
      background: rgba(45,118,255,.13);
      color: #5d9cff;
      font-size: 23px;
    }


    .upload-settings-grid {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }


    .upload-field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }


    .upload-field span {
      font-size: 12px;
      font-weight: 700;
      opacity: .65;
    }


    .upload-field input,
    .upload-field select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 12px;
      padding: 12px 13px;
      background: rgba(255,255,255,.045);
      color: inherit;
      outline: none;
    }


    .upload-field input:focus,
    .upload-field select:focus {
      border-color: rgba(70,140,255,.7);
    }


    .upload-dropzone {
      min-height: 230px;
      border: 1.5px dashed rgba(93,156,255,.45);
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 24px;
      box-sizing: border-box;
      cursor: pointer;
      background: rgba(60,130,255,.035);
      transition:
        .2s ease;
    }


    .upload-dropzone:hover,
    .upload-dropzone.dragging {
      border-color: #5d9cff;
      background: rgba(60,130,255,.09);
      transform: translateY(-1px);
    }


    .upload-cloud {
      width: 62px;
      height: 62px;
      display: grid;
      place-items: center;
      border-radius: 18px;
      background: rgba(93,156,255,.12);
      color: #5d9cff;
      font-size: 25px;
      margin-bottom: 14px;
    }


    .upload-dropzone h3 {
      margin: 0;
      font-size: 18px;
    }


    .upload-dropzone p {
      margin: 7px 0 15px;
      opacity: .58;
      font-size: 13px;
    }


    .upload-browse-btn,
    .upload-primary-btn,
    .upload-secondary-btn {
      border: 0;
      cursor: pointer;
      border-radius: 11px;
      font-weight: 800;
      padding: 11px 16px;
      transition: .18s ease;
    }


    .upload-browse-btn,
    .upload-primary-btn {
      background: #317cff;
      color: white;
    }


    .upload-browse-btn:hover,
    .upload-primary-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.08);
    }


    .upload-supported {
      margin-top: 13px;
      font-size: 11px;
      opacity: .42;
    }


    .upload-overall {
      margin-top: 22px;
    }


    .upload-overall-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
      font-size: 13px;
    }


    .upload-overall-top span {
      opacity: .55;
    }


    .upload-progress-track {
      height: 8px;
      border-radius: 99px;
      overflow: hidden;
      background: rgba(255,255,255,.07);
    }


    .upload-progress-bar {
      width: 0;
      height: 100%;
      border-radius: inherit;
      background: #317cff;
      transition: width .15s ease;
    }


    .upload-progress-text {
      margin-top: 7px;
      font-size: 11px;
      opacity: .55;
    }


    .upload-queue {
      display: flex;
      flex-direction: column;
      gap: 9px;
      margin-top: 17px;
    }


    .upload-item {
      display: grid;
      grid-template-columns:
        42px minmax(0,1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 13px;
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 15px;
      background: rgba(255,255,255,.025);
    }


    .upload-item-icon {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: rgba(93,156,255,.1);
      color: #5d9cff;
    }


    .upload-item-main {
      min-width: 0;
    }


    .upload-item-name {
      font-size: 13px;
      font-weight: 750;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }


    .upload-item-meta {
      display: flex;
      gap: 8px;
      margin-top: 4px;
      font-size: 10px;
      opacity: .5;
      flex-wrap: wrap;
    }


    .upload-item-progress {
      height: 5px;
      border-radius: 99px;
      background: rgba(255,255,255,.07);
      overflow: hidden;
      margin-top: 9px;
    }


    .upload-item-progress-bar {
      width: 0;
      height: 100%;
      background: #317cff;
      transition: width .15s ease;
    }


    .upload-item-status {
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }


    .upload-item-status.success {
      color: #35d18b;
    }


    .upload-item-status.error {
      color: #ff6262;
    }


    .upload-item-status.duplicate {
      color: #ffbd52;
    }


    .upload-remove {
      border: 0;
      background: transparent;
      color: inherit;
      opacity: .45;
      cursor: pointer;
      padding: 5px;
    }


    .upload-remove:hover {
      opacity: 1;
    }


    .upload-actions {
      display: flex;
      gap: 10px;
      margin-top: 18px;
      flex-wrap: wrap;
    }


    .upload-secondary-btn {
      background: rgba(255,255,255,.06);
      color: inherit;
    }


    .upload-secondary-btn:hover {
      background: rgba(255,255,255,.1);
    }


    .admin-toast-container {
      position: fixed;
      right: 22px;
      bottom: 22px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }


    .admin-toast {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 260px;
      max-width: 380px;
      padding: 13px 16px;
      border-radius: 13px;
      background: #111827;
      border: 1px solid rgba(255,255,255,.1);
      box-shadow: 0 15px 40px rgba(0,0,0,.3);
      font-size: 13px;
      animation: toastIn .25s ease;
    }


    .admin-toast.success {
      border-color: rgba(53,209,139,.25);
    }


    .admin-toast.error {
      border-color: rgba(255,98,98,.25);
    }


    .toast-icon {
      width: 25px;
      height: 25px;
      min-width: 25px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: rgba(255,255,255,.08);
      font-weight: 900;
    }


    .admin-toast.hide {
      opacity: 0;
      transform: translateX(20px);
      transition: .3s ease;
    }


    @keyframes toastIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }


    @media(max-width:800px) {

      .upload-settings-grid {
        grid-template-columns: 1fr;
      }

      .upload-studio {
        padding: 19px;
        border-radius: 18px;
      }

      .upload-studio-header {
        align-items: flex-start;
      }

      .upload-header-icon {
        display: none;
      }

    }

  `;


  document.head.appendChild(
    style
  );
}


// ============================================================
// UPLOAD EVENT BINDING
// ============================================================

function bindUploadEvents() {

  ["resources", "videos"]
    .forEach(type => {

      const prefix =
        type === "videos"
          ? "video"
          : "resource";


      const input =
        $(`${prefix}FileInput`);

      const dropzone =
        $(`${prefix}Dropzone`);


      if (!input || !dropzone) {
        return;
      }


      dropzone.addEventListener(
        "click",
        event => {

          if (
            event.target.closest(
              ".upload-browse-btn"
            )
          ) {
            input.click();
            return;
          }

          input.click();
        }
      );


      input.addEventListener(
        "change",
        event => {

          addFiles(
            Array.from(
              event.target.files || []
            ),
            type
          );

          input.value = "";
        }
      );


      [
        "dragenter",
        "dragover"
      ].forEach(eventName => {

        dropzone.addEventListener(
          eventName,
          event => {

            event.preventDefault();

            dropzone.classList.add(
              "dragging"
            );
          }
        );
      });


      [
        "dragleave",
        "drop"
      ].forEach(eventName => {

        dropzone.addEventListener(
          eventName,
          event => {

            event.preventDefault();

            dropzone.classList.remove(
              "dragging"
            );
          }
        );
      });


      dropzone.addEventListener(
        "drop",
        event => {

          const files =
            Array.from(
              event.dataTransfer.files ||
              []
            );


          addFiles(
            files,
            type
          );
        }
      );


      const browseButton =
        document.querySelector(
          `[data-upload-browse="${prefix}"]`
        );


      if (browseButton) {

        browseButton.addEventListener(
          "click",
          event => {

            event.stopPropagation();

            input.click();
          }
        );
      }


      const startButton =
        $(`${prefix}StartUpload`);


      if (startButton) {

        startButton.addEventListener(
          "click",
          () =>
            startUpload(
              type
            )
        );
      }


      const clearButton =
        $(`${prefix}ClearUpload`);


      if (clearButton) {

        clearButton.addEventListener(
          "click",
          () =>
            clearCompleted(
              type
            )
        );
      }

    });
}


// ============================================================
// CHANGE UPLOAD TYPE
// ============================================================

function setUploadType(
  type
) {

  uploadState.type =
    type;

  renderUploadQueue();
}


// ============================================================
// FILE VALIDATION
// ============================================================

function getExtension(
  filename
) {

  const index =
    filename.lastIndexOf(
      "."
    );

  return index >= 0
    ? filename
        .slice(index)
        .toLowerCase()
    : "";
}


function isAllowedFile(
  file,
  type
) {

  const extension =
    getExtension(
      file.name
    );


  if (type === "videos") {

    return VIDEO_EXTENSIONS
      .includes(
        extension
      );
  }


  return RESOURCE_EXTENSIONS
    .includes(
      extension
    );
}


// ============================================================
// FILE SIZE
// ============================================================

function formatBytes(
  bytes
) {

  if (!bytes) {
    return "0 B";
  }


  const units = [
    "B",
    "KB",
    "MB",
    "GB"
  ];


  const index =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );


  return `${(
    bytes /
    Math.pow(
      1024,
      index
    )
  ).toFixed(
    index === 0
      ? 0
      : 1
  )} ${units[index]}`;
}


// ============================================================
// FILE FINGERPRINT
// ============================================================

async function fileFingerprint(
  file
) {

  /*
   * We use a deterministic SHA-256
   * fingerprint.
   *
   * For normal files this hashes the
   * content, making duplicate detection
   * much stronger than filename checking.
   *
   * Large videos use a sampled fingerprint
   * to avoid loading multiple GB into RAM.
   */


  if (
    file.size <=
    50 * 1024 * 1024
  ) {

    const buffer =
      await file.arrayBuffer();

    const digest =
      await crypto.subtle.digest(
        "SHA-256",
        buffer
      );


    return bufferToHex(
      digest
    );
  }


  const chunkSize =
    2 * 1024 * 1024;


  const positions = [
    0,
    Math.max(
      0,
      Math.floor(
        file.size / 2
      ) -
        Math.floor(
          chunkSize / 2
        )
    ),
    Math.max(
      0,
      file.size -
        chunkSize
    )
  ];


  const parts = [];


  for (
    const position
    of positions
  ) {

    const blob =
      file.slice(
        position,
        position +
          chunkSize
      );


    parts.push(
      await blob.arrayBuffer()
    );
  }


  const combined =
    new Uint8Array(
      parts.reduce(
        (total, part) =>
          total +
          part.byteLength,
        0
      )
    );


  let offset = 0;


  for (
    const part
    of parts
  ) {

    combined.set(
      new Uint8Array(part),
      offset
    );

    offset +=
      part.byteLength;
  }


  const metadata =
    new TextEncoder().encode(
      `${file.name}|${file.size}|${file.lastModified}|`
    );


  const final =
    new Uint8Array(
      metadata.length +
      combined.length
    );


  final.set(
    metadata,
    0
  );

  final.set(
    combined,
    metadata.length
  );


  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      final
    );


  return bufferToHex(
    digest
  );
}


function bufferToHex(
  buffer
) {

  return Array
    .from(
      new Uint8Array(
        buffer
      )
    )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(
            2,
            "0"
          )
    )
    .join("");
}


// ============================================================
// NORMALISE FILE NAME
// ============================================================

function cleanFilename(
  filename
) {

  return filename
    .trim()
    .replace(
      /[^\w.\-() ]+/g,
      ""
    )
    .replace(
      /\s+/g,
      "-"
    );
}


// ============================================================
// ADD FILES
// ============================================================

async function addFiles(
  files,
  type
) {

  if (!files.length) {
    return;
  }


  setUploadType(
    type
  );


  for (
    const file
    of files
  ) {

    const extension =
      getExtension(
        file.name
      );


    const maxSize =
      type === "videos"
        ? MAX_VIDEO_SIZE
        : MAX_RESOURCE_SIZE;


    if (
      !isAllowedFile(
        file,
        type
      )
    ) {

      toast(
        `${file.name}: unsupported file type.`,
        "error"
      );

      continue;
    }


    if (
      file.size >
      maxSize
    ) {

      toast(
        `${file.name}: file is too large.`,
        "error"
      );

      continue;
    }


    /*
     * Check the current queue
     * before calculating another
     * fingerprint.
     */

    const quickDuplicate =
      uploadState.queue.some(
        item =>
          item.name ===
            file.name &&
          item.size ===
            file.size &&
          item.lastModified ===
            file.lastModified
      );


    if (quickDuplicate) {

      toast(
        `${file.name} is already in the upload queue.`,
        "info"
      );

      continue;
    }


    const fingerprint =
      await fileFingerprint(
        file
      );


    const existingDuplicate =
      uploadState.queue.some(
        item =>
          item.fingerprint ===
          fingerprint
      );


    if (existingDuplicate) {

      toast(
        `${file.name} is a duplicate of another selected file.`,
        "info"
      );

      continue;
    }


    uploadState.queue.push({

      id:
        crypto.randomUUID(),

      file,

      type,

      name:
        file.name,

      size:
        file.size,

      lastModified:
        file.lastModified,

      extension,

      fingerprint,

      status:
        "waiting",

      progress:
        0,

      error:
        ""

    });
  }


  renderUploadQueue();
}


// ============================================================
// RENDER QUEUE
// ============================================================

function renderUploadQueue() {

  ["resources", "videos"]
    .forEach(type => {

      const prefix =
        type === "videos"
          ? "video"
          : "resource";


      const queue =
        $(`${prefix}UploadQueue`);


      if (!queue) {
        return;
      }


      const items =
        uploadState.queue
          .filter(
            item =>
              item.type ===
              type
          );


      queue.innerHTML =
        items.length

          ? items
              .map(
                item =>
                  uploadItemHTML(
                    item,
                    prefix
                  )
              )
              .join("")

          : `
              <div class="upload-empty">
                No files selected yet.
              </div>
            `;


      bindQueueActions(
        type
      );


      updateUploadSummary();
    });
}


// ============================================================
// QUEUE ITEM
// ============================================================

function uploadItemHTML(
  item,
  prefix
) {

  const icon =
    item.type === "videos"
      ? "fa-video"
      : item.extension === ".pdf"
        ? "fa-file-pdf"
        : "fa-file";


  let statusText =
    "Waiting";


  let statusClass =
    "";


  if (
    item.status ===
    "uploading"
  ) {

    statusText =
      `${Math.round(
        item.progress
      )}%`;
  }


  if (
    item.status ===
    "complete"
  ) {

    statusText =
      "Complete";

    statusClass =
      "success";
  }


  if (
    item.status ===
    "failed"
  ) {

    statusText =
      "Failed";

    statusClass =
      "error";
  }


  if (
    item.status ===
    "duplicate"
  ) {

    statusText =
      "Duplicate";

    statusClass =
      "duplicate";
  }


  return `

    <div
      class="upload-item"
      data-upload-id="${esc(
        item.id
      )}"
    >

      <div class="upload-item-icon">

        <i class="fa-solid ${icon}"></i>

      </div>


      <div class="upload-item-main">

        <div class="upload-item-name">
          ${esc(
            item.name
          )}
        </div>


        <div class="upload-item-meta">

          <span>
            ${formatBytes(
              item.size
            )}
          </span>

          <span>
            ${esc(
              item.extension
                .replace(
                  ".",
                  ""
                )
                .toUpperCase()
            )}
          </span>

        </div>


        <div class="upload-item-progress">

          <div
            class="upload-item-progress-bar"
            style="width:${Math.max(
              0,
              Math.min(
                100,
                item.progress
              )
            )}%"
          ></div>

        </div>

      </div>


      <div
        class="upload-item-status ${statusClass}"
      >
        ${statusText}
      </div>


      ${
        item.status ===
          "waiting" ||
        item.status ===
          "failed" ||
        item.status ===
          "duplicate"

          ? `
              <button
                type="button"
                class="upload-remove"
                data-remove-upload="${esc(
                  item.id
                )}"
                title="Remove"
              >

                <i class="fa-solid fa-xmark"></i>

              </button>
            `

          : ""
      }

    </div>
  `;
}


// ============================================================
// QUEUE ACTIONS
// ============================================================

function bindQueueActions(
  type
) {

  document
    .querySelectorAll(
      `[data-remove-upload]`
    )
    .forEach(button => {

      button.onclick = () => {

        const id =
          button.dataset
            .removeUpload;


        uploadState.queue =
          uploadState.queue.filter(
            item =>
              item.id !==
              id
          );


        renderUploadQueue();
      };
    });
}


// ============================================================
// UPLOAD SUMMARY
// ============================================================

function updateUploadSummary() {

  ["resources", "videos"]
    .forEach(type => {

      const prefix =
        type === "videos"
          ? "video"
          : "resource";


      const items =
        uploadState.queue
          .filter(
            item =>
              item.type ===
              type
          );


      const count =
        $(`${prefix}QueueCount`);


      const progress =
        $(`${prefix}OverallProgress`);


      const text =
        $(`${prefix}OverallText`);


      if (!count) {
        return;
      }


      count.textContent =
        `${items.length} ${
          items.length === 1
            ? "file"
            : "files"
        }`;


      if (!items.length) {

        if (progress) {
          progress.style.width =
            "0%";
        }

        if (text) {
          text.textContent =
            "Ready";
        }

        return;
      }


      const total =
        items.length;


      const completed =
        items.filter(
          item =>
            item.status ===
            "complete"
        ).length;


      const totalProgress =
        items.reduce(
          (
            total,
            item
          ) =>
            total +
            Math.max(
              0,
              Math.min(
                100,
                item.progress
              )
            ),
          0
        ) / total;


      if (progress) {

        progress.style.width =
          `${totalProgress}%`;
      }


      if (text) {

        text.textContent =
          `${completed}/${total} complete • ${
            Math.round(
              totalProgress
            )
          }% overall`;
      }
    });
}


// ============================================================
// CLEAR COMPLETED
// ============================================================

function clearCompleted(
  type
) {

  uploadState.queue =
    uploadState.queue.filter(
      item =>
        !(
          item.type ===
            type &&
          (
            item.status ===
              "complete" ||
            item.status ===
              "duplicate"
          )
        )
    );


  renderUploadQueue();
}


// ============================================================
// START UPLOAD
// ============================================================

async function startUpload(
  type
) {

  if (
    uploadState.uploading
  ) {

    toast(
      "An upload is already running.",
      "info"
    );

    return;
  }


  if (
    !R2_WORKER_ENDPOINT
  ) {

    toast(
      "R2 Worker endpoint is not configured.",
      "error"
    );

    console.error(
      "Set window.R2_WORKER_ENDPOINT to your existing Cloudflare R2 Worker URL."
    );

    return;
  }


  const items =
    uploadState.queue.filter(
      item =>
        item.type ===
          type &&
        (
          item.status ===
            "waiting" ||
          item.status ===
            "failed"
        )
    );


  if (!items.length) {

    toast(
      "There are no files ready to upload.",
      "info"
    );

    return;
  }


  uploadState.uploading =
    true;


  const startButton =
    $(
      `${
        type === "videos"
          ? "video"
          : "resource"
      }StartUpload`
    );


  if (startButton) {

    startButton.disabled =
      true;

    startButton.innerHTML =
      `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Uploading...
      `;
  }


  try {

    for (
      const item
      of items
    ) {

      try {

        await uploadSingle(
          item
        );

      } catch (error) {

        console.error(
          "Upload failed:",
          error
        );

        item.status =
          "failed";

        item.error =
          error?.message ||
          "Upload failed";

        item.progress =
          0;

        toast(
          `${item.name}: ${item.error}`,
          "error"
        );
      }


      renderUploadQueue();
    }


    const failed =
      uploadState.queue.filter(
        item =>
          item.type ===
            type &&
          item.status ===
            "failed"
      ).length;


    if (failed) {

      toast(
        `${failed} file(s) failed. You can retry them.`,
        "error"
      );

    } else {

      toast(
        "All selected files uploaded successfully.",
        "success"
      );
    }

  } finally {

    uploadState.uploading =
      false;


    if (startButton) {

      startButton.disabled =
        false;

      startButton.innerHTML =
        `
          <i class="fa-solid fa-cloud-arrow-up"></i>
          Upload All
        `;
    }


    renderUploadQueue();
  }
}


// ============================================================
// SINGLE UPLOAD
// ============================================================

async function uploadSingle(
  item
) {

  item.status =
    "uploading";

  item.progress =
    0;


  renderUploadQueue();


  /*
   * IMPORTANT:
   *
   * Your established Worker uses:
   *
   *     ?key=...
   *
   * for R2 objects.
   *
   * The actual upload method must be
   * supported by your existing Worker.
   */


  const prefix =
    item.type === "videos"
      ? "videos"
      : "resources";


  const filename =
    cleanFilename(
      item.name
    );


  const safeName =
    `${Date.now()}-${item.fingerprint.slice(
      0,
      12
    )}-${filename}`;


  const key =
    `${prefix}/${safeName}`;


  /*
   * Check for an existing queue
   * duplicate before uploading.
   */

  const duplicate =
    uploadState.queue.some(
      other =>
        other.id !== item.id &&
        other.fingerprint ===
          item.fingerprint &&
        other.status ===
          "complete"
    );


  if (duplicate) {

    item.status =
      "duplicate";

    item.progress =
      100;

    return;
  }


  const uploadURL =
    buildWorkerURL(
      key
    );


  await uploadWithProgress(
    uploadURL,
    item.file,
    key,
    progress => {

      item.progress =
        progress;

      renderUploadQueue();
    }
  );


  /*
   * Create the Firestore
   * metadata only after the
   * R2 upload has succeeded.
   */

  const metadata =
    buildMetadata(
      item,
      key
    );


  const collectionName =
    item.type === "videos"
      ? "videos"
      : "resources";


  await addDoc(
    collection(
      db,
      collectionName
    ),
    metadata
  );


  item.status =
    "complete";

  item.progress =
    100;
}


// ============================================================
// BUILD WORKER URL
// ============================================================

function buildWorkerURL(
  key
) {

  const endpoint =
    R2_WORKER_ENDPOINT
      .replace(
        /\/+$/,
        ""
      );


  return `${endpoint}/upload`;
}


// ============================================================
// UPLOAD WITH PROGRESS
// ============================================================

function uploadWithProgress(
  url,
  file,
  key,
  onProgress
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const xhr =
        new XMLHttpRequest();


      xhr.open(
        "POST",
        url,
        true
      );


      xhr.upload.onprogress =
        event => {

          if (
            event.lengthComputable
          ) {

            onProgress(
              (
                event.loaded /
                event.total
              ) *
                100
            );
          }
        };


      xhr.onload =
        () => {

          if (
            xhr.status >= 200 &&
            xhr.status < 300
          ) {

            onProgress(
              100
            );

            resolve();

          } else {

            reject(
              new Error(
                `R2 Worker returned HTTP ${xhr.status}: ${
                  xhr.responseText ||
                  "Upload failed"
                }`
              )
            );
          }
        };


      xhr.onerror =
        () => {

          reject(
            new Error(
              "Network error while uploading to Cloudflare R2."
            )
          );
        };


      xhr.onabort =
        () => {

          reject(
            new Error(
              "Upload cancelled."
            )
          );
        };


      const formData = new FormData();
      formData.append("file", file);
      formData.append("key", key);
      formData.append("type", file.type.startsWith("video/") ? "video" : "resource");
      formData.append("contentType", file.type || "application/octet-stream");

      xhr.send(formData);
    }
  );
}


// ============================================================
// BUILD FIRESTORE METADATA
// ============================================================

function buildMetadata(
  item,
  key
) {

  const isVideo =
    item.type ===
    "videos";


  const prefix =
    isVideo
      ? "video"
      : "resource";


  const category =
    $(
      `${prefix}UploadCategory`
    )?.value?.trim() ||
    "General";


  const access =
    $(
      `${prefix}UploadAccess`
    )?.value ||
    "free";


  const premium =
    access ===
    "premium";


  const metadata = {

    title:
      item.name
        .replace(
          /\.[^/.]+$/,
          ""
        ),

    name:
      item.name,

    fileName:
      item.name,

    originalFileName:
      item.name,

    storageKey:
      key,

    r2Key:
      key,

    fileKey:
      isVideo ? undefined : key,

    resourceKey:
      isVideo ? undefined : key,

    fileType:
      item.file.type ||
      "application/octet-stream",

    mimeType:
      item.file.type ||
      "application/octet-stream",

    size:
      item.file.size,

    sizeBytes:
      item.file.size,

    category,

    premium,

    premiumOnly:
      premium,

    fingerprint:
      item.fingerprint,

    status:
      isVideo
        ? (
            $("videoUploadPublished")
              ?.value ===
            "draft"
              ? "draft"
              : "published"
          )
        : "published",

    published:
      isVideo
        ? (
            $("videoUploadPublished")
              ?.value !==
            "draft"
          )
        : true,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),

    uploadedAt:
      serverTimestamp(),

    uploadedBy:
      auth.currentUser?.uid ||
      "",

    uploadedByEmail:
      auth.currentUser?.email ||
      ""

  };

  if (isVideo) {
    metadata.videoKey = key;
  } else {
    metadata.fileKey = key;
    metadata.resourceKey = key;
  }


  if (!isVideo) {

    metadata.type =
      $("resourceUploadType")
        ?.value ||
      "document";
  }


  if (isVideo) {

    metadata.video = true;

    metadata.duration =
      "";

    metadata.thumbnail =
      "";
  }


  return metadata;
}


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(

  auth,

  user => {

    if (!user) {

      location.href =
        "/login";

      return;
    }


    console.log(
      "GTRADES-AXIS admin authenticated:",
      user.email
    );

    getDoc(doc(db, "users", user.uid))
      .then(snap => {
        if (!snap.exists() || snap.data().role !== "admin") {
          location.href = "/access-denied";
          return;
        }
        start();
      })
      .catch(error => showError(error, "Admin authorization"));
  },


  error => {

    console.error(
      "Authentication error:",
      error
    );

    showError(
      error,
      "Authentication"
    );
  }
);