// ============================================================
// GTRADES-AXIS™
// CLOUDFLARE R2 WORKER
// worker.js
// ============================================================

const ALLOWED_ORIGINS = [
  "https://gtradesaxis.com",
  "https://www.gtradesaxis.com",
  "http://localhost:3000",
  "http://localhost:5173"
];

// ============================================================
// CORS
// ============================================================

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";

  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : "https://gtradesaxis.com";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Range",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag",
    "Access-Control-Max-Age": "86400"
  };
}

// ============================================================
// JSON
// ============================================================

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...getCorsHeaders(request)
    }
  });
}

// ============================================================
// CONTENT TYPE
// ============================================================

function getContentType(key) {
  const extension =
    key.split(".").pop()?.toLowerCase() || "";

  const types = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",

    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",

    pdf: "application/pdf",

    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",

    zip: "application/zip",

    doc: "application/msword",

    docx:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    xls:
      "application/vnd.ms-excel",

    xlsx:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };

  return (
    types[extension] ||
    "application/octet-stream"
  );
}

// ============================================================
// MAIN WORKER
// ============================================================

export default {

  async fetch(request, env) {

    const cors = getCorsHeaders(request);

    // ========================================================
    // OPTIONS
    // ========================================================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    // ========================================================
    // URL
    // ========================================================

    const url = new URL(request.url);

    const pathname = url.pathname;

    const key =
      url.searchParams.get("key");

    const action =
      url.searchParams.get("action");

    // ========================================================
    // CHECK R2
    // ========================================================

    if (!env.GTRADES_ASSETS) {
      return json(
        {
          success: false,
          error:
            "R2 binding GTRADES_ASSETS is missing."
        },
        500,
        request
      );
    }

    const bucket =
      env.GTRADES_ASSETS;

    // ========================================================
    // HEALTH CHECK
    // ========================================================

    if (
      pathname === "/" &&
      !key &&
      !action &&
      request.method === "GET"
    ) {
      return json(
        {
          success: true,
          service:
            "GTRADES-AXIS R2 Worker",
          status:
            "online"
        },
        200,
        request
      );
    }

    // ========================================================
    // UPLOAD
    //
    // Supports:
    //
    // PUT /upload?key=...
    // PUT /?key=...&action=upload
    // ========================================================

    if (
      request.method === "PUT" &&
      (
        pathname === "/upload" ||
        pathname === "/" ||
        action === "upload"
      )
    ) {

      return handleUpload(
        request,
        bucket,
        key,
        cors
      );
    }

    // ========================================================
    // FILE READ
    //
    // GET /?key=...&action=file
    // GET /?key=...&action=preview
    // GET /?key=...
    // ========================================================

    if (
      key &&
      (
        request.method === "GET" ||
        request.method === "HEAD"
      )
    ) {

      return handleFile(
        request,
        bucket,
        key,
        cors
      );
    }

    // ========================================================
    // MISSING KEY
    // ========================================================

    if (!key) {
      return json(
        {
          success: false,
          error:
            "Missing R2 object key."
        },
        400,
        request
      );
    }

    // ========================================================
    // ROUTE NOT FOUND
    // ========================================================

    return json(
      {
        success: false,
        error:
          "Route not found.",
        pathname,
        method:
          request.method,
        key,
        availableRoutes: [
          "GET /?key=FILE_KEY&action=file",
          "HEAD /?key=FILE_KEY&action=file",
          "PUT /upload?key=FILE_KEY"
        ]
      },
      404,
      request
    );
  }
};

// ============================================================
// UPLOAD
// ============================================================

