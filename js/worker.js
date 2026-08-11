export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --------------------------------------------------
    // CORS
    // --------------------------------------------------
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // --------------------------------------------------
    // UPLOAD
    // --------------------------------------------------
    if (
      request.method === "POST" &&
      url.pathname === "/upload"
    ) {
      try {
        const formData = await request.formData();

        const file = formData.get("file");
        const key = formData.get("key");

        if (!file || typeof file === "string") {
          return json(
            {
              success: false,
              error: "No file received.",
            },
            400
          );
        }

        if (!key) {
          return json(
            {
              success: false,
              error: "No R2 key provided.",
            },
            400
          );
        }

        await env.GTRADES_ASSETS.put(
          key,
          file.stream(),
          {
            httpMetadata: {
              contentType:
                file.type ||
                "application/octet-stream",

              cacheControl:
                "public, max-age=31536000",
            },
          }
        );

        const publicURL =
          `${url.origin}/file?key=${encodeURIComponent(key)}`;

        return json({
          success: true,
          message: "File uploaded successfully.",
          key,
          url: publicURL,
          size: file.size,
          contentType:
            file.type ||
            "application/octet-stream",
        });
      } catch (error) {
        console.error("UPLOAD ERROR:", error);

        return json(
          {
            success: false,
            error:
              error?.message ||
              "Upload failed.",
          },
          500
        );
      }
    }

    // --------------------------------------------------
    // VIDEO / FILE PLAYBACK
    // --------------------------------------------------
    if (
      request.method === "GET" ||
      request.method === "HEAD"
    ) {
      let key = url.searchParams.get("key");

      if (!key) {
        return json(
          {
            success: false,
            error: "Missing key.",
          },
          400
        );
      }

      key = decodeURIComponent(key);

      try {
        const object =
          await env.GTRADES_ASSETS.get(
            key,
            {
              range: request.headers,
            }
          );

        if (!object) {
          return json(
            {
              success: false,
              error: "File not found in R2.",
              key,
            },
            404
          );
        }

        const headers = new Headers(
          corsHeaders
        );

        // --------------------------------------------
        // CONTENT TYPE
        // --------------------------------------------
        headers.set(
          "Content-Type",
          object.httpMetadata?.contentType ||
            guessContentType(key)
        );

        // --------------------------------------------
        // CACHE
        // --------------------------------------------
        headers.set(
          "Cache-Control",
          "public, max-age=31536000"
        );

        // --------------------------------------------
        // RANGE SUPPORT
        // --------------------------------------------
        headers.set(
          "Accept-Ranges",
          "bytes"
        );

        // --------------------------------------------
        // CONTENT LENGTH
        // --------------------------------------------
        if (object.size !== undefined) {
          headers.set(
            "Content-Length",
            String(object.size)
          );
        }

        // --------------------------------------------
        // CONTENT RANGE
        // --------------------------------------------
        if (object.range) {
          const start =
            object.range.offset;

          const end =
            start +
            object.range.length -
            1;

          headers.set(
            "Content-Range",
            `bytes ${start}-${end}/${object.size}`
          );
        }

        // --------------------------------------------
        // HEAD
        // --------------------------------------------
        if (request.method === "HEAD") {
          return new Response(null, {
            status: object.range ? 206 : 200,
            headers,
          });
        }

        // --------------------------------------------
        // STREAM FILE
        // --------------------------------------------
        return new Response(
          object.body,
          {
            status:
              object.range ? 206 : 200,

            headers,
          }
        );

      } catch (error) {
        console.error(
          "R2 PLAYBACK ERROR:",
          error
        );

        return json(
          {
            success: false,
            error:
              error?.message ||
              "Unable to read file from R2.",
          },
          500
        );
      }
    }

    // --------------------------------------------------
    // UNKNOWN ENDPOINT
    // --------------------------------------------------
    return json(
      {
        success: false,
        error: "Endpoint not found.",
      },
      404
    );
  },
};

// ======================================================
// JSON RESPONSE
// ======================================================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods":
          "GET, HEAD, POST, OPTIONS",
      },
    }
  );
}

// ======================================================
// CONTENT TYPE
// ======================================================

function guessContentType(key) {
  const lower =
    key.toLowerCase();

  if (lower.endsWith(".mp4"))
    return "video/mp4";

  if (lower.endsWith(".webm"))
    return "video/webm";

  if (lower.endsWith(".mov"))
    return "video/quicktime";

  if (lower.endsWith(".m4v"))
    return "video/x-m4v";

  if (lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg"))
    return "image/jpeg";

  if (lower.endsWith(".png"))
    return "image/png";

  if (lower.endsWith(".webp"))
    return "image/webp";

  if (lower.endsWith(".txt"))
    return "text/plain";

  return "application/octet-stream";
}