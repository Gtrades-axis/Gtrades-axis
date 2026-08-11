export default {
  async fetch(request, env) {

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    };

    // ---------------------------------------------------------
    // CORS
    // ---------------------------------------------------------

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {

      const url = new URL(request.url);
      const path = url.pathname;


      // =======================================================
      // HEALTH CHECK
      // =======================================================

      if (path === "/" && request.method === "GET") {

        return json({
          success: true,
          message: "GTRADES-AXIS R2 Worker is running."
        }, 200, corsHeaders);

      }


      // =======================================================
      // UPLOAD
      // POST /upload
      // =======================================================

      if (
        path === "/upload" &&
        request.method === "POST"
      ) {

        const formData =
          await request.formData();

        const file =
          formData.get("file");

        const key =
          formData.get("key");

        const contentType =
          formData.get("contentType") ||
          file?.type ||
          "application/octet-stream";


        if (!file) {

          return json({
            success: false,
            error: "No file received."
          }, 400, corsHeaders);

        }


        if (!key) {

          return json({
            success: false,
            error: "No R2 file key received."
          }, 400, corsHeaders);

        }


        // -----------------------------------------------------
        // SAVE TO R2
        // -----------------------------------------------------

        await env.GTRADES_ASSETS.put(
          key,
          file.stream(),
          {
            httpMetadata: {
              contentType: contentType
            }
          }
        );


        // -----------------------------------------------------
        // VERIFY FILE EXISTS
        // -----------------------------------------------------

        const saved =
          await env.GTRADES_ASSETS.head(key);

        if (!saved) {

          return json({
            success: false,
            error: "Upload completed but file could not be verified in R2."
          }, 500, corsHeaders);

        }


        // -----------------------------------------------------
        // RETURN FILE URL
        // -----------------------------------------------------

        const fileURL =
          `${url.origin}/file?key=${encodeURIComponent(key)}`;


        return json({
          success: true,
          message: "File uploaded successfully.",
          key: key,
          url: fileURL,
          size: saved.size,
          contentType: contentType
        }, 200, corsHeaders);

      }


      // =======================================================
      // GET FILE
      // GET /file?key=...
      // =======================================================

      if (
        path === "/file" &&
        request.method === "GET"
      ) {

        const key =
          url.searchParams.get("key");


        if (!key) {

          return json({
            success: false,
            error: "Missing file key."
          }, 400, corsHeaders);

        }


        // -----------------------------------------------------
        // GET FROM R2
        // -----------------------------------------------------

        const object =
          await env.GTRADES_ASSETS.get(key);


        if (!object) {

          return json({
            success: false,
            error: "File not found in R2.",
            key: key
          }, 404, corsHeaders);

        }


        // -----------------------------------------------------
        // HEADERS
        // -----------------------------------------------------

        const headers =
          new Headers(corsHeaders);


        object.writeHttpMetadata(headers);

        headers.set(
          "etag",
          object.httpEtag
        );

        headers.set(
          "Cache-Control",
          "public, max-age=31536000"
        );


        return new Response(
          object.body,
          {
            status: 200,
            headers: headers
          }
        );

      }


      // =======================================================
      // DELETE FILE
      // =======================================================

      if (
        path === "/delete" &&
        request.method === "DELETE"
      ) {

        const key =
          url.searchParams.get("key");


        if (!key) {

          return json({
            success: false,
            error: "Missing file key."
          }, 400, corsHeaders);

        }


        await env.GTRADES_ASSETS.delete(key);


        return json({
          success: true,
          message: "File deleted.",
          key: key
        }, 200, corsHeaders);

      }


      // =======================================================
      // 404
      // =======================================================

      return json({
        success: false,
        error: "Endpoint not found."
      }, 404, corsHeaders);


    } catch (error) {

      console.error(
        "GTRADES R2 WORKER ERROR:",
        error
      );

      return json({
        success: false,
        error:
          error?.message ||
          "Internal Worker error."
      }, 500, corsHeaders);

    }

  }
};


// ===========================================================
// JSON RESPONSE
// ===========================================================

function json(data, status = 200, corsHeaders = {}) {

  return new Response(
    JSON.stringify(data),
    {
      status: status,

      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    }
  );

}