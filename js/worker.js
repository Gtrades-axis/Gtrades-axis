export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Range,Authorization",
      "Access-Control-Expose-Headers":
        "Content-Length,Content-Range,Accept-Ranges,Content-Type,ETag"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    try {

      // ======================================================
      // HEALTH
      // ======================================================

      if (
        url.pathname === "/" &&
        !url.searchParams.get("key") &&
        request.method === "GET"
      ) {
        return json({
          success: true,
          service: "GTRADES-AXIS R2",
          status: "online"
        }, 200, cors);
      }


      // ======================================================
      // UPLOAD
      // ======================================================

      if (
        url.pathname === "/upload" &&
        request.method === "POST"
      ) {
        return await upload(request, env, cors);
      }


      // ======================================================
      // FILE
      // Supports:
      // /file?key=...
      // /?key=...
      // ======================================================

      if (
        (
          url.pathname === "/file" ||
          url.pathname === "/"
        ) &&
        request.method === "GET"
      ) {
        return await getFile(request, env, cors);
      }


      // ======================================================
      // HEAD
      // ======================================================

      if (
        (
          url.pathname === "/file" ||
          url.pathname === "/"
        ) &&
        request.method === "HEAD"
      ) {
        return await headFile(request, env, cors);
      }


      return json({
        success: false,
        error: "Route not found"
      }, 404, cors);

    } catch (error) {

      console.error("WORKER ERROR:", error);

      return json({
        success: false,
        error: error?.message || "Worker error"
      }, 500, cors);
    }
  }
};


// ==========================================================
// UPLOAD
// ==========================================================

async function upload(request, env, cors) {

  if (!env.GTRADES_ASSETS) {
    return json({
      success: false,
      error: "GTRADES_ASSETS R2 binding is missing."
    }, 500, cors);
  }

  const form = await request.formData();

  const file = form.get("file");
  const key = form.get("key");
  const contentType =
    form.get("contentType") ||
    (file instanceof File ? file.type : "");

  if (!(file instanceof File)) {
    return json({
      success: false,
      error: "No file received."
    }, 400, cors);
  }

  if (!key) {
    return json({
      success: false,
      error: "Missing R2 key."
    }, 400, cors);
  }

  const cleanKey =
    String(key)
      .replace(/^\/+/, "")
      .replace(/\.\./g, "")
      .replace(/\\/g, "/");

  if (
    !cleanKey.startsWith("videos/") &&
    !cleanKey.startsWith("thumbnails/")
  ) {
    return json({
      success: false,
      error: "Invalid R2 path."
    }, 400, cors);
  }

  await env.GTRADES_ASSETS.put(
    cleanKey,
    file.stream(),
    {
      httpMetadata: {
        contentType:
          contentType ||
          "application/octet-stream",

        cacheControl:
          "public, max-age=31536000"
      },

      customMetadata: {
        originalName:
          file.name || "",

        uploadedAt:
          new Date().toISOString()
      }
    }
  );


  // ========================================================
  // VERIFY
  // ========================================================

  const object =
    await env.GTRADES_ASSETS.head(cleanKey);

  if (!object) {
    return json({
      success: false,
      error: "File was uploaded but could not be verified in R2."
    }, 500, cors);
  }


  const fileURL =
    `${new URL(request.url).origin}/file?key=${encodeURIComponent(cleanKey)}`;


  return json({
    success: true,
    key: cleanKey,
    url: fileURL,
    fileName: file.name,
    fileSize: file.size,
    contentType:
      contentType ||
      "application/octet-stream"
  }, 200, cors);
}


// ==========================================================
// GET FILE
// ==========================================================

async function getFile(request, env, cors) {

  const url = new URL(request.url);

  const key =
    url.searchParams.get("key");

  if (!key) {
    return json({
      success: false,
      error: "Missing R2 object key."
    }, 400, cors);
  }

  const cleanKey =
    String(key)
      .replace(/^\/+/, "")
      .replace(/\.\./g, "")
      .replace(/\\/g, "/");


  const object =
    await env.GTRADES_ASSETS.get(
      cleanKey
    );


  if (!object) {
    return json({
      success: false,
      error: "File not found in R2.",
      key: cleanKey
    }, 404, cors);
  }


  let contentType =
    object.httpMetadata?.contentType;


  if (!contentType) {
    contentType =
      detectContentType(cleanKey);
  }


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
    "ETag",
    object.httpEtag || ""
  );


  // ========================================================
  // RANGE REQUEST
  // ========================================================

  const range =
    request.headers.get("Range");


  if (range) {

    const match =
      range.match(
        /^bytes=(\d+)-(\d*)$/
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

        headers.set(
          "Content-Range",
          `bytes */${object.size}`
        );

        return new Response(
          null,
          {
            status: 416,
            headers
          }
        );
      }


      end =
        Math.min(
          end,
          object.size - 1
        );


      const length =
        end - start + 1;


      const ranged =
        await env.GTRADES_ASSETS.get(
          cleanKey,
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


  // ========================================================
  // NORMAL FILE
  // ========================================================

  headers.set(
    "Content-Length",
    String(object.size)
  );


  return new Response(
    object.body,
    {
      status: 200,
      headers
    }
  );
}


// ==========================================================
// HEAD FILE
// ==========================================================

async function headFile(request, env, cors) {

  const url =
    new URL(request.url);

  const key =
    url.searchParams.get("key");

  if (!key) {
    return new Response(null, {
      status: 400,
      headers: cors
    });
  }


  const object =
    await env.GTRADES_ASSETS.head(
      key
    );


  if (!object) {
    return new Response(null, {
      status: 404,
      headers: cors
    });
  }


  const headers =
    new Headers(cors);


  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType ||
      detectContentType(key)
  );

  headers.set(
    "Content-Length",
    String(object.size)
  );

  headers.set(
    "Accept-Ranges",
    "bytes"
  );


  return new Response(
    null,
    {
      status: 200,
      headers
    }
  );
}


// ==========================================================
// CONTENT TYPE
// ==========================================================

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

  if (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg")
  )
    return "image/jpeg";

  if (lower.endsWith(".png"))
    return "image/png";

  if (lower.endsWith(".webp"))
    return "image/webp";

  return "application/octet-stream";
}


// ==========================================================
// JSON
// ==========================================================

function json(data, status, cors) {

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