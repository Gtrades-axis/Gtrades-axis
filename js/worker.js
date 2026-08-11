// ============================================================
// GTRADES-AXIS™ R2 UPLOADER
// Cloudflare Worker
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    // --------------------------------------------------------
    // OPTIONS
    // --------------------------------------------------------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // --------------------------------------------------------
    // POST /upload
    // --------------------------------------------------------
    if (request.method === "POST" && url.pathname === "/upload") {
      try {
        const contentType =
          request.headers.get("content-type") || "";

        if (!contentType.toLowerCase().includes("multipart/form-data")) {
          return json(
            {
              success: false,
              error: "Upload must use multipart/form-data.",
            },
            400,
            corsHeaders
          );
        }

        // IMPORTANT:
        // Parse the multipart form only once.
        const formData = await request.formData();

        const file = formData.get("file");
        const key = formData.get("key");
        const requestedType = formData.get("type");
        const suppliedContentType = formData.get("contentType");

        // ----------------------------------------------------
        // VALIDATE FILE
        // ----------------------------------------------------
        if (!file || typeof file === "string") {
          return json(
            {
              success: false,
              error: "No file was received.",
            },
            400,
            corsHeaders
          );
        }

        // ----------------------------------------------------
        // VALIDATE KEY
        // ----------------------------------------------------
        if (!key || typeof key !== "string") {
          return json(
            {
              success: false,
              error: "Missing R2 object key.",
            },
            400,
            corsHeaders
          );
        }

        // Security: prevent strange paths
        if (
          key.startsWith("/") ||
          key.includes("..") ||
          key.includes("\\")
        ) {
          return json(
            {
              success: false,
              error: "Invalid file key.",
            },
            400,
            corsHeaders
          );
        }

        // ----------------------------------------------------
        // CONTENT TYPE
        // ----------------------------------------------------
        const finalContentType =
          suppliedContentType ||
          file.type ||
          "application/octet-stream";

        // ----------------------------------------------------
        // R2 PUT
        // ----------------------------------------------------
        await env.GTRADES_ASSETS.put(
          key,
          file.stream(),
          {
            httpMetadata: {
              contentType: finalContentType,
            },
            customMetadata: {
              uploadType:
                requestedType || "file",
              originalName:
                file.name || "uploaded-file",
            },
          }
        );

        // ----------------------------------------------------
        // VERIFY OBJECT
        // ----------------------------------------------------
        const uploaded =
          await env.GTRADES_ASSETS.head(key);

        if (!uploaded) {
          return json(
            {
              success: false,
              error: "Upload completed but file could not be found in R2.",
            },
            500,
            corsHeaders
          );
        }

        // ----------------------------------------------------
        // FILE URL
        // ----------------------------------------------------
        const fileURL =
          `${url.origin}/file?key=${encodeURIComponent(key)}`;

        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------
        return json(
          {
            success: true,
            message: "File uploaded successfully.",
            key: key,
            url: fileURL,
            size: uploaded.size,
            contentType:
              uploaded.httpMetadata?.contentType ||
              finalContentType,
          },
          200,
          corsHeaders
        );

      } catch (error) {
        console.error("R2 UPLOAD ERROR:", error);

        return json(
          {
            success: false,
            error:
              error?.message ||
              "R2 upload failed.",
          },
          500,
          corsHeaders
        );
      }
    }

    // --------------------------------------------------------
    // GET /file?key=
    // --------------------------------------------------------
    if (
      request.method === "GET" &&
      url.pathname === "/file"
    ) {
      try {
        const key = url.searchParams.get("key");

        if (!key) {
          return json(
            {
              success: false,
              error: "Missing key.",
            },
            400,
            corsHeaders
          );
        }

        const object =
          await env.GTRADES_ASSETS.get(key);

        if (!object) {
          return json(
            {
              success: false,
              error: "File not found in R2.",
            },
            404,
            corsHeaders
          );
        }

        const headers = new Headers();

        object.writeHttpMetadata(headers);

        headers.set(
          "etag",
          object.httpEtag
        );

        headers.set(
          "Cache-Control",
          "public, max-age=31536000"
        );

        headers.set(
          "Access-Control-Allow-Origin",
          "*"
        );

        return new Response(
          object.body,
          {
            status: 200,
            headers,
          }
        );

      } catch (error) {
        console.error("R2 DOWNLOAD ERROR:", error);

        return json(
          {
            success: false,
            error:
              error?.message ||
              "Unable to retrieve file.",
          },
          500,
          corsHeaders
        );
      }
    }

    // --------------------------------------------------------
    // GET /
    // --------------------------------------------------------
    if (
      request.method === "GET" &&
      url.pathname === "/"
    ) {
      return json(
        {
          success: true,
          service: "GTRADES-AXIS R2 Uploader",
          status: "online",
          endpoints: {
            upload: "POST /upload",
            file: "GET /file?key=...",
          },
        },
        200,
        corsHeaders
      );
    }

    // --------------------------------------------------------
    // NOT FOUND
    // --------------------------------------------------------
    return json(
      {
        success: false,
        error: "Endpoint not found.",
      },
      404,
      corsHeaders
    );
  },
};

// ============================================================
// JSON RESPONSE
// ============================================================

function json(data, status, corsHeaders) {
  const headers = new Headers(corsHeaders);

  headers.set(
    "Content-Type",
    "application/json"
  );

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers,
    }
  );
}