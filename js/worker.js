// ============================================================
// GTRADES-AXIS™
// CLOUDFLARE R2 VIDEO WORKER
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    try {

      // ------------------------------------------------------
      // HEALTH CHECK
      // ------------------------------------------------------
      if (url.pathname === "/" && request.method === "GET") {
        return json({
          success: true,
          service: "GTRADES-AXIS R2 Worker",
          status: "online"
        });
      }

      // ------------------------------------------------------
      // UPLOAD
      // POST /upload
      // ------------------------------------------------------
      if (
        url.pathname === "/upload" &&
        request.method === "POST"
      ) {
        return await handleUpload(request, env);
      }

      // ------------------------------------------------------
      // FILE
      // GET /file?key=videos/example.mp4
      // ------------------------------------------------------
      if (
        url.pathname === "/file" &&
        request.method === "GET"
      ) {
        return await handleFile(request, env);
      }

      // ------------------------------------------------------
      // DELETE
      // DELETE /delete?key=videos/example.mp4
      // ------------------------------------------------------
      if (
        url.pathname === "/delete" &&
        request.method === "DELETE"
      ) {
        return await handleDelete(request, env);
      }

      return json(
        {
          success: false,
          error: "Route not found"
        },
        404
      );

    } catch (error) {

      console.error(error);

      return json(
        {
          success: false,
          error: error?.message || "Worker error"
        },
        500
      );
    }
  }
};


// ============================================================
// UPLOAD
// ============================================================

async function handleUpload(request, env) {

  if (!env.GTRADES_ASSETS) {
    return json(
      {
        success: false,
        error: "R2 binding GTRADES_ASSETS is missing."
      },
      500
    );
  }

  const form = await request.formData();

  const file = form.get("file");
  const key = form.get("key");
  const suppliedContentType = form.get("contentType");

  if (!(file instanceof File)) {
    return json(
      {
        success: false,
        error: "No valid file received."
      },
      400
    );
  }

  if (!key) {
    return json(
      {
        success: false,
        error: "Missing R2 object key."
      },
      400
    );
  }

  // ----------------------------------------------------------
  // SECURITY / CLEAN KEY
  // ----------------------------------------------------------

  const cleanKey = String(key)
    .replace(/^\/+/, "")
    .replace(/\.\./g, "")
    .replace(/\\/g, "/");

  if (
    !cleanKey.startsWith("videos/") &&
    !cleanKey.startsWith("thumbnails/")
  ) {
    return json(
      {
        success: false,
        error: "Invalid upload path."
      },
      400
    );
  }

  // ----------------------------------------------------------
  // CONTENT TYPE
  // ----------------------------------------------------------

  const contentType =
    suppliedContentType ||
    file.type ||
    (
      cleanKey.startsWith("videos/")
        ? "video/mp4"
        : "image/jpeg"
    );

  // ----------------------------------------------------------
  // SAVE TO R2
  // ----------------------------------------------------------

  await env.GTRADES_ASSETS.put(
    cleanKey,
    file.stream(),
    {
      httpMetadata: {
        contentType: contentType,
        cacheControl:
          cleanKey.startsWith("videos/")
            ? "public, max-age=31536000"
            : "public, max-age=31536000"
      },

      customMetadata: {
        originalName: file.name || "",
        uploadedAt: new Date().toISOString()
      }
    }
  );

  // ----------------------------------------------------------
  // VERIFY OBJECT REALLY EXISTS
  // ----------------------------------------------------------

  const savedObject =
    await env.GTRADES_ASSETS.head(cleanKey);

  if (!savedObject) {
    return json(
      {
        success: false,
        error: "Upload completed but R2 verification failed."
      },
      500
    );
  }

  const publicURL =
    `${new URL(request.url).origin}/file?key=${encodeURIComponent(cleanKey)}`;

  return json({
    success: true,
    key: cleanKey,
    url: publicURL,
    fileName: file.name || "",
    fileSize: file.size || 0,
    contentType: contentType
  });
}


// ============================================================
// GET FILE
// ============================================================

async function handleFile(request, env) {

  if (!env.GTRADES_ASSETS) {
    return json(
      {
        success: false,
        error: "R2 binding GTRADES_ASSETS is missing."
      },
      500
    );
  }

  const url = new URL(request.url);

  const key =
    url.searchParams.get("key");

  if (!key) {
    return json(
      {
        success: false,
        error: "Missing file key."
      },
      400
    );
  }

  const cleanKey =
    String(key)
      .replace(/^\/+/, "")
      .replace(/\.\./g, "")
      .replace(/\\/g, "/");

  // ----------------------------------------------------------
  // R2 GET
  // ----------------------------------------------------------

  const object =
    await env.GTRADES_ASSETS.get(cleanKey);

  // ----------------------------------------------------------
  // THIS FIXES:
  // "File not found in R2"
  // ----------------------------------------------------------

  if (!object) {
    return json(
      {
        success: false,
        error: "File not found in R2.",
        key: cleanKey
      },
      404
    );
  }

  const headers =
    new Headers();

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
    "Accept-Ranges",
    "bytes"
  );

  const origin =
    request.headers.get("Origin");

  headers.set(
    "Access-Control-Allow-Origin",
    origin || "*"
  );

  headers.set(
    "Access-Control-Allow-Methods",
    "GET,HEAD,OPTIONS"
  );

  headers.set(
    "Access-Control-Allow-Headers",
    "Range,Content-Type"
  );

  headers.set(
    "Access-Control-Expose-Headers",
    "Content-Length,Content-Range,Accept-Ranges,ETag"
  );

  return new Response(
    object.body,
    {
      status: 200,
      headers
    }
  );
}


// ============================================================
// DELETE
// ============================================================

async function handleDelete(request, env) {

  const url =
    new URL(request.url);

  const key =
    url.searchParams.get("key");

  if (!key) {
    return json(
      {
        success: false,
        error: "Missing key."
      },
      400
    );
  }

  const cleanKey =
    String(key)
      .replace(/^\/+/, "")
      .replace(/\.\./g, "")
      .replace(/\\/g, "/");

  await env.GTRADES_ASSETS.delete(
    cleanKey
  );

  return json({
    success: true,
    deleted: cleanKey
  });
}


// ============================================================
// JSON
// ============================================================

function json(data, status = 200) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        ...corsHeaders()
      }
    }
  );
}


// ============================================================
// CORS
// ============================================================

function corsHeaders() {

  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type,Range",
    "Access-Control-Expose-Headers":
      "Content-Length,Content-Range,Accept-Ranges,ETag"
  };
}