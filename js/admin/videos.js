// ============================================================
// GTRADES-AXIS™
// ADMIN VIDEO MANAGER
// CLOUDFLARE R2 + FIRESTORE
// ============================================================

import {
    db,
    auth
} from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


// ============================================================
// CONFIGURATION
// ============================================================

const R2_WORKER_URL =
    "https://r2-uploader.davidthuku574.workers.dev";

const VIDEOS_COLLECTION =
    "videos";


// ============================================================
// GLOBAL STATE
// ============================================================

let videos = [];


// ============================================================
// R2 URL
// ============================================================

function getR2Url(key) {

    if (!key) {
        throw new Error("R2 file key is missing.");
    }

    return (
        R2_WORKER_URL +
        "?key=" +
        encodeURIComponent(key) +
        "&action=file"
    );
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(timestamp) {

    if (!timestamp) {
        return "—";
    }

    try {

        const date =
            timestamp.toDate
                ? timestamp.toDate()
                : new Date(timestamp);

        return date.toLocaleDateString();

    } catch {

        return "—";

    }
}


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "GTRADES-AXIS™ Video Manager loaded."
        );

        loadVideos();

        setupUploadForm();

    }
);


// ============================================================
// LOAD VIDEOS
// ============================================================

async function loadVideos() {

    const container =
        document.getElementById("videoList") ||
        document.getElementById("videosList") ||
        document.querySelector("#videoTableBody");

    try {

        const q = query(
            collection(db, VIDEOS_COLLECTION),
            orderBy("createdAt", "desc")
        );

        const snapshot =
            await getDocs(q);

        videos = [];

        snapshot.forEach(
            documentSnapshot => {

                videos.push({
                    id: documentSnapshot.id,
                    ...documentSnapshot.data()
                });

            }
        );

        console.log(
            "GTRADES-AXIS videos:",
            videos
        );

        renderVideos();

    } catch (error) {

        console.error(
            "LOAD VIDEOS ERROR:",
            error
        );

        if (container) {

            container.innerHTML = `
                <tr>
                    <td colspan="7">
                        ❌ Failed to load videos.
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;

        }

    }

}


// ============================================================
// RENDER VIDEOS
// ============================================================

function renderVideos() {

    const tableBody =
        document.getElementById("videoTableBody");

    const list =
        document.getElementById("videoList") ||
        document.getElementById("videosList");

    if (tableBody) {

        tableBody.innerHTML = "";

        if (videos.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        No videos uploaded yet.
                    </td>
                </tr>
            `;

            return;

        }

        videos.forEach(video => {

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>
                    ${
                        video.thumbnailKey
                            ? `<img
                                src="${escapeHtml(
                                    getR2Url(
                                        video.thumbnailKey
                                    )
                                )}"
                                style="
                                    width:80px;
                                    height:45px;
                                    object-fit:cover;
                                    border-radius:6px;
                                "
                              >`
                            : "—"
                    }
                </td>

                <td>
                    ${escapeHtml(video.title)}
                </td>

                <td>
                    ${escapeHtml(video.category)}
                </td>

                <td>
                    ${escapeHtml(
                        video.duration || "—"
                    )}
                </td>

                <td>
                    ${
                        video.premiumOnly
                            ? "Premium"
                            : "Free"
                    }
                </td>

                <td>

                    <button
                        type="button"
                        onclick="window.GTRADES_PREVIEW_VIDEO('${escapeHtml(video.id)}')"
                    >
                        Preview
                    </button>

                    <button
                        type="button"
                        onclick="window.GTRADES_DELETE_VIDEO('${escapeHtml(video.id)}')"
                    >
                        Delete
                    </button>

                </td>

            `;

            tableBody.appendChild(row);

        });

        return;

    }


    // --------------------------------------------------------
    // CARD/LIST FALLBACK
    // --------------------------------------------------------

    if (list) {

        list.innerHTML = "";

        if (videos.length === 0) {

            list.innerHTML =
                "<p>No videos uploaded yet.</p>";

            return;

        }

        videos.forEach(video => {

            const item =
                document.createElement("div");

            item.className =
                "video-admin-item";

            item.innerHTML = `

                <div>

                    <strong>
                        ${escapeHtml(video.title)}
                    </strong>

                    <small>
                        ${escapeHtml(video.category)}
                    </small>

                </div>

                <div>

                    <button
                        type="button"
                        onclick="window.GTRADES_PREVIEW_VIDEO('${escapeHtml(video.id)}')"
                    >
                        Preview
                    </button>

                    <button
                        type="button"
                        onclick="window.GTRADES_DELETE_VIDEO('${escapeHtml(video.id)}')"
                    >
                        Delete
                    </button>

                </div>

            `;

            list.appendChild(item);

        });

    }

}


// ============================================================
// SETUP UPLOAD FORM
// ============================================================

function setupUploadForm() {

    const form =
        document.getElementById("videoUploadForm") ||
        document.getElementById("uploadVideoForm");

    if (!form) {

        console.warn(
            "Video upload form not found."
        );

        return;

    }

    form.addEventListener(
        "submit",
        handleVideoUpload
    );

}


// ============================================================
// UPLOAD VIDEO
// ============================================================

async function handleVideoUpload(event) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const titleInput =
        document.getElementById("videoTitle");

    const categoryInput =
        document.getElementById("videoCategory");

    const durationInput =
        document.getElementById("videoDuration");

    const premiumInput =
        document.getElementById("premiumOnly");

    const fileInput =
        document.getElementById("videoFile");

    const thumbnailInput =
        document.getElementById("thumbnailFile");


    const title =
        titleInput?.value.trim();

    const category =
        categoryInput?.value || "Market Structure";

    const duration =
        durationInput?.value.trim() || "";

    const premiumOnly =
        premiumInput?.checked || false;

    const videoFile =
        fileInput?.files?.[0];

    const thumbnailFile =
        thumbnailInput?.files?.[0];


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!title) {

        alert(
            "Please enter a video title."
        );

        return;

    }

    if (!videoFile) {

        alert(
            "Please select a video file."
        );

        return;

    }


    const uploadButton =
        form.querySelector(
            'button[type="submit"]'
        );


    try {

        if (uploadButton) {

            uploadButton.disabled = true;

            uploadButton.textContent =
                "Uploading...";

        }


        console.log(
            "Starting video upload:",
            videoFile.name
        );


        // ====================================================
        // CREATE SAFE R2 KEY
        // ====================================================

        const timestamp =
            Date.now();

        const safeName =
            videoFile.name
                .replace(/\.[^/.]+$/, "")
                .replace(/[^a-zA-Z0-9_-]/g, "_");

        const extension =
            videoFile.name
                .split(".")
                .pop()
                .toLowerCase();

        const videoKey =
            `videos/${timestamp}_${safeName}.${extension}`;


        console.log(
            "R2 VIDEO KEY:",
            videoKey
        );


        // ====================================================
        // UPLOAD VIDEO TO R2
        // ====================================================

        const videoUploadUrl =
            R2_WORKER_URL +
            "?key=" +
            encodeURIComponent(videoKey) +
            "&action=upload";


        const videoResponse =
            await fetch(
                videoUploadUrl,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            videoFile.type ||
                            "video/mp4"
                    },

                    body: videoFile
                }
            );


        const videoResult =
            await videoResponse.json();


        console.log(
            "R2 VIDEO RESPONSE:",
            videoResult
        );


        if (
            !videoResponse.ok ||
            !videoResult.success
        ) {

            throw new Error(
                videoResult.error ||
                "Video upload failed."
            );

        }


        // ====================================================
        // IMPORTANT:
        // USE THE KEY RETURNED BY R2
        // ====================================================

        const confirmedVideoKey =
            videoResult.key ||
            videoKey;


        console.log(
            "CONFIRMED VIDEO KEY:",
            confirmedVideoKey
        );


        // ====================================================
        // VERIFY FILE EXISTS
        // ====================================================

        const verifyUrl =
            getR2Url(
                confirmedVideoKey
            );


        const verifyResponse =
            await fetch(
                verifyUrl,
                {
                    method: "HEAD"
                }
            );


        console.log(
            "R2 VERIFY STATUS:",
            verifyResponse.status
        );


        if (
            !verifyResponse.ok
        ) {

            throw new Error(
                "Video uploaded but could not be verified in R2."
            );

        }


        // ====================================================
        // OPTIONAL THUMBNAIL
        // ====================================================

        let thumbnailKey = "";


        if (thumbnailFile) {

            const thumbnailTimestamp =
                Date.now();

            const thumbnailName =
                thumbnailFile.name
                    .replace(/\.[^/.]+$/, "")
                    .replace(
                        /[^a-zA-Z0-9_-]/g,
                        "_"
                    );

            const thumbnailExtension =
                thumbnailFile.name
                    .split(".")
                    .pop()
                    .toLowerCase();

            thumbnailKey =
                `thumbnails/${thumbnailTimestamp}_${thumbnailName}.${thumbnailExtension}`;


            const thumbnailUploadUrl =
                R2_WORKER_URL +
                "?key=" +
                encodeURIComponent(
                    thumbnailKey
                ) +
                "&action=upload";


            const thumbnailResponse =
                await fetch(
                    thumbnailUploadUrl,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                thumbnailFile.type ||
                                "image/jpeg"
                        },

                        body: thumbnailFile
                    }
                );


            const thumbnailResult =
                await thumbnailResponse.json();


            console.log(
                "R2 THUMBNAIL RESPONSE:",
                thumbnailResult
            );


            if (
                !thumbnailResponse.ok ||
                !thumbnailResult.success
            ) {

                throw new Error(
                    thumbnailResult.error ||
                    "Thumbnail upload failed."
                );

            }


            thumbnailKey =
                thumbnailResult.key ||
                thumbnailKey;

        }


        // ====================================================
        // SAVE TO FIRESTORE
        // ====================================================

        const videoDocument = {

            title:

                title,

            category:

                category,

            duration:

                duration,

            premiumOnly:

                premiumOnly,

            thumbnailKey:

                thumbnailKey,

            videoKey:

                confirmedVideoKey,

            createdAt:

                serverTimestamp(),

            updatedAt:

                serverTimestamp()

        };


        console.log(
            "SAVING FIRESTORE DOCUMENT:",
            videoDocument
        );


        const firestoreDocument =
            await addDoc(
                collection(
                    db,
                    VIDEOS_COLLECTION
                ),
                videoDocument
            );


        console.log(
            "VIDEO SAVED:",
            firestoreDocument.id
        );


        // ====================================================
        // SUCCESS
        // ====================================================

        alert(
            "✅ Video uploaded successfully."
        );


        form.reset();


        await loadVideos();


    } catch (error) {

        console.error(
            "GTRADES-AXIS VIDEO UPLOAD ERROR:",
            error
        );


        alert(
            "❌ Video upload failed.\n\n" +
            error.message
        );


    } finally {

        if (uploadButton) {

            uploadButton.disabled = false;

            uploadButton.textContent =
                "Upload Video";

        }

    }

}


// ============================================================
// PREVIEW VIDEO
// ============================================================

async function previewVideo(videoId) {

    try {

        console.log(
            "Preview requested:",
            videoId
        );


        const videoRef =
            doc(
                db,
                VIDEOS_COLLECTION,
                videoId
            );


        const snapshot =
            await getDoc(videoRef);


        if (!snapshot.exists()) {

            throw new Error(
                "Video record was not found in Firestore."
            );

        }


        const video = {

            id:
                snapshot.id,

            ...snapshot.data()

        };


        console.log(
            "VIDEO RECORD:",
            video
        );


        if (!video.videoKey) {

            throw new Error(
                "This video has no videoKey."
            );

        }


        console.log(
            "VIDEO KEY:",
            video.videoKey
        );


        const videoUrl =
            getR2Url(
                video.videoKey
            );


        console.log(
            "FINAL VIDEO URL:",
            videoUrl
        );


        // ====================================================
        // GET/CREATE MODAL
        // ====================================================

        let modal =
            document.getElementById(
                "gtradesVideoPreviewModal"
            );


        if (!modal) {

            modal =
                createPreviewModal();

        }


        const player =
            document.getElementById(
                "gtradesPreviewVideo"
            );


        const title =
            document.getElementById(
                "gtradesPreviewTitle"
            );


        if (title) {

            title.textContent =
                video.title || "Video Preview";

        }


        // ====================================================
        // SET SOURCE
        // ====================================================

        player.pause();

        player.removeAttribute(
            "src"
        );

        while (
            player.firstChild
        ) {

            player.removeChild(
                player.firstChild
            );

        }


        const source =
            document.createElement(
                "source"
            );


        source.src =
            videoUrl;


        source.type =
            "video/mp4";


        player.appendChild(
            source
        );


        player.load();


        modal.style.display =
            "flex";


        // ====================================================
        // PLAY
        // ====================================================

        try {

            await player.play();

        } catch (playError) {

            console.warn(
                "Autoplay blocked:",
                playError
            );

        }


    } catch (error) {

        console.error(
            "PREVIEW ERROR:",
            error
        );


        alert(
            "❌ Error playing video:\n\n" +
            error.message
        );

    }

}


// ============================================================
// CREATE PREVIEW MODAL
// ============================================================

function createPreviewModal() {

    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "gtradesVideoPreviewModal";


    modal.style.cssText = `

        position: fixed;

        inset: 0;

        z-index: 999999;

        display: flex;

        align-items: center;

        justify-content: center;

        background:
            rgba(0,0,0,.92);

        padding: 20px;

    `;


    modal.innerHTML = `

        <div
            style="
                width:min(1100px,96vw);
                background:#111;
                border-radius:14px;
                padding:20px;
                box-shadow:
                    0 20px 60px
                    rgba(0,0,0,.6);
            "
        >

            <div
                style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    margin-bottom:15px;
                "
            >

                <h2
                    id="gtradesPreviewTitle"
                    style="
                        color:white;
                        margin:0;
                    "
                >
                    Video Preview
                </h2>


                <button
                    type="button"
                    id="gtradesClosePreview"
                    style="
                        background:#222;
                        color:white;
                        border:1px solid #444;
                        border-radius:8px;
                        padding:8px 14px;
                        cursor:pointer;
                        font-size:16px;
                    "
                >
                    ✕ Close
                </button>

            </div>


            <video
                id="gtradesPreviewVideo"
                controls
                playsinline
                preload="metadata"
                style="
                    width:100%;
                    max-height:75vh;
                    background:#000;
                    border-radius:10px;
                    display:block;
                "
            >
                Your browser does not support video playback.
            </video>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    document
        .getElementById(
            "gtradesClosePreview"
        )
        .addEventListener(
            "click",
            closePreview
        );


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closePreview();

            }

        }
    );


    return modal;

}


