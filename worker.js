// ============================================================
// GTRADES-AXIS™
// CLOUDFLARE R2 WORKER
// r2-uploader.davidthuku574.workers.dev
//
// R2 binding required:
//   GTRADES_ASSETS -> gtrades-assets
//
// IMPORTANT:
// - Existing R2 objects are never deleted.
// - POST /upload uploads files.
// - GET /?key=... serves files.
// - GET /file?key=... is retained for backward compatibility.
// ============================================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Range, Content-Type, Authorization",
    "Access-Control-Allow-Methods":
      "GET, HEAD, POST, OPTIONS",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json"
    }
  });
}

function normaliseKey(value) {
  if (typeof value !== "string") return "";

  let key = value.trim();

  // R2 object keys should not be sent with a leading slash.
  key = key.replace(/^\/+/, "");
  // Reject malformed/local paths that are not valid R2 object keys.
  key = key.replace(/\\/g, "/");
  key = key.replace(/\/{2,}/g, "/");
  key = key.replace(/^\.\//, "");
  if (key.includes("..")) return "";

  return key;
}

function guessContentType(key) {
  const lower = key.toLowerCase();

  if (lower.endsWith(".pdf"))
    return "application/pdf";

  if (lower.endsWith(".mp4"))
    return "video/mp4";

  if (lower.endsWith(".webm"))
    return "video/webm";

  if (lower.endsWith(".mov"))
    return "video/quicktime";

  if (lower.endsWith(".m4v"))
    return "video/x-m4v";

  if (lower.endsWith(".avi"))
    return "video/x-msvideo";

  if (lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg"))
    return "image/jpeg";

  if (lower.endsWith(".png"))
    return "image/png";

  if (lower.endsWith(".webp"))
    return "image/webp";

  if (lower.endsWith(".gif"))
    return "image/gif";

  if (lower.endsWith(".txt"))
    return "text/plain";

  if (lower.endsWith(".csv"))
    return "text/csv";

  if (lower.endsWith(".json"))
    return "application/json";

  return "application/octet-stream";
}

function getContentType(object, key) {
  return (
    object?.httpMetadata?.contentType ||
    guessContentType(key)
  );
}



// ============================================================
// R2 MULTIPART UPLOADS
// Large files are uploaded in <= 50 MiB requests so the browser
// never sends the entire video through one Cloudflare request.
// ============================================================
const MULTIPART_CHUNK_SIZE = 50 * 1024 * 1024;

async function createMultipartUpload(request, env) {
  try {
    const body = await request.json();
    const key = normaliseKey(body?.key);
    const contentType = body?.contentType || guessContentType(key);

    if (!key) return json({ success: false, error: "No R2 object key provided." }, 400);

    const upload = await env.GTRADES_ASSETS.createMultipartUpload(key, {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=31536000"
      }
    });

    return json({
      success: true,
      key,
      uploadId: upload.uploadId,
      chunkSize: MULTIPART_CHUNK_SIZE
    });
  } catch (error) {
    console.error("R2 MULTIPART CREATE ERROR:", error);
    return json({
      success: false,
      error: error?.message || "Could not start multipart upload."
    }, 500);
  }
}

async function uploadMultipartPart(request, env) {
  try {
    const url = new URL(request.url);
    const key = normaliseKey(url.searchParams.get("key"));
    const uploadId = url.searchParams.get("uploadId") || "";
    const partNumber = Number(url.searchParams.get("partNumber"));

    if (!key || !uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
      return json({ success: false, error: "Missing or invalid multipart parameters." }, 400);
    }

    const part = await env.GTRADES_ASSETS.resumeMultipartUpload(key, uploadId);
    const uploadedPart = await part.uploadPart(partNumber, request.body);

    return json({
      success: true,
      partNumber,
      etag: uploadedPart.etag
    });
  } catch (error) {
    console.error("R2 MULTIPART PART ERROR:", error);
    return json({
      success: false,
      error: error?.message || "Could not upload multipart chunk."
    }, 500);
  }
}

async function completeMultipartUpload(request, env) {
  try {
    const body = await request.json();
    const key = normaliseKey(body?.key);
    const uploadId = body?.uploadId || "";
    const parts = Array.isArray(body?.parts) ? body.parts : [];

    if (!key || !uploadId || !parts.length) {
      return json({ success: false, error: "Missing multipart completion data." }, 400);
    }

    const upload = await env.GTRADES_ASSETS.resumeMultipartUpload(key, uploadId);
    const object = await upload.complete(parts.map(part => ({
      partNumber: Number(part.partNumber),
      etag: part.etag
    })));

    return json({
      success: true,
      key,
      size: object.size,
      etag: object.etag,
      url: `${new URL(request.url).origin}/?key=${encodeURIComponent(key)}`
    });
  } catch (error) {
    console.error("R2 MULTIPART COMPLETE ERROR:", error);
    return json({
      success: false,
      error: error?.message || "Could not complete multipart upload."
    }, 500);
  }
}

async function uploadFile(request, env) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const keyValue = formData.get("key");

    if (!file || typeof file === "string") {
      return json(
        {
          success: false,
          error: "No file received."
        },
        400
      );
    }

    const key = normaliseKey(keyValue);

    if (!key) {
      return json(
        {
          success: false,
          error: "No R2 object key provided."
        },
        400
      );
    }

    const contentType =
      file.type ||
      formData.get("contentType") ||
      "application/octet-stream";

    await env.GTRADES_ASSETS.put(
      key,
      file.stream(),
      {
        httpMetadata: {
          contentType,
          cacheControl:
            "public, max-age=31536000"
        }
      }
    );

    return json({
      success: true,
      message: "File uploaded successfully.",
      key,
      size: file.size,
      contentType,
      url:
        `${new URL(request.url).origin}` +
        `/?key=${encodeURIComponent(key)}`
    });
  } catch (error) {
    console.error("R2 UPLOAD ERROR:", error);

    return json(
      {
        success: false,
        error:
          error?.message ||
          "R2 upload failed."
      },
      500
    );
  }
}

