// ============================================================
// GTRADES-AXIS™
// CLOUDFLARE R2 VIDEO UPLOADER
// ============================================================

export default {
  async fetch(request, env) {

    // ========================================================
    // CORS
    // ========================================================

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type",
    };

    // ========================================================
    // OPTIONS / CORS PREFLIGHT
    // ========================================================

    if (request.method === "OPTIONS") {

      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });

    }

    // ========================================================
    // URL
    // ========================================================

    const url =
      new URL(request.url);

    const pathname =
      url.pathname;

    // ========================================================
    // HEALTH CHECK
    // ========================================================

    if (
      pathname === "/" &&
      request.method === "GET"
    ) {

      return json(
        {
          success: true,
          service:
            "GTRADES-AXIS R2 Uploader",
          status: "online"
        },
        200,
        corsHeaders
      );

    }

    // ========================================================
    // UPLOAD
    // ========================================================

    if (
      pathname === "/upload" &&
      request.method === "POST"
    ) {

      return handleUpload(
        request,
        env,
        corsHeaders
      );

    }

    // ========================================================
    // FILE
    // ========================================================

    if (
      pathname === "/file" &&
      request.method === "GET"
    ) {

      return handleFile(
        request,
        env,
        corsHeaders
      );

    }

    // ========================================================
    // NOT FOUND
    // ========================================================

    return json(
      {
        success: false,
        error:
          "Route not found."
      },
      404,
      corsHeaders
    );
  }
};


// ============================================================
// UPLOAD HANDLER
// ============================================================

async function handleUpload(
  request,
  env,
  corsHeaders
) {

  try {

    // --------------------------------------------------------
    // CHECK R2 BUCKET
    // --------------------------------------------------------

    if (!env.GTRADES_ASSETS) {

      return json(
        {
          success: false,
          error:
            "R2 bucket binding GTRADES_ASSETS is missing."
        },
        500,
        corsHeaders
      );

    }

    // --------------------------------------------------------
    // READ FORM DATA
    // --------------------------------------------------------

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    const key =
      formData.get("key");

    const type =
      formData.get("type") ||
      "file";

    const contentType =
      formData.get("contentType") ||
      (
        file?.type ||
        "application/octet-stream"
      );

    // --------------------------------------------------------
    // VALIDATE FILE
    // --------------------------------------------------------

    if (
      !file ||
      typeof file === "string"
    ) {

      return json(
        {
          success: false,
          error:
            "No file was received."
        },
        400,
        corsHeaders
      );

    }

    // --------------------------------------------------------
    // VALIDATE KEY
    // --------------------------------------------------------

    if (
      !key ||
      typeof key !== "string"
    ) {

      return json(
        {
          success: false,
          error:
            "No R2 file key was provided."
        },
        400,
        corsHeaders
      );

    }

    // --------------------------------------------------------
    // CLEAN KEY
    // --------------------------------------------------------

    const cleanKey =
      key
        .replace(/^\/+/, "")
        .trim();

    if (!cleanKey) {

      return json(
        {
          success: false,
          error:
            "Invalid R2 key."
        },
        400,
        corsHeaders
      );

    }

    console.log(
      "GTRADES upload started:",
      {
        key: cleanKey,
        type: type,
        contentType: contentType,
        size: file.size
      }
    );

    // ========================================================
    // WRITE DIRECTLY TO R2
    // ========================================================

    await env.GTRADES_ASSETS.put(
      cleanKey,
      file.stream(),
      {
        httpMetadata: {
          contentType:
            contentType
        },

        customMetadata: {
          originalName:
            file.name || "",

          uploadType:
            String(type),

          uploadedAt:
            new Date().toISOString()
        }
      }
    );

    console.log(
      "R2 PUT completed:",
      cleanKey
    );

    // ========================================================
    // VERIFY OBJECT
    // ========================================================

    const savedObject =
      await env.GTRADES_ASSETS.head(
        cleanKey
      );

    if (!savedObject) {

      console.error(
        "R2 verification failed:",
        cleanKey
      );

      return json(
        {
          success: false,
          error:
            "File was sent to R2 but could not be verified."
        },
        500,
        corsHeaders
      );

    }

    console.log(
      "R2 verification successful:",
      {
        key: cleanKey,
        size: savedObject.size
      }
    );

    // ========================================================
    // FILE URL
    // ========================================================

    const fileURL =
      `${urlFromRequest(request)}/file?key=${encodeURIComponent(cleanKey)}`;

    // ========================================================
    // SUCCESS
    // ========================================================

    return json(
      {
        success: true,

        message:
          "File uploaded successfully.",

        key:
          cleanKey,

        url:
          fileURL,

        fileUrl:
          fileURL,

        type:
          type,

        contentType:
          contentType,

        size:
          savedObject.size
      },
      200,
      corsHeaders
    );

  } catch (error) {

    console.error(
      "GTRADES R2 UPLOAD ERROR:",
      error
    );

    return json(
      {
        success: false,

        error:
          error?.message ||
          "R2 upload failed."
      },
      500,
      corsHeaders
    );

  }

}


// ============================================================
// FILE HANDLER
// ============================================================

async function handleFile(
  request,
  env,
  corsHeaders
) {

  try {

    // --------------------------------------------------------
    // CHECK BUCKET
    // --------------------------------------------------------

    if (!env.GTRADES_ASSETS) {

      return new Response(
        "R2 bucket binding missing.",
        {
          status: 500,
          headers: corsHeaders
        }
      );

    }

    // --------------------------------------------------------
    // GET KEY
    // --------------------------------------------------------

    const url =
      new URL(request.url);

    const key =
      url.searchParams.get(
        "key"
      );

    if (!key) {

      return new Response(
        "Missing key.",
        {
          status: 400,
          headers: corsHeaders
        }
      );

    }

    const cleanKey =
      key
        .replace(/^\/+/, "")
        .trim();

    // ========================================================
    // GET OBJECT
    // ========================================================

    const object =
      await env.GTRADES_ASSETS.get(
        cleanKey
      );

    // ========================================================
    // NOT FOUND
    // ========================================================

    if (!object) {

      return new Response(
        "File not found in R2.",
        {
          status: 404,
          headers: corsHeaders
        }
      );

    }

    // ========================================================
    // RESPONSE HEADERS
    // ========================================================

    const headers =
      new Headers(
        corsHeaders
      );

    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType ||
      "application/octet-stream"
    );

    headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );

    headers.set(
      "Accept-Ranges",
      "bytes"
    );

    if (
      object.size !== undefined
    ) {

      headers.set(
        "Content-Length",
        String(object.size)
      );

    }

    // ========================================================
    // RETURN FILE
    // ========================================================

    return new Response(
      object.body,
      {
        status: 200,
        headers
      }
    );

  } catch (error) {

    console.error(
      "GTRADES R2 FILE ERROR:",
      error
    );

    return new Response(
      "Unable to retrieve file.",
      {
        status: 500,
        headers: corsHeaders
      }
    );

  }

}


// ============================================================
// JSON RESPONSE
// ============================================================

function json(
  data,
  status,
  corsHeaders
) {

  const headers =
    new Headers(
      corsHeaders
    );

  headers.set(
    "Content-Type",
    "application/json"
  );

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers
    }
  );

}


// ============================================================
// WORKER BASE URL
// ============================================================

function urlFromRequest(
  request
) {

  const url =
    new URL(request.url);

  return (
    url.origin
  );

}