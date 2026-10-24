const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// SECURITY: R2 credentials must never be committed to source control.
// Configure these Firebase secrets before deploying:
//   firebase functions:secrets:set R2_ACCOUNT_ID
//   firebase functions:secrets:set R2_ACCESS_KEY_ID
//   firebase functions:secrets:set R2_SECRET_ACCESS_KEY
//   firebase functions:secrets:set R2_BUCKET

const R2_ACCOUNT_ID = defineSecret("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = defineSecret("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = defineSecret("R2_SECRET_ACCESS_KEY");
const R2_BUCKET = defineSecret("R2_BUCKET");

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID.value()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID.value(),
      secretAccessKey: R2_SECRET_ACCESS_KEY.value(),
    },
  });
}

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }
  return request.auth.uid;
}

async function requireAdmin(request) {
  const uid = requireAuth(request);
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists || snap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Administrator access required.");
  }
  return uid;
}

function validatePaymentProofKey(key, uid) {
  if (typeof key !== "string" || key.length > 300 || key.includes("..")) {
    throw new HttpsError("invalid-argument", "Invalid payment proof key.");
  }
  const prefix = `payments/${uid}/`;
  if (!key.startsWith(prefix) || !/^[A-Za-z0-9._\/-]+$/.test(key)) {
    throw new HttpsError("permission-denied", "Payment proof must belong to the authenticated user.");
  }
}

function validateKey(key) {
  if (
    typeof key !== "string" ||
    key.length > 300 ||
    !/^(videos|thumbnails|payments)\/[A-Za-z0-9._\/-]+$/.test(key) ||
    key.includes("..")
  ) {
    throw new HttpsError("invalid-argument", "Invalid storage key.");
  }
}

exports.getR2UploadUrl = onCall(
  {
    secrets: [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET],
  },
  async (request) => {
    requireAuth(request);
    const { key, contentType } = request.data || {};

    if (!key || !contentType) {
      throw new HttpsError("invalid-argument", "Missing upload information.");
    }

    validateKey(key);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET.value(),
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(getR2Client(), command, { expiresIn: 900 });
    return { url, expiresIn: 900 };
  }
);

exports.checkPaymentSystem = onCall(
  { secrets: [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET] },
  async (request) => {
    requireAuth(request);
    try {
      const client = getR2Client();
      await client.send(new GetObjectCommand({
        Bucket: R2_BUCKET.value(),
        Key: "__gtrades_axis_payment_system_probe__"
      }));
    } catch (error) {
      // A missing probe object is expected; authentication/configuration errors are not.
      const status = error?.$metadata?.httpStatusCode;
      const code = error?.Code || error?.name || "";
      if (status === 404 || code === "NoSuchKey" || code === "NotFound") {
        return { configured: true, bucket: R2_BUCKET.value() };
      }
      console.error("Payment R2 diagnostic failed:", error);
      throw new HttpsError("failed-precondition", "The payment proof service is temporarily unavailable.");
    }
    return { configured: true, bucket: R2_BUCKET.value() };
  }
);

exports.getPaymentProofUploadUrl = onCall(
  { secrets: [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET] },
  async (request) => {
    const uid = requireAuth(request);
    const { key, contentType } = request.data || {};
    if (!key || !contentType) throw new HttpsError("invalid-argument", "Missing payment proof information.");
    validatePaymentProofKey(key, uid);
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(contentType)) throw new HttpsError("invalid-argument", "Only JPG, PNG, or PDF payment proofs are allowed.");
    const command = new PutObjectCommand({ Bucket: R2_BUCKET.value(), Key: key, ContentType: contentType });
    const url = await getSignedUrl(getR2Client(), command, { expiresIn: 900 });
    return { url, expiresIn: 900, key };
  }
);

exports.getPaymentProofDownloadUrl = onCall(
  { secrets: [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET] },
  async (request) => {
    await requireAdmin(request);
    const { key } = request.data || {};
    if (typeof key !== "string" || !key.startsWith("payments/") || key.includes("..")) {
      throw new HttpsError("invalid-argument", "Invalid payment proof key.");
    }
    const command = new GetObjectCommand({ Bucket: R2_BUCKET.value(), Key: key });
    const url = await getSignedUrl(getR2Client(), command, { expiresIn: 300 });
    return { url, expiresIn: 300 };
  }
);

exports.deletePaymentProof = onCall(
  { secrets: [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET] },
  async (request) => {
    await requireAdmin(request);
    const { key } = request.data || {};
    if (typeof key !== "string" || !key.startsWith("payments/") || key.includes("..")) {
      throw new HttpsError("invalid-argument", "Invalid payment proof key.");
    }
    await getR2Client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET.value(), Key: key }));
    return { success: true };
  }
);

exports.getR2DownloadUrl = onCall(
  {
    secrets: [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET],
  },
  async (request) => {
    requireAuth(request);
    const { key } = request.data || {};

    if (!key) {
      throw new HttpsError("invalid-argument", "Missing file key.");
    }

    validateKey(key);

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET.value(),
      Key: key,
    });

    const url = await getSignedUrl(getR2Client(), command, { expiresIn: 900 });
    return { url, expiresIn: 900 };
  }
);
