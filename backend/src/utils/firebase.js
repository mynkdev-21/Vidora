import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.resolve(__dirname, "../../firebase-service-account.json");

let firebaseInitialized = false;

export function initFirebase() {
  if (firebaseInitialized) return;
  
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log("✅ Firebase Admin initialized");
  } else {
    console.warn("⚠️  Firebase service account not found at:", serviceAccountPath);
    console.warn("   Push notifications will not work. Download from Firebase Console → Project Settings → Service Accounts");
  }
}

/**
 * Send push notification to multiple FCM tokens
 */
export async function sendPushNotification(tokens, title, body, data = {}) {
  if (!tokens.length) return { success: 0, failure: 0 };

  // Ensure Firebase is initialized
  if (!firebaseInitialized) initFirebase();
  if (!firebaseInitialized) return { success: 0, failure: 0 };

  // Filter out empty/null tokens
  const validTokens = tokens.filter(t => t && t.length > 10);
  if (!validTokens.length) return { success: 0, failure: 0 };

  const message = {
    data: { title, body, ...data, click_action: "OPEN_ACTIVITY" },
    tokens: validTokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`FCM: sent=${response.successCount}, failed=${response.failureCount}`);
    return { success: response.successCount, failure: response.failureCount };
  } catch (err) {
    console.error("FCM send error:", err.message);
    return { success: 0, failure: validTokens.length };
  }
}
