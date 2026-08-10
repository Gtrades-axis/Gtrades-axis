// ============================================================
// GTRADES-AXIS™
// CLOUDFLARE R2 VIDEO WORKER
// AUTHENTICATED VIDEO STREAMING
// ============================================================

const ALLOWED_ORIGIN = "https://gtradesaxis.com";
const FIREBASE_PROJECT_ID = "gtrades-axis";

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let jwksCache = null;
let jwksCacheTime = 0;

const JWKS_CACHE_TIME = 60 * 60 * 1000;

// ============================================================
// CORS
// ============================================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Range",
    "Access-Control-Allow-Methods":
      "GET, HEAD, OPTIONS",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag",
    "Access-Control-Max-Age": "86400"
  };
}

// ============================================================
// RESPONSE
// ============================================================

function jsonResponse(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders(),
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    }
  );
}

// ============================================================
// LOAD GOOGLE FIREBASE PUBLIC KEYS
// ============================================================

async function getFirebaseKeys() {

  const now = Date.now();

  if (
    jwksCache &&
    now - jwksCacheTime < JWKS_CACHE_TIME
  ) {
    return jwksCache;
  }

  const response = await fetch(JWKS_URL, {
    headers: {
      Accept: "application/json"
    },
    cf: {
      cacheEverything: true,
      cacheTtl: 3600
    }
  });

  if (!response.ok) {
    throw new Error(
      "Unable to load Firebase verification keys."
    );
  }

  const data = await response.json();

  jwksCache = data;
  jwksCacheTime = now;

  return data;
}

// ============================================================
// BASE64URL
// ============================================================

function base64UrlToUint8Array(value) {

  let base64 =
    value
      .replaceAll("-", "+")
      .replaceAll("_", "/");

  while (base64.length % 4) {
    base64 += "=";
  }

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

  return bytes;
}

// ============================================================
// DECODE JWT
// ============================================================

function decodeJWT(token) {

  const parts =
    token.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid Firebase token."
    );
  }

  const header =
    JSON.parse(
      new TextDecoder().decode(
        base64UrlToUint8Array(
          parts[0]
        )
      )
    );

  const payload =
    JSON.parse(
      new TextDecoder().decode(
        base64UrlToUint8Array(
          parts[1]
        )
      )
    );

  return {
    header,
    payload,
    signingInput:
      `${parts[0]}.${parts[1]}`,
    signature:
      base64UrlToUint8Array(
        parts[2]
      )
  };
}

// ============================================================
// IMPORT GOOGLE PUBLIC KEY
// ============================================================

async function importFirebaseKey(jwk) {

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );
}

// ============================================================
// VERIFY FIREBASE TOKEN
// ============================================================