async function serveFile(request, env, key) {
  if (!key) {
    return json(
      {
        success: false,
        error: "Missing R2 object key."
      },
      400
    );
  }

  try {
    // First read the object's metadata/body.
    const object =
      await env.GTRADES_ASSETS.get(key);

    if (!object) {
      return json(
        {
          success: false,
          error: "File not found in R2.",
          key
        },
        404
      );
    }

    const headers =
      new Headers(corsHeaders());

    headers.set(
      "Content-Type",
      getContentType(object, key)
    );

    headers.set(
      "Accept-Ranges",
      "bytes"
    );

    headers.set(
      "Cache-Control",
      "public, max-age=3600"
    );

    if (object.etag) {
      headers.set("ETag", object.etag);
    }

    if (object.size !== undefined) {
      headers.set(
        "Content-Length",
        String(object.size)
      );
    }

    // ----------------------------------------------------------
    // RANGE SUPPORT
    // Important for HTML5 video seeking/preview.
    // ----------------------------------------------------------
    const rangeHeader =
      request.headers.get("Range");

    if (
      rangeHeader &&
      object.size !== undefined
    ) {
      const match =
        rangeHeader.match(
          /bytes=(\d+)-(\d*)/
        );

      if (match) {
        const start =
          Number(match[1]);

        let end =
          match[2]
            ? Number(match[2])
            : object.size - 1;

        if (end >= object.size) {
          end = object.size - 1;
        }

        if (
          start < 0 ||
          start > end ||
          start >= object.size
        ) {
          return new Response(null, {
            status: 416,
            headers: {
              ...corsHeaders(),
              "Content-Range":
                `bytes */${object.size}`
            }
          });
        }

        const length =
          end - start + 1;

        const rangedObject =
          await env.GTRADES_ASSETS.get(
            key,
            {
              range: {
                offset: start,
                length
              }
            }
          );

        headers.set(
          "Content-Length",
          String(length)
        );

        headers.set(
          "Content-Range",
          `bytes ${start}-${end}/${object.size}`
        );

        return new Response(
          request.method === "HEAD"
            ? null
            : rangedObject.body,
          {
            status: 206,
            headers
          }
        );
      }
    }

    if (request.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers
      });
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
      "R2 READ ERROR:",
      error
    );

    return json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to read R2 object.",
        key
      },
      500
    );
  }
}

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    // ----------------------------------------------------------
    // PREFLIGHT
    // ----------------------------------------------------------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // ----------------------------------------------------------
    // UPLOAD
    // ----------------------------------------------------------
    if (request.method === "POST" && url.pathname === "/multipart/create") {
      return createMultipartUpload(request, env);
    }

    if (request.method === "PUT" && url.pathname === "/multipart/part") {
      return uploadMultipartPart(request, env);
    }

    if (request.method === "POST" && url.pathname === "/multipart/complete") {
      return completeMultipartUpload(request, env);
    }

    if (
      request.method === "POST" &&
      url.pathname === "/upload"
    ) {
      return uploadFile(request, env);
    }

    // ----------------------------------------------------------
    // FILE SERVING
    //
    // Supports:
    //   /file?key=videos/example.mp4
    //   /?key=videos/example.mp4
    //   /?key=videos/example.mp4&action=file
    // ----------------------------------------------------------
    if (
      request.method === "GET" ||
      request.method === "HEAD"
    ) {
      const rawKey =
        url.searchParams.get("key");

      const key =
        normaliseKey(rawKey);

      return serveFile(
        request,
        env,
        key
      );
    }

    return json(
      {
        success: false,
        error: "Endpoint not found."
      },
      404
    );
  }
};
