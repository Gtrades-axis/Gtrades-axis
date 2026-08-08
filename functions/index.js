const { onCall } = require("firebase-functions/v2/https");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// ─── YOUR CLOUDFLARE R2 CREDENTIALS ───
const s3 = new S3Client({
  endpoint: "https://1b6abc3b17e716d22ca9984ebbbc529f.r2.cloudflarestorage.com",
  region: "auto",
  credentials: {
    accessKeyId: "fb681664900c82a44443ff34b4d76cc0",
    secretAccessKey: "84d18c35880dc526467890e0d33008bfd3a5c7b1ade5177bd9723c88170ac69d",
  },
});

// ─── 1. GENERATE UPLOAD URL ───
exports.getR2UploadUrl = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("You must be logged in to upload.");
  }

  const { key, contentType } = request.data;
  if (!key || !contentType) {
    throw new Error("Missing file key or content type.");
  }

  const command = new PutObjectCommand({
    Bucket: "gtrades-assets",
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min
  return { url };
});

// ─── 2. GENERATE DOWNLOAD URL ───
exports.getR2DownloadUrl = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("You must be logged in to download.");
  }

  const { key } = request.data;
  if (!key) {
    throw new Error("Missing file key.");
  }

  const command = new GetObjectCommand({
    Bucket: "gtrades-assets",
    Key: key,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min
  return { url };
});

console.log("✅ Cloudflare R2 functions loaded.");
