import {
  getAuth,
  onAuthStateChanged
} from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from
"https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import { app } from "./firebase.js";


// ============================================================
// CONFIG
// ============================================================

const WORKER_URL =
  "https://r2-uploader.davidthuku574.workers.dev";


// ============================================================
// FIREBASE
// ============================================================

const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// ELEMENTS
// ============================================================

const form =
  document.getElementById("videoUploadForm");

const titleInput =
  document.getElementById("videoTitle");

const categoryInput =
  document.getElementById("videoCategory");

const durationInput =
  document.getElementById("videoDuration");

const videoInput =
  document.getElementById("videoFile");

const thumbnailInput =
  document.getElementById("videoThumbnail");

const premiumInput =
  document.getElementById("premiumOnly");

const uploadButton =
  document.getElementById("uploadVideoBtn");

const preview =
  document.getElementById("preview");

const progressBox =
  document.getElementById("progressBox");

const progressText =
  document.getElementById("progressText");

const bar =
  document.getElementById("bar");

const percent =
  document.getElementById("percent");

const status =
  document.getElementById("status");


// ============================================================
// STATE
// ============================================================

let uploadLocked = false;


// ============================================================
// ADMIN AUTH
// ============================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "/login.html";
    return;
  }

  try {

    const userRef =
      doc(db, "users", user.uid);

    const userSnap =
      await getDoc(userRef);

    if (!userSnap.exists()) {
      location.href = "/login.html";
      return;
    }

    const data =
      userSnap.data();

    if (data.role !== "admin") {
      location.href = "/dashboard.html";
      return;
    }

  } catch (error) {

    console.error(error);

    location.href = "/login.html";
  }

});


// ============================================================
// LOCAL PREVIEW
// ============================================================

videoInput.addEventListener(
  "change",
  () => {

    const file =
      videoInput.files[0];

    if (!file) {

      preview.removeAttribute("src");
      preview.style.display = "none";

      return;
    }

    if (!file.type.startsWith("video/")) {

      videoInput.value = "";

      showError(
        "Please select a valid video file."
      );

      return;
    }

    const oldURL =
      preview.dataset.objectUrl;

    if (oldURL) {
      URL.revokeObjectURL(oldURL);
    }

    const objectURL =
      URL.createObjectURL(file);

    preview.dataset.objectUrl =
      objectURL;

    preview.src =
      objectURL;

    preview.style.display =
      "block";

  }
);


// ============================================================
// FORM
// ============================================================

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();
    event.stopPropagation();

    if (uploadLocked) {
      return;
    }

    const video =
      videoInput.files[0];

    if (!video) {

      showError(
        "Select a video first."
      );

      return;
    }

    if (!video.type.startsWith("video/")) {

      showError(
        "Invalid video file."
      );

      return;
    }

    if (!titleInput.value.trim()) {

      showError(
        "Enter a video title."
      );

      return;
    }

    // ========================================================
    // HARD LOCK
    // ========================================================

    uploadLocked = true;

    uploadButton.disabled = true;

    uploadButton.textContent =
      "Uploading...";

    status.className = "";
    status.style.display = "none";

    progressBox.style.display =
      "block";

    updateProgress(
      0,
      "Preparing upload..."
    );


    try {

      // ======================================================
      // GENERATE UNIQUE FILE NAME
      // ======================================================

      const extension =
        getExtension(video.name);

      const safeTitle =
        titleInput.value
          .trim()
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .replace(/\s+/g, "-")
          .toLowerCase();

      const videoKey =
        `videos/${Date.now()}-${safeTitle || "video"}${extension}`;


      // ======================================================
      // UPLOAD VIDEO DIRECTLY TO WORKER
      // ======================================================

      updateProgress(
        2,
        "Uploading video..."
      );

      const videoResult =
        await uploadFile(
          video,
          videoKey,
          "video"
        );


      // ======================================================
      // THUMBNAIL
      // ======================================================

      let thumbnailKey = "";
      let thumbnailURL = "";

      if (
        thumbnailInput.files &&
        thumbnailInput.files.length
      ) {

        const thumbnail =
          thumbnailInput.files[0];

        const thumbExtension =
          getExtension(
            thumbnail.name
          );

        thumbnailKey =
          `thumbnails/${Date.now()}-${safeTitle || "thumbnail"}${thumbExtension}`;

        updateProgress(
          92,
          "Uploading thumbnail..."
        );

        const thumbResult =
          await uploadFile(
            thumbnail,
            thumbnailKey,
            "thumbnail"
          );

        thumbnailURL =
          thumbResult.url || "";
      }


      // ======================================================
      // VIDEO URL
      // ======================================================

      const videoURL =
        videoResult.url ||
        `${WORKER_URL}/file?key=${encodeURIComponent(videoKey)}`;


      // ======================================================
      // SAVE FIRESTORE METADATA
      // ======================================================

      updateProgress(
        97,
        "Saving video information..."
      );

      await addDoc(
        collection(db, "videos"),
        {
          title:
            titleInput.value.trim(),

          category:
            categoryInput.value,

          duration:
            durationInput.value.trim(),

          premiumOnly:
            premiumInput.checked,

          videoUrl:
            videoURL,

          url:
            videoURL,

          videoURL:
            videoURL,

          videoKey:
            videoKey,

          thumbnail:
            thumbnailURL,

          thumbnailUrl:
            thumbnailURL,

          thumbnailKey:
            thumbnailKey,

          fileName:
            video.name,

          fileSize:
            video.size,

          contentType:
            video.type,

          createdAt:
            serverTimestamp(),

          active:
            true,

          published:
            true
        }
      );


      // ======================================================
      // COMPLETE
      // ======================================================

      updateProgress(
        100,
        "Upload complete!"
      );

      showSuccess(
        "Video uploaded successfully."
      );

      uploadButton.textContent =
        "✓ Uploaded";

      // ======================================================
      // RESET AFTER SUCCESS
      // ======================================================

      setTimeout(() => {

        form.reset();

        preview.removeAttribute("src");
        preview.style.display =
          "none";

        progressBox.style.display =
          "none";

        uploadButton.disabled =
          false;

        uploadButton.textContent =
          "☁ Upload Video";

        uploadLocked =
          false;

      }, 1800);


    } catch (error) {

      console.error(
        "GTRADES VIDEO ERROR:",
        error
      );

      showError(
        error.message ||
        "Video upload failed."
      );

      uploadButton.disabled =
        false;

      uploadButton.textContent =
        "☁ Upload Video";

      uploadLocked =
        false;

    }

  }
);