// ============================================================
// CLOSE PREVIEW
// ============================================================

function closePreview() {

    const modal =
        document.getElementById(
            "gtradesVideoPreviewModal"
        );


    const player =
        document.getElementById(
            "gtradesPreviewVideo"
        );


    if (player) {

        player.pause();

        player.removeAttribute(
            "src"
        );

        player.load();

    }


    if (modal) {

        modal.style.display =
            "none";

    }

}


// ============================================================
// DELETE VIDEO
// ============================================================

async function deleteVideo(videoId) {

    const confirmed =
        confirm(
            "Delete this video from the Admin Portal?\n\n" +
            "This removes the Firestore record. " +
            "The R2 object is not automatically deleted by this browser code."
        );


    if (!confirmed) {

        return;

    }


    try {

        const videoRef =
            doc(
                db,
                VIDEOS_COLLECTION,
                videoId
            );


        const snapshot =
            await getDoc(
                videoRef
            );


        if (!snapshot.exists()) {

            throw new Error(
                "Video not found."
            );

        }


        await deleteDoc(
            videoRef
        );


        alert(
            "✅ Video deleted from the video manager."
        );


        await loadVideos();


    } catch (error) {

        console.error(
            "DELETE VIDEO ERROR:",
            error
        );


        alert(
            "❌ Delete failed:\n\n" +
            error.message
        );

    }

}


// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

window.GTRADES_PREVIEW_VIDEO =
    previewVideo;

window.GTRADES_DELETE_VIDEO =
    deleteVideo;

window.GTRADES_CLOSE_VIDEO_PREVIEW =
    closePreview;


// ============================================================
// DIRECT KEY TEST
// ============================================================

window.GTRADES_TEST_R2_VIDEO =
    async function(videoKey) {

        try {

            const url =
                getR2Url(videoKey);

            console.log(
                "Testing R2:",
                url
            );


            const response =
                await fetch(
                    url,
                    {
                        method: "HEAD"
                    }
                );


            console.log(
                "R2 status:",
                response.status
            );


            if (!response.ok) {

                throw new Error(
                    `R2 returned HTTP ${response.status}`
                );

            }


            alert(
                "✅ R2 video exists.\n\n" +
                "HTTP Status: " +
                response.status
            );


        } catch (error) {

            console.error(
                "R2 TEST ERROR:",
                error
            );


            alert(
                "❌ R2 test failed:\n\n" +
                error.message
            );

        }

    };