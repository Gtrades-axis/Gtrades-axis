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

  const origin =
    request.headers.get("Origin") || "";

  const allowed =
    ALLOWED_ORIGINS.includes(origin)
      ? origin
      : "https://gtradesaxis.com";

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods":
      "GET, HEAD, PUT, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Range",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag",
    "Access-Control-Max-Age":
      "86400"
  };
}

// ============================================================
// JSON RESPONSE
// ============================================================

function json(
  data,
  status = 200,
  request
) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        ...getCorsHeaders(request)
      }
    }
  );

}

// ============================================================
// TEXT RESPONSE
// ============================================================

function text(
  message,
  status = 200,
  request
) {

  return new Response(
    message,
    {
      status,
      headers: {
        "Content-Type":
          "text/plain; charset=utf-8",
        ...getCorsHeaders(request)
      }
    }
  );

}

// ============================================================
// MAIN WORKER
// ============================================================

export default {

  async fetch(
    request,
    env
  ) {

    const cors =
      getCorsHeaders(request);

    // ========================================================
    // OPTIONS
    // ========================================================

    if (
      request.method ===
      "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers: cors
        }
      );

    }

    // ========================================================
    // URL
    // ========================================================

    const url =
      new URL(request.url);

    const pathname =
      url.pathname;

    const action =
      url.searchParams.get(
        "action"
      );

    const key =
      url.searchParams.get(
        "key"
      );

    // ========================================================
    // HEALTH CHECK
    // ========================================================

    if (
      pathname === "/" &&
      !key &&
      !action
    ) {

      return json(
        {
          success: true,
          worker:
            "GTRADES-AXIS R2 Worker",
          status:
            "online"
        },
        200,
        request
      );

    }

    // ========================================================
    // REQUIRE R2
    // ========================================================

    if (
      !env.GTRADES_ASSETS
    ) {

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

    // ========================================================
    // FILE KEY
    // ========================================================

    if (
      key
    ) {

      // ======================================================
      // FILE / DOWNLOAD / PREVIEW
      // ======================================================

      if (
        action === "file" ||
        action === "download" ||
        action === "preview" ||
        (
          !action &&
          (
            request.method === "GET" ||
            request.method === "HEAD"
          )
        )
      ) {

        return handleFile(
          request,
          env.GTRADES_ASSETS,
          key,
          cors
        );

      }

      // ======================================================
      // UPLOAD
      // ======================================================

      if (
        action === "upload" ||
        request.method === "PUT"
      ) {

        return handleUpload(
          request,
          env.GTRADES_ASSETS,
          key,
          cors
        );

      }

    }

    // ========================================================
    // ROUTE NOT FOUND
    // ========================================================

    return json(
      {
        success: false,
        error:
          "Route not found.",
        availableRoutes: [
          "GET /?key=FILE_KEY&action=file",
          "HEAD /?key=FILE_KEY&action=file",
          "PUT /?key=FILE_KEY&action=upload"
        ]
      },
      404,
      request
    );

  }

};

// ============================================================
// R2 FILE HANDLER
// ============================================================

async function handleFile(
  request,
  bucket,
  key,
  cors
) {

  try {

    // ========================================================
    // GET RANGE
    // ========================================================

    const rangeHeader =
      request.headers.get(
        "Range"
      );

    let range = undefined;

    if (
      rangeHeader
    ) {

      const match =
        rangeHeader.match(
          /bytes=(\d*)-(\d*)/
        );

      if (
        match
      ) {

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
            end !== undefined
          ) {

            range.length =
              end -
              start +
              1;

          }

        }

      }

    }

    // ========================================================
    // R2 GET
    // ========================================================

    const object =
      await bucket.get(
        key,
        range
          ? { range }
          : undefined
      );

    // ========================================================
    // FILE NOT FOUND
    // ========================================================

    if (
      !object
    ) {

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

    // ========================================================
    // CONTENT TYPE
    // ========================================================

    let contentType =
      object.httpMetadata
        ?.contentType;

    if (
      !contentType
    ) {

      contentType =
        getContentType(
          key
        );

    }

    // ========================================================
    // HEAD REQUEST
    // ========================================================

    if (
      request.method ===
      "HEAD"
    ) {

      const headers = {

        ...cors,

        "Content-Type":
          contentType,

        "Content-Length":
          String(
            object.size
          ),

        "Accept-Ranges":
          "bytes",

        "Cache-Control":
          "public, max-age=3600"

      };

      if (
        object.httpEtag
      ) {

        headers.ETag =
          object.httpEtag;

      }

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

    // ========================================================
    // NORMAL / RANGE RESPONSE
    // ========================================================

    const headers = {

      ...cors,

      "Content-Type":
        contentType,

      "Accept-Ranges":
        "bytes",

      "Cache-Control":
        "public, max-age=3600"

    };

    // ========================================================
    // RANGE RESPONSE
    // ========================================================

    if (
      rangeHeader &&
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

      if (
        object.httpEtag
      ) {

        headers.ETag =
          object.httpEtag;

      }

      return new Response(
        object.body,
        {
          status: 206,
          headers
        }
      );

    }

    // ========================================================
    // FULL FILE
    // ========================================================

    headers[
      "Content-Length"
    ] =
      String(
        object.size
      );

    if (
      object.httpEtag
    ) {

      headers.ETag =
        object.httpEtag;

    }

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
          "Unable to read R2 file."
      },
      500,
      request
    );

  }

}

// ============================================================
// R2 UPLOAD HANDLER
// ============================================================

async function handleUpload(
  request,
  bucket,
  key,
  cors
) {

  try {

    if (
      !key
    ) {

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

    const body =
      request.body;

    if (
      !body
    ) {

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

    const contentType =
      request.headers.get(
        "Content-Type"
      ) ||
      getContentType(
        key
      );

    await bucket.put(
      key,
      body,
      {
        httpMetadata: {
          contentType
        }
      }
    );

    return json(
      {
        success: true,
        message:
          "Upload complete.",
        key,
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
// CONTENT TYPE
// ============================================================

function getContentType(
  key
) {

  const extension =
    key
      .split(".")
      .pop()
      ?.toLowerCase();

  const types = {

    mp4:
      "video/mp4",

    webm:
      "video/webm",

    mov:
      "video/quicktime",

    m4v:
      "video/x-m4v",

    pdf:
      "application/pdf",

    png:
      "image/png",

    jpg:
      "image/jpeg",

    jpeg:
      "image/jpeg",

    webp:
      "image/webp",

    gif:
      "image/gif",

    txt:
      "text/plain",

    csv:
      "text/csv",

    json:
      "application/json",

    zip:
      "application/zip",

    doc:
      "application/msword",

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