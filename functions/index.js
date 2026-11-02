const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
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
