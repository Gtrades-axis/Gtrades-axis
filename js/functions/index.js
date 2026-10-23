const {
  onCall,
  HttpsError
} = require("firebase-functions/v2/https");

const {
  defineSecret
} = require("firebase-functions/params");

const admin =
  require("firebase-admin");

const {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand
} = require("@aws-sdk/client-s3");

const {
  getSignedUrl
} = require("@aws-sdk/s3-request-presigner");

admin.initializeApp();

const db =
  admin.firestore();


// ============================================================
// R2 SECRETS
// ============================================================

const R2_ACCOUNT_ID =
  defineSecret("R2_ACCOUNT_ID");

const R2_ACCESS_KEY_ID =
  defineSecret("R2_ACCESS_KEY_ID");

const R2_SECRET_ACCESS_KEY =
  defineSecret("R2_SECRET_ACCESS_KEY");

const R2_BUCKET =
  defineSecret("R2_BUCKET");


// ============================================================
// R2 CLIENT
// ============================================================

function getR2Client() {

  return new S3Client({

    region:"auto",

    endpoint:
      `https://${R2_ACCOUNT_ID.value()}.r2.cloudflarestorage.com`,

    credentials:{

      accessKeyId:
        R2_ACCESS_KEY_ID.value(),

      secretAccessKey:
        R2_SECRET_ACCESS_KEY.value()

    }

  });

}


// ============================================================
// AUTH HELPER
// ============================================================

async function getUser(
  request
) {

  if (
    !request.auth ||
    !request.auth.uid
  ) {

    throw new HttpsError(
      "unauthenticated",
      "You must be logged in."
    );

  }


  const snap =
    await db
      .collection("users")
      .doc(request.auth.uid)
      .get();


  if (!snap.exists) {

    throw new HttpsError(
      "permission-denied",
      "User account not found."
    );

  }


  return {

    uid:
      request.auth.uid,

    data:
      snap.data()

  };

}


// ============================================================
// ADMIN CHECK
// ============================================================

async function requireAdmin(
  request
) {

  const user =
    await getUser(request);


  if (
    user.data.role !== "admin"
  ) {

    throw new HttpsError(
      "permission-denied",
      "Administrator access required."
    );

  }


  return user;

}


// ============================================================
// VERIFY ADMIN
// ============================================================

exports.verifyAdminAccess =
  onCall(
    async (request) => {

      await requireAdmin(
        request
      );


      return {
        admin:true
      };

    }
  );


// ============================================================
// CREATE UPLOAD AUTHORIZATION
// ============================================================

exports.createVideoUploadAuthorization =
  onCall(
    {
      secrets:[
        R2_ACCOUNT_ID,
        R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY,
        R2_BUCKET
      ]
    },

    async (request) => {

      await requireAdmin(
        request
      );


      const {
        key,
        contentType
      } =
        request.data || {};


      if (
        !key ||
        !contentType
      ) {

        throw new HttpsError(
          "invalid-argument",
          "Missing upload information."
        );

      }


      // Only allow our expected directories.

      if (
        !(
          key.startsWith("videos/") ||
          key.startsWith("thumbnails/")
        )
      ) {

        throw new HttpsError(
          "permission-denied",
          "Invalid R2 path."
        );

      }


      // ========================================================
      // IMPORTANT
      //
      // This token is temporary and is intended to be exchanged
      // by the Worker.
      //
      // For the strongest implementation, the Worker should
      // validate a signed one-time upload token.
      // ========================================================


      const token =
        admin
          .firestore()
          .collection(
            "r2UploadTokens"
          )
          .doc();


      await token.set({

        uid:
          request.auth.uid,

        key,

        contentType,

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),

        expiresAt:
          admin.firestore.Timestamp.fromMillis(
            Date.now() + 5 * 60 * 1000
          ),

        used:false

      });


      return {

        token:
          token.id

      };

    }
  );


// ============================================================
// SAVE VIDEO METADATA
// ============================================================

