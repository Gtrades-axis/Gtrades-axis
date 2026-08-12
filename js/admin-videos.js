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
// ADMIN AUTHENTICATION
// ============================================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    try {

        const userRef =
            doc(db, "users", user.uid);

        const userSnap =
            await getDoc(userRef);

        if (!userSnap.exists()) {
            showError("Admin account was not found.");
            return;
        }

        const userData =
            userSnap.data();

        if (userData.role !== "admin") {

            showError(
                "You do not have administrator access."
            );

            setTimeout(() => {
                window.location.href = "/dashboard.html";
            }, 1500);

            return;
        }

        console.log(
            "GTRADES-AXIS admin authenticated."
        );

    } catch (error) {

        console.error(
            "Admin authentication error:",
            error
        );

        showError(
            "Could not verify administrator access."
        );
    }

});


// ============================================================
// VIDEO PREVIEW
// ============================================================

videoInput.addEventListener("change", () => {

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

});


// ============================================================
// FORM SUBMISSION
// ============================================================

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (uploadLocked) {
        return;
    }

    const video =
        videoInput.files[0];

    if (!video) {

        showError(
            "Please select a video."
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
            "Please enter a video title."
        );

        return;
    }

    if (!categoryInput.value) {

        showError(
            "Please select a category."
        );

        return;
    }


    // --------------------------------------------------------
    // LOCK
    // --------------------------------------------------------

    uploadLocked = true;

    uploadButton.disabled = true;

    uploadButton.textContent =
        "Uploading...";

    status.style.display = "none";

    progressBox.style.display =
        "block";

    updateProgress(
        0,
        "Preparing upload..."
    );


    try {

        // ----------------------------------------------------
        // UNIQUE VIDEO KEY
        // ----------------------------------------------------

        const safeTitle =
            titleInput.value
                .trim()
                .replace(
                    /[^a-zA-Z0-9-_ ]/g,
                    ""
                )
                .replace(
                    /\s+/g,
                    "-"
                )
                .toLowerCase();

        const extension =
            getExtension(video.name);

        const videoKey =
            `videos/${Date.now()}-${safeTitle || "video"}${extension}`;


        // ----------------------------------------------------
        // UPLOAD VIDEO
        // ----------------------------------------------------

        updateProgress(
            1,
            "Uploading video..."
        );

        const videoResult =
            await uploadFile(
                video,
                videoKey,
                "video"
            );


        // ----------------------------------------------------
        // THUMBNAIL
        // ----------------------------------------------------

        let thumbnailKey = "";
        let thumbnailURL = "";

        if (
            thumbnailInput.files &&
            thumbnailInput.files.length > 0
        ) {

            const thumbnail =
                thumbnailInput.files[0];

            const thumbnailExtension =
                getExtension(
                    thumbnail.name
                );

            thumbnailKey =
                `thumbnails/${Date.now()}-${safeTitle || "thumbnail"}${thumbnailExtension}`;

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


        // ----------------------------------------------------
        // VIDEO URL
        // ----------------------------------------------------

        const videoURL =
            videoResult.url ||
            `${WORKER_URL}/file?key=${encodeURIComponent(videoKey)}`;


        // ----------------------------------------------------
        // FIRESTORE
        // ----------------------------------------------------

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

                videoKey:
                    videoKey,

                thumbnail:
                    thumbnailURL,

                thumbnailKey:
                    thumbnailKey,

                fileName:
                    video.name,

                fileSize:
                    video.size,

                contentType:
                    video.type,

                active:
                    true,

                published:
                    true,

                createdAt:
                    serverTimestamp()

            }
        );


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        updateProgress(
            100,
            "Upload complete!"
        );

        showSuccess(
            "Video uploaded successfully."
        );

        uploadButton.textContent =
            "✓ Uploaded";


        // ----------------------------------------------------
        // RESET
        // ----------------------------------------------------

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

});


// ============================================================
// R2 UPLOAD
// ============================================================

function uploadFile(file, key, type) {

    return new Promise((resolve, reject) => {

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


        // ----------------------------------------------------
        // PROGRESS
        // ----------------------------------------------------

        xhr.upload.onprogress =
            (event) => {

                if (!event.lengthComputable) {
                    return;
                }

                const ratio =
                    event.loaded /
                    event.total;

                const start =
                    type === "video"
                        ? 2
                        : 92;

                const end =
                    type === "video"
                        ? 90
                        : 96;

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


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        xhr.onload = () => {

            if (
                xhr.status < 200 ||
                xhr.status >= 300
            ) {

                reject(
                    new Error(
                        `Cloudflare upload failed (${xhr.status})`
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


        // ----------------------------------------------------
        // ERRORS
        // ----------------------------------------------------

        xhr.onerror = () => {

            reject(
                new Error(
                    "Network error while uploading."
                )
            );

        };


        xhr.onabort = () => {

            reject(
                new Error(
                    "Upload was cancelled."
                )
            );

        };


        xhr.send(formData);

    });

}


// ============================================================
// PROGRESS
// ============================================================

function updateProgress(value, message) {

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

function showSuccess(message) {

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

function showError(message) {

    status.className =
        "error";

    status.textContent =
        `❌ ${message}`;

    status.style.display =
        "block";
}


// ============================================================
// EXTENSION
// ============================================================

function getExtension(filename) {

    const index =
        filename.lastIndexOf(".");

    if (index === -1) {
        return ".mp4";
    }

    return filename
        .substring(index)
        .toLowerCase();
}