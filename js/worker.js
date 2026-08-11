// ============================================================
// GTRADES-AXIS™
// CLOUDFLARE R2 UNIFIED VIDEO/FILE WORKER
// ============================================================

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET, POST, HEAD, OPTIONS",
      "Access-Control-Allow-Headers":
        "Range, Content-Type, Authorization",
      "Access-Control-Expose-Headers":
        "Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag",
      "Access-Control-Max-Age": "86400"
    };

    // --------------------------------------------------------
    // CORS PREFLIGHT
    // --------------------------------------------------------

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    // --------------------------------------------------------
    // UPLOAD
    // POST /upload
    // FormData:
    // file
    // key
    // contentType
    // --------------------------------------------------------

    if (
      request.method === "POST" &&
      url.pathname === "/upload"
    ) {

      try {

        const form = await request.formData();

        const file = form.get("file");
        const key = form.get("key");
        const suppliedType = form.get("contentType");

        if (!file) {
          return json(
            {
              success: false,
              error: "No file received."
            },
            400,
            cors
          );
        }

        if (!key) {
          return json(
            {
              success: false,
              error: "Missing R2 object key."
            },
            400,
            cors
          );
        }

        if (!(file instanceof File)) {
          return json(
            {
              success: false,
              error: "Invalid uploaded file."
            },
            400,
            cors
          );
        }

        const contentType =
          suppliedType ||
          file.type ||
          detectContentType(key);

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

        const saved =
          await env.GTRADES_ASSETS.head(key);

        if (!saved) {
          return json(
            {
              success: false,
              error:
                "Upload completed but file could not be verified in R2.",
              key
            },
            500,
            cors
          );
        }

        return json(
          {
            success: true,
            key,
            size: saved.size,
            contentType,
            etag: saved.etag,
            url:
              `${url.origin}/file?key=${encodeURIComponent(key)}`
          },
          200,
          cors
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
              "R2 upload failed."
          },
          500,
          cors
        );
      }
    }

    // --------------------------------------------------------
    // DELETE
    // DELETE /file?key=...
    // --------------------------------------------------------

    if (
      request.method === "POST" &&
      url.pathname === "/delete"
    ) {

      try {

        const body =
          await request.json();

        const key =
          body?.key;

        if (!key) {
          return json(
            {
              success: false,
              error: "Missing R2 object key."
            },
            400,
            cors
          );
        }

        await env.GTRADES_ASSETS.delete(key);

        return json(
          {
            success: true,
            key
          },
          200,
          cors
        );

      } catch (error) {

        return json(
          {
            success: false,
            error:
              error?.message ||
              "Delete failed."
          },
          500,
          cors
        );
      }
    }

    // --------------------------------------------------------
    // FILE INFORMATION
    // /info?key=...
    // --------------------------------------------------------

    if (
      url.pathname === "/info"
    ) {

      const key =
        url.searchParams.get("key");

      if (!key) {
        return json(
          {
            success: false,
            error: "Missing R2 object key."
          },
          400,
          cors
        );
      }

      try {

        const object =
          await env.GTRADES_ASSETS.head(key);

        if (!object) {
          return json(
            {
              success: false,
              error: "File not found in R2.",
              key
            },
            404,
            cors
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
              detectContentType(key)
          },
          200,
          cors
        );

      } catch (error) {

        return json(
          {
            success: false,
            error:
              error?.message ||
              "Unable to inspect R2 object."
          },
          500,
          cors
        );
      }
    }

    // --------------------------------------------------------
    // VIDEO / FILE DELIVERY
    //
    // Works with:
    //
    // /file?key=videos/example.mp4
    //
    // /?key=videos/example.mp4
    // --------------------------------------------------------

    if (
      request.method === "GET" ||
      request.method === "HEAD"
    ) {

      const key =
        url.searchParams.get("key");

      if (!key) {
        return json(
          {
            success: false,
            error: "Missing R2 object key."
          },
          400,
          cors
        );
      }

      try {

        const object =
          await env.GTRADES_ASSETS.get(key);

        if (!object) {

          return json(
            {
              success: false,
              error: "File not found in R2.",
              key
            },
            404,
            cors
          );
        }

        const contentType =
          object.httpMetadata?.contentType ||
          detectContentType(key);

        const headers =
          new Headers(cors);

        headers.set(
          "Content-Type",
          contentType
        );

        headers.set(
          "Accept-Ranges",
          "bytes"
        );

        headers.set(
          "Cache-Control",
          "public, max-age=3600"
        );

        headers.set(
          "Content-Length",
          String(object.size)
        );

        if (object.etag) {
          headers.set(
            "ETag",
            object.etag
          );
        }

        // ----------------------------------------------------
        // HEAD
        // ----------------------------------------------------

        if (request.method === "HEAD") {

          return new Response(
            null,
            {
              status: 200,
              headers
            }
          );
        }

        // ----------------------------------------------------
        // RANGE
        // Required for video seeking/streaming
        // ----------------------------------------------------

        const range =
          request.headers.get("Range");

        if (range) {

          const match =
            range.match(
              /bytes=(\d+)-(\d*)/
            );

          if (match) {

            const start =
              Number(match[1]);

            let end =
              match[2]
                ? Number(match[2])
                : object.size - 1;

            if (
              start >= object.size ||
              start < 0
            ) {

              const badHeaders =
                new Headers(cors);

              badHeaders.set(
                "Content-Range",
                `bytes */${object.size}`
              );

              return new Response(
                null,
                {
                  status: 416,
                  headers: badHeaders
                }
              );
            }

            if (end >= object.size) {
              end =
                object.size - 1;
            }

            if (end < start) {
              end =
                object.size - 1;
            }

            const length =
              end - start + 1;

            const ranged =
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
              ranged.body,
              {
                status: 206,
                headers
              }
            );
          }
        }

        // ----------------------------------------------------
        // NORMAL FILE
        // ----------------------------------------------------

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
          500,
          cors
        );
      }
    }

    // --------------------------------------------------------
    // WORKER STATUS
    // --------------------------------------------------------

    return json(
      {
        success: true,
        worker: "GTRADES-AXIS R2",
        status: "online"
      },
      200,
      cors
    );
  }
};


// ============================================================
// JSON RESPONSE
// ============================================================

function json(
  data,
  status = 200,
  cors = {}
) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...cors,
        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
}


// ============================================================
// CONTENT TYPE
// ============================================================

function detectContentType(key) {

  const lower =
    key.toLowerCase();

  if (lower.endsWith(".mp4"))
    return "video/mp4";

  if (lower.endsWith(".webm"))
    return "video/webm";

  if (lower.endsWith(".mov"))
    return "video/quicktime";

  if (lower.endsWith(".avi"))
    return "video/x-msvideo";

  if (lower.endsWith(".m4v"))
    return "video/x-m4v";

  if (lower.endsWith(".jpg"))
    return "image/jpeg";

  if (lower.endsWith(".jpeg"))
    return "image/jpeg";

  if (lower.endsWith(".png"))
    return "image/png";

  if (lower.endsWith(".webp"))
    return "image/webp";

  if (lower.endsWith(".gif"))
    return "image/gif";

  if (lower.endsWith(".pdf"))
    return "application/pdf";

  if (lower.endsWith(".txt"))
    return "text/plain";

  return "application/octet-stream";
}