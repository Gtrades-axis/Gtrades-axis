export default {

  async fetch(
    request,
    env
  ) {

    const url =
      new URL(request.url);


    // ========================================================
    // CORS
    // ========================================================

    if (
      request.method === "OPTIONS"
    ) {

      return new Response(
        null,
        {
          headers:{
            "Access-Control-Allow-Origin":
              env.ALLOWED_ORIGIN,

            "Access-Control-Allow-Methods":
              "PUT,OPTIONS",

            "Access-Control-Allow-Headers":
              "Content-Type,X-Upload-Token",

            "Access-Control-Max-Age":
              "86400"
          }
        }
      );

    }


    // ========================================================
    // UPLOAD
    // ========================================================

    if (
      url.pathname === "/upload" &&
      request.method === "PUT"
    ) {

      return handleUpload(
        request,
        env
      );

    }


    return json(
      {
        error:
          "Not found"
      },
      404,
      env
    );

  }

};


// ============================================================
// UPLOAD
// ============================================================

async function handleUpload(
  request,
  env
) {

  const token =
    request.headers.get(
      "X-Upload-Token"
    );


  if (!token) {

    return json(
      {
        error:
          "Upload authorization required."
      },
      401,
      env
    );

  }


  /*
   * IMPORTANT:
   *
   * The token must be validated against the
   * r2UploadTokens Firestore collection.
   *
   * The Worker should NEVER accept:
   *
   * ?key=anything
   *
   * as authorization.
   */


  const tokenData =
    await getFirestoreToken(
      token,
      env
    );


  if (!tokenData) {

    return json(
      {
        error:
          "Invalid or expired upload authorization."
      },
      403,
      env
    );

  }


  if (
    tokenData.used === true
  ) {

    return json(
      {
        error:
          "Upload authorization already used."
      },
      403,
      env
    );

  }


  if (
    Date.now() >
    tokenData.expiresAt
  ) {

    return json(
      {
        error:
          "Upload authorization expired."
      },
      403,
      env
    );

  }


  const key =
    tokenData.key;


  const object =
    env.GTRADES_ASSETS.put(
      key,
      request.body,
      {
        httpMetadata:{
          contentType:
            tokenData.contentType
        }
      }
    );


  await object;


  await markTokenUsed(
    token,
    env
  );


  return json(
    {
      success:true,

      key

    },
    200,
    env
  );

}


// ============================================================
// FIRESTORE TOKEN
// ============================================================
//
// These functions require the Worker to have credentials
// capable of accessing Firestore.
//
// Set:
// FIREBASE_PROJECT_ID
// FIREBASE_SERVICE_ACCOUNT_EMAIL
// FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
//
// ============================================================

async function getFirestoreToken(
  token,
  env
) {

  const accessToken =
    await getGoogleAccessToken(
      env
    );


  const response =
    await fetch(

      `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/r2UploadTokens/${encodeURIComponent(token)}`,

      {
        headers:{
          Authorization:
            `Bearer ${accessToken}`
        }
      }

    );


  if (!response.ok) {

    return null;

  }


  const data =
    await response.json();


  const fields =
    data.fields || {};


  return {

    key:
      fields.key?.stringValue,

    contentType:
      fields.contentType?.stringValue,

    used:
      fields.used?.booleanValue === true,

    expiresAt:
      fields.expiresAt?.timestampValue
        ? Date.parse(
            fields.expiresAt.timestampValue
          )
        : 0

  };

}


// ============================================================
// MARK TOKEN USED
// ============================================================

async function markTokenUsed(
  token,
  env
) {

  const accessToken =
    await getGoogleAccessToken(
      env
    );


  await fetch(

    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/r2UploadTokens/${encodeURIComponent(token)}?updateMask.fieldPaths=used`,

    {

      method:"PATCH",

      headers:{
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json"
      },

      body:JSON.stringify({

        fields:{

          used:{
            booleanValue:true
          }

        }

      })

    }

  );

}


// ============================================================
// GOOGLE SERVICE ACCOUNT TOKEN
// ============================================================
//
// This portion uses JWT signing with Web Crypto.
// ============================================================

async function getGoogleAccessToken(
  env
) {

  const header = {
    alg:"RS256",
    typ:"JWT"
  };


  const now =
    Math.floor(
      Date.now() / 1000
    );


  const payload = {

    iss:
      env.FIREBASE_SERVICE_ACCOUNT_EMAIL,

    scope:
      "https://www.googleapis.com/auth/datastore",

    aud:
      "https://oauth2.googleapis.com/token",

    iat:
      now,

    exp:
      now + 3600

  };


  const encodedHeader =
    base64url(
      JSON.stringify(header)
    );


  const encodedPayload =
    base64url(
      JSON.stringify(payload)
    );


  const unsigned =
    `${encodedHeader}.${encodedPayload}`;


  const privateKey =
    await crypto.subtle.importKey(

      "pkcs8",

      pemToArrayBuffer(
        env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
      ),

      {
        name:"RSASSA-PKCS1-v1_5",
        hash:"SHA-256"
      },

      false,

      ["sign"]

    );


  const signature =
    await crypto.subtle.sign(

      "RSASSA-PKCS1-v1_5",

      privateKey,

      new TextEncoder().encode(
        unsigned
      )

    );


  const jwt =
    `${unsigned}.${arrayBufferToBase64Url(signature)}`;


  const response =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {

        method:"POST",

        headers:{
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body:
          `grant_type=${encodeURIComponent(
            "urn:ietf:params:oauth:grant-type:jwt-bearer"
          )}&assertion=${encodeURIComponent(
            jwt
          )}`

      }
    );


  if (!response.ok) {

    throw new Error(
      "Unable to authenticate Worker with Google."
    );

  }


  const data =
    await response.json();


  return data.access_token;

}


// ============================================================
// HELPERS
// ============================================================

function json(
  data,
  status,
  env
) {

  return new Response(
    JSON.stringify(data),
    {

      status,

      headers:{
        "Content-Type":
          "application/json",

        "Access-Control-Allow-Origin":
          env.ALLOWED_ORIGIN,

        "Access-Control-Allow-Headers":
          "Content-Type,X-Upload-Token"

      }

    }
  );

}


function base64url(
  value
) {

  return btoa(
    unescape(
      encodeURIComponent(
        value
      )
    )
  )
    .replaceAll("+","-")
    .replaceAll("/","_")
    .replaceAll("=","");

}


function arrayBufferToBase64Url(
  buffer
) {

  let binary = "";

  const bytes =
    new Uint8Array(
      buffer
    );


  for (
    const byte of bytes
  ) {

    binary += String.fromCharCode(
      byte
    );

  }


  return btoa(binary)
    .replaceAll("+","-")
    .replaceAll("/","_")
    .replaceAll("=","");

}


function pemToArrayBuffer(
  pem
) {

  const base64 =
    pem
      .replace(
        /-----BEGIN PRIVATE KEY-----/,
        ""
      )
      .replace(
        /-----END PRIVATE KEY-----/,
        ""
      )
      .replace(
        /\s/g,
        ""
      );


  const binary =
    atob(base64);


  const bytes =
    new Uint8Array(
      binary.length
    );


  for (
    let i = 0;
    i < binary.length;
    i++
  ) {

    bytes[i] =
      binary.charCodeAt(i);

  }


  return bytes.buffer;

}