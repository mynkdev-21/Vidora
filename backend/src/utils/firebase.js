/**
 * Firebase Cloud Messaging (push notifications).
 * Uses the modular firebase-admin API (the namespaced `admin.credential` /
 * `admin.messaging()` API was removed in firebase-admin 14).
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.resolve(__dirname, "../../firebase-service-account.json");

/** FCM accepts at most 500 tokens per multicast request. */
const FCM_MULTICAST_LIMIT = 500;

let firebaseInitialized = false;

export function initFirebase() {
  if (firebaseInitialized) return;
  if (getApps().length) {
    firebaseInitialized = true;
    return;
  }

  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    initializeApp({ credential: cert(serviceAccount) });
    firebaseInitialized = true;
    console.log("✅ Firebase Admin initialized");
  } else {
    console.warn("⚠️  Firebase service account not found — push notifications are disabled.");
    console.warn("   Set FIREBASE_SERVICE_ACCOUNT_PATH or place firebase-service-account.json in backend/.");
  }
}

/**
 * Send a data push to many FCM tokens (batched to the FCM limit).
 * Returns { success, failure } counts; never throws.
 */
export async function sendPushNotification(tokens, title, body, data = {}) {
  if (!tokens.length) return { success: 0, failure: 0 };

  if (!firebaseInitialized) initFirebase();
  if (!firebaseInitialized) return { success: 0, failure: 0 };

  const validTokens = tokens.filter((t) => t && t.length > 10);
  if (!validTokens.length) return { success: 0, failure: 0 };

  let success = 0;
  let failure = 0;
  for (let i = 0; i < validTokens.length; i += FCM_MULTICAST_LIMIT) {
    const batch = validTokens.slice(i, i + FCM_MULTICAST_LIMIT);
    try {
      const response = await getMessaging().sendEachForMulticast({
        data: { title, body, ...data, click_action: "OPEN_ACTIVITY" },
        tokens: batch,
      });
      success += response.successCount;
      failure += response.failureCount;
    } catch (err) {
      console.error("FCM send error:", err.message);
      failure += batch.length;
    }
  }
  console.log(`FCM: sent=${success}, failed=${failure}`);
  return { success, failure };
}
