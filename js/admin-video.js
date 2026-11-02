import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

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

const previewBox =
  document.getElementById("previewBox");

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
    window.location.href = "/login";
    return;
  }

  try {

    const userRef =
      doc(db, "users", user.uid);

    const userSnap =
      await getDoc(userRef);

    if (!userSnap.exists()) {
      window.location.href = "/login";
      return;
    }

    const data =
      userSnap.data();

    if (data.role !== "admin") {
      window.location.href = "/dashboard";
      return;
    }

    console.log(
      "GTRADES-AXIS ADMIN VERIFIED"
    );

  } catch (error) {

    console.error(
      "Admin verification error:",
      error
    );

    window.location.href = "/login";

  }

});


// ============================================================
// VIDEO PREVIEW
// ============================================================

videoInput.addEventListener(
  "change",
  () => {

    const file =
      videoInput.files[0];

    if (!file) {

      preview.removeAttribute("src");
      previewBox.style.display = "none";

      return;
    }

    if (!file.type.startsWith("video/")) {

      videoInput.value = "";

      preview.removeAttribute("src");
      previewBox.style.display = "none";

      showError(
        "Please select a valid video file."
      );

      return;
    }

    if (preview.dataset.objectUrl) {

      URL.revokeObjectURL(
        preview.dataset.objectUrl
      );

    }

    const objectURL =
      URL.createObjectURL(file);

    preview.dataset.objectUrl =
      objectURL;

    preview.src =
      objectURL;

    previewBox.style.display =
      "block";

  }
);


// ============================================================
// FORM SUBMIT
// ============================================================

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

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

    const title =
      titleInput.value.trim();

    if (!title) {

      showError(
        "Enter a video title."
      );

      return;
    }


    // ========================================================
    // LOCK
    // ========================================================

    uploadLocked = true;

    uploadButton.disabled = true;

    uploadButton.textContent =
      "Uploading...";

    status.style.display =
      "none";

    progressBox.style.display =
      "block";

    updateProgress(
      0,
      "Preparing upload..."
    );


    try {

      // ======================================================
      // SAFE FILE NAME
      // ======================================================

      const extension =
        getExtension(video.name);

      const safeTitle =
        title
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .replace(/\s+/g, "-")
          .toLowerCase();

      const uniqueId =
        Date.now();

      const videoKey =
        `videos/${uniqueId}_${safeTitle || "video"}${extension}`;


      // ======================================================
      // UPLOAD VIDEO
      // ======================================================

      updateProgress(
        1,
        "Starting video upload..."
      );

      const videoResult =
        await uploadFile(
          video,
          videoKey,
          "video"
        );


      console.log(
        "VIDEO UPLOAD RESULT:",
        videoResult
      );


      // ======================================================
      // THUMBNAIL
      // ======================================================

      let thumbnailKey =
        "";

      let thumbnailURL =
        "";

      if (
        thumbnailInput.files &&
        thumbnailInput.files.length > 0
      ) {

        const thumbnail =
          thumbnailInput.files[0];

        if (
          !thumbnail.type.startsWith("image/")
        ) {

          throw new Error(
            "Thumbnail must be an image."
          );

        }

        const thumbExtension =
          getExtension(
            thumbnail.name
          );

        thumbnailKey =
          `thumbnails/${uniqueId}_${safeTitle || "thumbnail"}${thumbExtension}`;


        updateProgress(
          92,
          "Uploading thumbnail..."
        );


        const thumbnailResult =
          await uploadFile(
            thumbnail,
            thumbnailKey,
            "thumbnail"
          );


        thumbnailURL =
          thumbnailResult.url || "";

      }


      // ======================================================
      // VIDEO URL
      // ======================================================

      const videoURL =
        videoResult.url ||
        `${WORKER_URL}/?key=${encodeURIComponent(videoKey)}`;


      // ======================================================
      // FIRESTORE
      // ======================================================

      updateProgress(
        97,
        "Publishing video..."
      );


      await addDoc(
        collection(db, "videos"),
        {

          title:
            title,

          category:
            categoryInput.value,

          duration:
            durationInput.value.trim(),

          premiumOnly:
            premiumInput.checked,

          videoUrl:
            videoURL,

          videoURL:
            videoURL,

          url:
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
      // SUCCESS
      // ======================================================

      updateProgress(
        100,
        "Upload complete!"
      );

      showSuccess(
        "Video uploaded successfully."
      );

      uploadButton.textContent =
        "✓ Video Published";


      // ======================================================
      // RESET
      // ======================================================

      setTimeout(
        () => {

          form.reset();

          preview.pause();

          preview.removeAttribute(
            "src"
          );

          previewBox.style.display =
            "none";

          progressBox.style.display =
            "none";

          uploadButton.disabled =
            false;

          uploadButton.textContent =
            "☁ Upload Video";

          uploadLocked =
            false;

        },
        2000
      );


    } catch (error) {

      console.error(
        "GTRADES-AXIS VIDEO ERROR:",
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
// UPLOAD FILE TO CLOUDFLARE WORKER
// ============================================================

function uploadFile(
  file,
  key,
  type
) {

  return new Promise(
    (resolve, reject) => {

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
      // TIMEOUT
      // ====================================================

      xhr.timeout =
        30 * 60 * 1000;


      // ====================================================
      // UPLOAD PROGRESS
      // ====================================================

      xhr.upload.onprogress =
        (event) => {

          if (!event.lengthComputable) {
            return;
          }

          const ratio =
            event.loaded /
            event.total;


          let start;
          let end;


          if (type === "video") {

            start = 2;
            end = 90;

          } else {

            start = 90;
            end = 96;

          }


          const value =
            Math.round(
              start +
              ratio *
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
      // RESPONSE
      // ====================================================

      xhr.onload =
        () => {

          console.log(
            "Worker HTTP status:",
            xhr.status
          );

          console.log(
            "Worker response:",
            xhr.responseText
          );


          if (
            xhr.status < 200 ||
            xhr.status >= 300
          ) {

            reject(
              new Error(
                `Worker HTTP error (${xhr.status})`
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

          } catch (error) {

            reject(
              new Error(
                "Worker returned an invalid JSON response."
              )
            );

            return;

          }


          if (
            response.success !== true
          ) {

            reject(
              new Error(
                response.error ||
                "Cloudflare upload failed."
              )
            );

            return;

          }


          if (!response.key) {

            reject(
              new Error(
                "Worker uploaded the file but did not return a file key."
              )
            );

            return;

          }


          resolve(
            response
          );

        };


      // ====================================================
      // NETWORK ERROR
      // ====================================================

      xhr.onerror =
        () => {

          reject(
            new Error(
              "Network error while uploading to Cloudflare R2."
            )
          );

        };


      // ====================================================
      // TIMEOUT
      // ====================================================

      xhr.ontimeout =
        () => {

          reject(
            new Error(
              "Upload timed out. Please try again."
            )
          );

        };


      // ====================================================
      // ABORT
      // ====================================================

      xhr.onabort =
        () => {

          reject(
            new Error(
              "Upload was cancelled."
            )
          );

        };


      // ====================================================
      // SEND
      // ====================================================

      xhr.send(
        formData
      );

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
// SUCCESS
// ============================================================

function showSuccess(
  message
) {

  status.className =
    "success";

  status.textContent =
    `✓ ${message}`;

  status.style.display =
    "block";

}


// ============================================================
// ERROR
// ============================================================

function showError(
  message
) {

  status.className =
    "error";

  status.textContent =
    `❌ ${message}`;

  status.style.display =
    "block";

}


// ============================================================
// FILE EXTENSION
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