async function verifyFirebaseToken(token) {

  const decoded =
    decodeJWT(token);

  const {
    header,
    payload,
    signingInput,
    signature
  } = decoded;

  if (
    header.alg !==
    "RS256"
  ) {
    throw new Error(
      "Invalid token algorithm."
    );
  }

  if (!header.kid) {
    throw new Error(
      "Firebase token has no key ID."
    );
  }

  const keys =
    await getFirebaseKeys();

  const jwk =
    keys[header.kid];

  if (!jwk) {

    // Refresh keys once
    jwksCache = null;

    const freshKeys =
      await getFirebaseKeys();

    if (!freshKeys[header.kid]) {
      throw new Error(
        "Firebase signing key not found."
      );
    }

    const freshKey =
      await importFirebaseKey(
        freshKeys[header.kid]
      );

    const freshValid =
      await crypto.subtle.verify(
        {
          name:
            "RSASSA-PKCS1-v1_5"
        },
        freshKey,
        signature,
        new TextEncoder().encode(
          signingInput
        )
      );

    if (!freshValid) {
      throw new Error(
        "Invalid Firebase token signature."
      );
    }

  } else {

    const publicKey =
      await importFirebaseKey(
        jwk
      );

    const valid =
      await crypto.subtle.verify(
        {
          name:
            "RSASSA-PKCS1-v1_5"
        },
        publicKey,
        signature,
        new TextEncoder().encode(
          signingInput
        )
      );

    if (!valid) {
      throw new Error(
        "Invalid Firebase token signature."
      );
    }
  }

  const now =
    Math.floor(
      Date.now() / 1000
    );

  if (
    !payload.exp ||
    payload.exp <= now
  ) {
    throw new Error(
      "Firebase token has expired."
    );
  }

  if (
    !payload.iat ||
    payload.iat > now + 300
  ) {
    throw new Error(
      "Invalid Firebase token time."
    );
  }

  if (
    payload.aud !==
    FIREBASE_PROJECT_ID
  ) {
    throw new Error(
      "Invalid Firebase token audience."
    );
  }

  if (
    payload.iss !==
    `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
  ) {
    throw new Error(
      "Invalid Firebase token issuer."
    );
  }

  if (
    !payload.sub ||
    typeof payload.sub !== "string"
  ) {
    throw new Error(
      "Invalid Firebase user."
    );
  }

  return payload;
}

// ============================================================
// AUTHORIZATION
// ============================================================

async function requireFirebaseUser(request) {

  const authorization =
    request.headers.get(
      "Authorization"
    );

  if (!authorization) {
    throw new Error(
      "Authentication required."
    );
  }

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    throw new Error(
      "Invalid authorization header."
    );
  }

  const token =
    authorization.substring(
      7
    ).trim();

  if (!token) {
    throw new Error(
      "Missing Firebase token."
    );
  }

  return await verifyFirebaseToken(
    token
  );
}

// ============================================================
// SAFE KEY
// ============================================================

function validateVideoKey(key) {

  if (!key) {
    return false;
  }

  if (
    key.includes("..") ||
    key.startsWith("/") ||
    key.includes("\\")
  ) {
    return false;
  }

  if (
    !key.startsWith("videos/")
  ) {
    return false;
  }

  if (
    !key.toLowerCase().endsWith(".mp4")
  ) {
    return false;
  }

  return true;
}

// ============================================================
// STREAM R2 OBJECT
// ============================================================

async function streamVideo(
  request,
  env,
  key
) {

  const range =
    request.headers.get(
      "Range"
    );

  const r2Options = {};

  if (range) {
    r2Options.range =
      range;
  }

  const object =
    await env.GTRADES_ASSETS.get(
      key,
      r2Options
    );

  if (!object) {
    return jsonResponse(
      {
        error:
          "Video not found."
      },
      404
    );
  }

  const headers =
    new Headers(
      corsHeaders()
    );

  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType ||
      "video/mp4"
  );

  headers.set(
    "Accept-Ranges",
    "bytes"
  );

  headers.set(
    "Cache-Control",
    "private, max-age=3600"
  );

  if (object.httpEtag) {
    headers.set(
      "ETag",
      object.httpEtag
    );
  }

  if (object.size !== undefined) {

    headers.set(
      "Content-Length",
      String(
        object.size
      )
    );
  }

  if (object.range) {

    headers.set(
      "Content-Range",
      `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`
    );

    headers.set(
      "Content-Length",
      String(
        object.range.length
      )
    );

    return new Response(
      object.body,
      {
        status: 206,
        headers
      }
    );
  }

  return new Response(
    object.body,
    {
      status: 200,
      headers
    }
  );
}

// ============================================================
// MAIN
// ============================================================

export default {

  async fetch(
    request,
    env
  ) {

    const url =
      new URL(
        request.url
      );

    // --------------------------------------------------------
    // OPTIONS
    // --------------------------------------------------------

    if (
      request.method ===
      "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers:
            corsHeaders()
        }
      );
    }

    // --------------------------------------------------------
    // HEALTH CHECK
    // --------------------------------------------------------

    if (
      url.pathname ===
      "/"
    ) {

      return jsonResponse({
        success: true,
        worker:
          "GTRADES-AXIS R2 Video Worker",
        status:
          "online"
      });
    }

    // --------------------------------------------------------
    // ONLY GET / HEAD
    // --------------------------------------------------------

    if (
      request.method !== "GET" &&
      request.method !== "HEAD"
    ) {

      return jsonResponse(
        {
          error:
            "Method not allowed."
        },
        405
      );
    }

    const action =
      url.searchParams.get(
        "action"
      );

    // --------------------------------------------------------
    // VIDEO FILE
    // --------------------------------------------------------

    if (
      action ===
      "file"
    ) {

      try {

        // Firebase authentication
        const firebaseUser =
          await requireFirebaseUser(
            request
          );

        const key =
          url.searchParams.get(
            "key"
          );

        if (
          !validateVideoKey(
            key
          )
        ) {

          return jsonResponse(
            {
              error:
                "Invalid video key."
            },
            400
          );
        }

        console.log(
          "Authorized video request:",
          firebaseUser.uid,
          key
        );

        return await streamVideo(
          request,
          env,
          key
        );

      } catch (error) {

        console.error(
          "VIDEO AUTH ERROR:",
          error
        );

        return jsonResponse(
          {
            error:
              error.message ||
              "Unauthorized."
          },
          401
        );
      }
    }

    // --------------------------------------------------------
    // BLOCK EVERYTHING ELSE
    // --------------------------------------------------------

    return jsonResponse(
      {
        error:
          "Invalid request."
      },
      404
    );
  }
};