const { onCall } = require("firebase-functions/v2/https");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// YOUR R2 CREDENTIALS (Paste your keys here)
const s3 = new S3Client({
  endpoint: "https://1b6abc3b17e716d22ca9984ebbbc529f.r2.cloudflarestorage.com",
  region: "auto",
  credentials: {
    accessKeyId: "fb681664900c82a44443ff34b4d76cc0", // Your Access Key
    secretAccessKey: "84d18c35880dc526467890e0d33008bfd3a5c7b1ade5177bd9723c88170ac69d", // Your Secret
  },
});

exports.getR2UploadUrl = onCall(async (request) => {
  if (!request.auth) throw new Error("You must be logged in.");
  const { key, contentType } = request.data;

  const command = new PutObjectCommand({
    Bucket: "gtrades-assets",
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 900 });
  return { url };
});