// ============================================================
// UPLOAD FILE
// ============================================================

function uploadFile(
  file,
  key,
  type
) {

  return new Promise(
    async (resolve, reject) => {

      try {

        const formData =
          new FormData();

        formData.append(
          "file",
          file,
          file.name
        );

        formData.append(
          "key",
          key
        );

        formData.append(
          "type",
          type
        );

        formData.append(
          "contentType",
          file.type
        );


        const xhr =
          new XMLHttpRequest();

        xhr.open(
          "POST",
          `${WORKER_URL}/upload`,
          true
        );


        // ====================================================
        // PROGRESS
        // ====================================================

        xhr.upload.onprogress =
          (event) => {

            if (!event.lengthComputable)
              return;

            const raw =
              event.loaded /
              event.total;

            let start = 2;
            let end = type === "video"
              ? 90
              : 96;

            const value =
              Math.round(
                start +
                raw *
                (end - start)
              );

            const loaded =
              (
                event.loaded /
                1024 /
                1024
              ).toFixed(1);

            const total =
              (
                event.total /
                1024 /
                1024
              ).toFixed(1);

            updateProgress(
              value,
              `Uploading ${loaded} MB / ${total} MB`
            );

          };


        // ====================================================
        // SUCCESS
        // ====================================================

        xhr.onload =
          () => {

            if (
              xhr.status < 200 ||
              xhr.status >= 300
            ) {

              reject(
                new Error(
                  `Cloudflare upload failed (${xhr.status}): ${xhr.responseText}`
                )
              );

              return;
            }

            let response;

            try {

              response =
                JSON.parse(
                  xhr.responseText
                );

            } catch {

              reject(
                new Error(
                  "Cloudflare returned an invalid response."
                )
              );

              return;
            }

            if (!response.success) {

              reject(
                new Error(
                  response.error ||
                  "R2 upload failed."
                )
              );

              return;
            }

            resolve(response);

          };


        // ====================================================
        // NETWORK ERROR
        // ====================================================

        xhr.onerror =
          () => {

            reject(
              new Error(
                "Network error while uploading to Cloudflare."
              )
            );

          };


        xhr.onabort =
          () => {

            reject(
              new Error(
                "Upload was cancelled."
              )
            );

          };


        xhr.send(formData);

      } catch (error) {

        reject(error);

      }

    }
  );
}


// ============================================================
// PROGRESS
// ============================================================

function updateProgress(
  value,
  message
) {

  const safeValue =
    Math.max(
      0,
      Math.min(
        100,
        value
      )
    );

  bar.style.width =
    `${safeValue}%`;

  percent.textContent =
    `${safeValue}%`;

  progressText.textContent =
    message;

}


// ============================================================
// STATUS
// ============================================================

function showSuccess(
  message
) {

  status.className =
    "success";

  status.textContent =
    `✓ ${message}`;

}


function showError(
  message
) {

  status.className =
    "error";

  status.textContent =
    `❌ ${message}`;

}


// ============================================================
// EXTENSION
// ============================================================

function getExtension(
  filename
) {

  const index =
    filename.lastIndexOf(".");

  if (index === -1) {
    return ".mp4";
  }

  return filename
    .substring(index)
    .toLowerCase();

}