async function handleUpload(
  request,
  bucket,
  key,
  cors
) {

  try {

    // --------------------------------------------------------
    // KEY REQUIRED
    // --------------------------------------------------------

    if (!key) {
      return json(
        {
          success: false,
          error:
            "Missing file key."
        },
        400,
        request
      );
    }

    // --------------------------------------------------------
    // BODY REQUIRED
    // --------------------------------------------------------

    if (!request.body) {
      return json(
        {
          success: false,
          error:
            "Upload body is empty."
        },
        400,
        request
      );
    }

    // --------------------------------------------------------
    // CONTENT TYPE
    // --------------------------------------------------------

    const contentType =
      request.headers.get(
        "Content-Type"
      ) ||
      getContentType(key);

    console.log(
      "R2 UPLOAD START:",
      key
    );

    // --------------------------------------------------------
    // PUT TO R2
    // --------------------------------------------------------

    await bucket.put(
      key,
      request.body,
      {
        httpMetadata: {
          contentType
        }
      }
    );

    console.log(
      "R2 UPLOAD COMPLETE:",
      key
    );

    // --------------------------------------------------------
    // VERIFY OBJECT EXISTS
    // --------------------------------------------------------

    const verification =
      await bucket.head(key);

    if (!verification) {

      console.error(
        "R2 VERIFICATION FAILED:",
        key
      );

      return json(
        {
          success: false,
          error:
            "Upload completed but the file could not be verified in R2.",
          key
        },
        500,
        request
      );
    }

    // --------------------------------------------------------
    // PLAYBACK URL
    // --------------------------------------------------------

    const playbackURL =
      `${urlForWorker(request)}/?key=${encodeURIComponent(
        key
      )}&action=file`;

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return json(
      {
        success: true,
        message:
          "Upload complete.",
        key,
        size:
          verification.size,
        etag:
          verification.etag,
        contentType,
        url:
          playbackURL
      },
      200,
      request
    );

  } catch (error) {

    console.error(
      "R2 UPLOAD ERROR:",
      error
    );

    return json(
      {
        success: false,
        error:
          error?.message ||
          "Upload failed.",
        key
      },
      500,
      request
    );
  }
}

// ============================================================
// FILE HANDLER
// ============================================================

async function handleFile(
  request,
  bucket,
  key,
  cors
) {

  try {

    console.log(
      "R2 FILE REQUEST:",
      key
    );

    // --------------------------------------------------------
    // RANGE
    // --------------------------------------------------------

    const rangeHeader =
      request.headers.get(
        "Range"
      );

    let range = undefined;

    if (rangeHeader) {

      const match =
        rangeHeader.match(
          /bytes=(\d*)-(\d*)/
        );

      if (match) {

        const startText =
          match[1];

        const endText =
          match[2];

        const start =
          startText
            ? Number(startText)
            : undefined;

        const end =
          endText
            ? Number(endText)
            : undefined;

        if (
          start !== undefined
        ) {

          range = {
            offset: start
          };

          if (
            end !== undefined &&
            end >= start
          ) {

            range.length =
              end -
              start +
              1;
          }
        }
      }
    }

    // --------------------------------------------------------
    // GET OBJECT
    // --------------------------------------------------------

    const object =
      await bucket.get(
        key,
        range
          ? { range }
          : undefined
      );

    // --------------------------------------------------------
    // NOT FOUND
    // --------------------------------------------------------

    if (!object) {

      console.error(
        "R2 FILE NOT FOUND:",
        key
      );

      return json(
        {
          success: false,
          error:
            "File not found in R2.",
          key
        },
        404,
        request
      );
    }

    // --------------------------------------------------------
    // CONTENT TYPE
    // --------------------------------------------------------

    const contentType =
      object.httpMetadata?.contentType ||
      getContentType(key);

    // --------------------------------------------------------
    // RESPONSE HEADERS
    // --------------------------------------------------------

    const headers = {
      ...cors,

      "Content-Type":
        contentType,

      "Accept-Ranges":
        "bytes",

      "Cache-Control":
        "public, max-age=3600"
    };

    // --------------------------------------------------------
    // ETAG
    // --------------------------------------------------------

    if (object.etag) {
      headers.ETag =
        object.etag;
    }

    // --------------------------------------------------------
    // HEAD
    // --------------------------------------------------------

    if (
      request.method === "HEAD"
    ) {

      headers[
        "Content-Length"
      ] =
        String(
          object.size
        );

      return new Response(
        null,
        {
          status:
            range
              ? 206
              : 200,
          headers
        }
      );
    }

    // --------------------------------------------------------
    // RANGE RESPONSE
    // --------------------------------------------------------

    if (
      range &&
      object.range
    ) {

      const offset =
        object.range.offset;

      const length =
        object.range.length ||
        object.size;

      const end =
        offset +
        length -
        1;

      headers[
        "Content-Range"
      ] =
        `bytes ${offset}-${end}/${object.size}`;

      headers[
        "Content-Length"
      ] =
        String(length);

      return new Response(
        object.body,
        {
          status: 206,
          headers
        }
      );
    }

    // --------------------------------------------------------
    // FULL FILE
    // --------------------------------------------------------

    headers[
      "Content-Length"
    ] =
      String(
        object.size
      );

    return new Response(
      object.body,
      {
        status: 200,
        headers
      }
    );

  } catch (error) {

    console.error(
      "R2 FILE ERROR:",
      error
    );

    return json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to read R2 file.",
        key
      },
      500,
      request
    );
  }
}

// ============================================================
// WORKER BASE URL
// ============================================================

function urlForWorker(request) {
  const url =
    new URL(request.url);

  return `${url.protocol}//${url.host}`;
}