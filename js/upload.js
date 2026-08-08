// ============================================================
// GTRADES-AXIS™
// CLOUDFLARE R2 STORAGE
// js/upload.js
// ============================================================

const WORKER_URL =
  "https://r2-uploader.davidthuku574.workers.dev";


// ============================================================
// GET WORKER URL
// ============================================================

async function getWorkerURL(
  key,
  action
) {

  if (!key) {

    throw new Error(
      "No file key provided."
    );

  }


  const url =
    new URL(WORKER_URL);


  url.searchParams.set(
    "key",
    key
  );


  url.searchParams.set(
    "action",
    action
  );


  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          "Accept":
            "application/json"
        },
        cache: "no-store"
      }
    );


  let data;


  try {

    data =
      await response.json();

  } catch {

    throw new Error(
      "Cloudflare Worker returned an invalid response."
    );

  }


  if (
    !response.ok ||
    !data.url
  ) {

    throw new Error(
      data.error ||
      `Worker error (${response.status})`
    );

  }


  return data.url;

}


// ============================================================
// UPLOAD TO R2
// ============================================================

export async function uploadToR2(
  file,
  key
) {

  if (!file) {

    throw new Error(
      "No file provided."
    );

  }


  if (!key) {

    throw new Error(
      "No file key provided."
    );

  }


  console.log(
    "Preparing R2 upload:",
    key
  );


  // Get Worker upload URL
  const uploadURL =
    await getWorkerURL(
      key,
      "upload"
    );


  console.log(
    "Uploading file to R2..."
  );


  const response =
    await fetch(
      uploadURL,
      {
        method: "PUT",

        body: file,

        headers: {
          "Content-Type":
            file.type ||
            "application/octet-stream"
        }
      }
    );


  if (!response.ok) {

    let message =
      `Upload failed (${response.status})`;

    try {

      const data =
        await response.json();

      if (data.error) {
        message =
          data.error;
      }

    } catch {
      // Nothing
    }


    throw new Error(message);

  }


  console.log(
    "✅ R2 upload successful:",
    key
  );


  return key;

}


// ============================================================
// GET DOWNLOAD URL
// ============================================================

export async function getDownloadUrl(
  key
) {

  if (!key) {

    throw new Error(
      "No file key provided."
    );

  }


  const url =
    await getWorkerURL(
      key,
      "download"
    );


  console.log(
    "✅ R2 download URL:",
    url
  );


  return url;

}