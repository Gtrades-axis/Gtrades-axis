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
    status,
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
  const extension = key
    .split(".")
    .pop()
    ?.toLowerCase();

  const types = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",

    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
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

    xls: "application/vnd.ms-excel",
    xlsx:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };

  return (
    types[extension] ||
    "application/octet-stream"
  );
}

// ============================================================
// MAIN
// ============================================================

export default {
  async fetch(request, env) {

    const cors = getCorsHeaders(request);

    // --------------------------------------------------------
    // OPTIONS
    // --------------------------------------------------------

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    const url = new URL(request.url);

    const pathname = url.pathname;

    const action =
      url.searchParams.get("action") || "";

    const key =
      url.searchParams.get("key") || "";

    // --------------------------------------------------------
    // HEALTH
    // --------------------------------------------------------

    if (
      pathname === "/" &&
      !key &&
      !action &&
      request.method === "GET"
    ) {
      return json(
        {
          success: true,
          service: "GTRADES-AXIS R2 Worker",
          status: "online"
        },
        200,
        request
      );
    }

    // --------------------------------------------------------
    // R2 BINDING
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // KEY REQUIRED
    // --------------------------------------------------------

    if (!key) {
      return json(
        {
          success: false,
          error: "Missing R2 object key."
        },
        400,
        request
      );
    }

    // --------------------------------------------------------
    // UPLOAD
    // --------------------------------------------------------

    if (
      request.method === "PUT" ||
      action === "upload"
    ) {
      return handleUpload(
        request,
        env.GTRADES_ASSETS,
        key
      );
    }

    // --------------------------------------------------------
    // INFO
    // --------------------------------------------------------

    if (action === "info") {
      return handleInfo(
        request,
        env.GTRADES_ASSETS,
        key
      );
    }

    // --------------------------------------------------------
    // FILE
    // --------------------------------------------------------

    if (
      request.method === "GET" ||
      request.method === "HEAD" ||
      action === "file" ||
      action === "preview" ||
      action === "download"
    ) {
      return handleFile(
        request,
        env.GTRADES_ASSETS,
        key
      );
    }

    // --------------------------------------------------------
    // UNKNOWN
    // --------------------------------------------------------

    return json(
      {
        success: false,
        error: "Route not found."
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
  key
) {
  try {

    if (!request.body) {
      return json(
        {
          success: false,
          error: "Upload body is empty."
        },
        400,
        request
      );
    }

    const contentType =
      request.headers.get("Content-Type") ||
      getContentType(key);

    await bucket.put(
      key,
      request.body,
      {
        httpMetadata: {
          contentType
        }
      }
    );

    // --------------------------------------------------------
    // VERIFY UPLOAD IMMEDIATELY
    // --------------------------------------------------------

    const verification =
      await bucket.head(key);

    if (!verification) {
      return json(
        {
          success: false,
          error:
            "Upload completed but R2 verification failed.",
          key
        },
        500,
        request
      );
    }

    return json(
      {
        success: true,
        message: "Upload complete.",
        key,
        size: verification.size,
        etag: verification.etag,
        contentType:
          verification.httpMetadata?.contentType ||
          contentType
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
          error.message ||
          "Upload failed."
      },
      500,
      request
    );
  }
}

// ============================================================
// INFO
// ============================================================

async function handleInfo(
  request,
  bucket,
  key
) {
  try {

    const object =
      await bucket.head(key);

    if (!object) {
      return json(
        {
          success: false,
          error: "File not found in R2.",
          key
        },
        404,
        request
      );
    }

    return json(
      {
        success: true,
        key,
        size: object.size,
        etag: object.etag,
        contentType:
          object.httpMetadata?.contentType ||
          getContentType(key)
      },
      200,
      request
    );

  } catch (error) {

    console.error(
      "R2 INFO ERROR:",
      error
    );

    return json(
      {
        success: false,
        error:
          error.message ||
          "Unable to inspect R2 object."
      },
      500,
      request
    );
  }
}

// ============================================================
// FILE
// ============================================================

async function handleFile(
  request,
  bucket,
  key
) {
  try {

    const rangeHeader =
      request.headers.get("Range");

    let range = undefined;

    // --------------------------------------------------------
    // RANGE
    // --------------------------------------------------------

    if (rangeHeader) {

      const match =
        rangeHeader.match(
          /bytes=(\d*)-(\d*)/
        );

      if (match) {

        const startText = match[1];
        const endText = match[2];

        if (startText) {

          const start =
            Number(startText);

          const end =
            endText
              ? Number(endText)
              : undefined;

          range = {
            offset: start
          };

          if (
            end !== undefined &&
            end >= start
          ) {
            range.length =
              end - start + 1;
          }
        }
      }
    }

    // --------------------------------------------------------
    // GET FROM R2
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
      return json(
        {
          success: false,
          error: "File not found in R2.",
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

    const headers = {
      ...getCorsHeaders(request),

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
      headers["ETag"] =
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
        String(object.size);

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
        object.range.length;

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
    // FULL RESPONSE
    // --------------------------------------------------------

    headers[
      "Content-Length"
    ] =
      String(object.size);

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
          error.message ||
          "Unable to read R2 file.",
        key
      },
      500,
      request
    );
  }
}