exports.saveVideoMetadata =
  onCall(
    async (request) => {

      const user =
        await requireAdmin(
          request
        );


      const data =
        request.data || {};


      const {
        videoId,
        title,
        category,
        duration,
        description,
        premiumOnly,
        videoKey,
        thumbnailKey
      } = data;


      if (!title) {

        throw new HttpsError(
          "invalid-argument",
          "Video title is required."
        );

      }


      if (
        !videoId &&
        !videoKey
      ) {

        throw new HttpsError(
          "invalid-argument",
          "Video file is required."
        );

      }


      const payload = {

        title,

        category:
          category || "General",

        duration:
          duration || "",

        description:
          description || "",

        premiumOnly:
          premiumOnly === true,

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),

        updatedBy:
          user.uid

      };


      if (videoKey) {

        payload.videoKey =
          videoKey;

      }


      if (thumbnailKey) {

        payload.thumbnailKey =
          thumbnailKey;

      }


      if (videoId) {

        await db
          .collection("videos")
          .doc(videoId)
          .update(
            payload
          );

      } else {

        payload.createdAt =
          admin.firestore.FieldValue.serverTimestamp();


        await db
          .collection("videos")
          .add(
            payload
          );

      }


      return {
        success:true
      };

    }
  );


// ============================================================
// GET SECURE VIDEO URL
// ============================================================

exports.getVideoDownloadUrl =
  onCall(
    {
      secrets:[
        R2_ACCOUNT_ID,
        R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY,
        R2_BUCKET
      ]
    },

    async (request) => {

      const user =
        await getUser(
          request
        );


      const {
        videoId
      } =
        request.data || {};


      if (!videoId) {

        throw new HttpsError(
          "invalid-argument",
          "Video ID is required."
        );

      }


      const videoSnap =
        await db
          .collection("videos")
          .doc(videoId)
          .get();


      if (!videoSnap.exists) {

        throw new HttpsError(
          "not-found",
          "Video not found."
        );

      }


      const video =
        videoSnap.data();


      // ========================================================
      // SERVER-SIDE MEMBERSHIP CHECK
      // ========================================================

      const isAdmin =
        user.data.role === "admin";


      const isPremium =
        user.data.membership === "premium";


      if (
        video.premiumOnly === true &&
        !isAdmin &&
        !isPremium
      ) {

        throw new HttpsError(
          "permission-denied",
          "Premium membership required."
        );

      }


      if (!video.videoKey) {

        throw new HttpsError(
          "failed-precondition",
          "Video file is not attached."
        );

      }


      const client =
        getR2Client();


      const command =
        new GetObjectCommand({

          Bucket:
            R2_BUCKET.value(),

          Key:
            video.videoKey

        });


      // ========================================================
      // TEMPORARY URL
      //
      // 10 MINUTES
      // ========================================================

      const url =
        await getSignedUrl(
          client,
          command,
          {
            expiresIn:
              600
          }
        );


      return {

        url,

        expiresIn:
          600

      };

    }
  );


// ============================================================
// SET PREMIUM STATUS
// ============================================================

exports.setVideoPremiumStatus =
  onCall(
    async (request) => {

      await requireAdmin(
        request
      );


      const {
        videoId,
        premiumOnly
      } =
        request.data || {};


      if (!videoId) {

        throw new HttpsError(
          "invalid-argument",
          "Video ID required."
        );

      }


      await db
        .collection("videos")
        .doc(videoId)
        .update({

          premiumOnly:
            premiumOnly === true,

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp()

        });


      return {
        success:true
      };

    }
  );


// ============================================================
// DELETE VIDEO
// ============================================================

exports.deleteVideo =
  onCall(
    {
      secrets:[
        R2_ACCOUNT_ID,
        R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY,
        R2_BUCKET
      ]
    },

    async (request) => {

      await requireAdmin(
        request
      );


      const {
        videoId
      } =
        request.data || {};


      if (!videoId) {

        throw new HttpsError(
          "invalid-argument",
          "Video ID required."
        );

      }


      const videoRef =
        db
          .collection("videos")
          .doc(videoId);


      const videoSnap =
        await videoRef.get();


      if (!videoSnap.exists) {

        throw new HttpsError(
          "not-found",
          "Video not found."
        );

      }


      const video =
        videoSnap.data();


      // ========================================================
      // DELETE R2 VIDEO
      // ========================================================

      const client =
        getR2Client();


      if (video.videoKey) {

        await client.send(
          new DeleteObjectCommand({

            Bucket:
              R2_BUCKET.value(),

            Key:
              video.videoKey

          })
        );

      }


      // ========================================================
      // DELETE THUMBNAIL
      // ========================================================

      if (video.thumbnailKey) {

        await client.send(
          new DeleteObjectCommand({

            Bucket:
              R2_BUCKET.value(),

            Key:
              video.thumbnailKey

          })
        );

      }


      await videoRef.delete();


      return {
        success:true
      };

    }
  );