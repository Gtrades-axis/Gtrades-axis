export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    const key =
      url.searchParams.get("key");

    const action =
      url.searchParams.get("action") || "file";


    /* =====================================================
       CORS
    ====================================================== */

    const corsHeaders = {

      "Access-Control-Allow-Origin": "*",

      "Access-Control-Allow-Methods":
        "GET, HEAD, OPTIONS",

      "Access-Control-Allow-Headers":
        "Range, Content-Type, Authorization",

      "Access-Control-Expose-Headers":
        "Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag"

    };


    /* =====================================================
       OPTIONS
    ====================================================== */

    if (
      request.method === "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers: corsHeaders
        }
      );

    }


    /* =====================================================
       REQUIRE KEY
    ====================================================== */

    if (!key) {

      return new Response(
        JSON.stringify({
          error:
            "Missing R2 object key."
        }),
        {
          status: 400,

          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json"
          }
        }
      );

    }


    console.log(
      "R2 REQUEST:",
      key
    );


    /* =====================================================
       GET OBJECT
    ====================================================== */

    try {

      const object =
        await env.GTRADES_ASSETS.get(
          key
        );


      if (!object) {

        return new Response(
          JSON.stringify({
            error:
              "File not found in R2.",
            key
          }),
          {
            status: 404,

            headers: {
              ...corsHeaders,
              "Content-Type":
                "application/json"
            }
          }
        );

      }


      /* ===================================================
         METADATA
      ==================================================== */

      const metadata =
        object.httpMetadata || {};


      let contentType =
        metadata.contentType;


      /* ===================================================
         DETECT FILE TYPE
      ==================================================== */

      if (!contentType) {

        if (
          key.toLowerCase()
            .endsWith(".mp4")
        ) {

          contentType =
            "video/mp4";

        } else if (
          key.toLowerCase()
            .endsWith(".webm")
        ) {

          contentType =
            "video/webm";

        } else if (
          key.toLowerCase()
            .endsWith(".mov")
        ) {

          contentType =
            "video/quicktime";

        } else if (
          key.toLowerCase()
            .endsWith(".jpg") ||
          key.toLowerCase()
            .endsWith(".jpeg")
        ) {

          contentType =
            "image/jpeg";

        } else if (
          key.toLowerCase()
            .endsWith(".png")
        ) {

          contentType =
            "image/png";

        } else {

          contentType =
            "application/octet-stream";

        }

      }


      /* ===================================================
         ACTION = JSON URL INFO
      ==================================================== */

      if (
        action === "info"
      ) {

        return new Response(

          JSON.stringify({

            key,

            size:
              object.size,

            etag:
              object.etag,

            contentType

          }),

          {
            status: 200,

            headers: {
              ...corsHeaders,

              "Content-Type":
                "application/json"
            }

          }

        );

      }


      /* ===================================================
         VIDEO / FILE RESPONSE
      ==================================================== */

      const headers =
        new Headers(
          corsHeaders
        );


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


      if (
        object.etag
      ) {

        headers.set(
          "ETag",
          object.etag
        );

      }


      if (
        object.size
      ) {

        headers.set(
          "Content-Length",
          String(
            object.size
          )
        );

      }


      /* ===================================================
         RANGE SUPPORT
      ==================================================== */

      const range =
        request.headers.get(
          "Range"
        );


      if (
        range &&
        object.size
      ) {

        const match =
          range.match(
            /bytes=(\d+)-(\d*)/
          );


        if (
          match
        ) {

          const start =
            Number(
              match[1]
            );


          let end =
            match[2]
              ? Number(
                  match[2]
                )
              : object.size - 1;


          if (
            end >= object.size
          ) {

            end =
              object.size - 1;

          }


          if (
            start > end ||
            start >= object.size
          ) {

            return new Response(
              null,
              {
                status: 416,

                headers: {
                  ...corsHeaders,

                  "Content-Range":
                    `bytes */${object.size}`
                }
              }
            );

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
            rangedObject.body,
            {
              status: 206,
              headers
            }
          );

        }

      }


      /* ===================================================
         HEAD
      ==================================================== */

      if (
        request.method === "HEAD"
      ) {

        return new Response(
          null,
          {
            status: 200,
            headers
          }
        );

      }


      /* ===================================================
         NORMAL FILE
      ==================================================== */

      return new Response(
        object.body,
        {
          status: 200,
          headers
        }
      );


    } catch (
      error
    ) {

      console.error(
        "R2 ERROR:",
        error
      );


      return new Response(

        JSON.stringify({

          error:
            "Unable to read R2 object.",

          message:
            error.message

        }),

        {
          status: 500,

          headers: {
            ...corsHeaders,

            "Content-Type":
              "application/json"
          }

        }

      );

    }

  }
};