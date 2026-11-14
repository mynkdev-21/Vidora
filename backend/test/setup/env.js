/**
 * Loaded with `node --import` before any test or application module, so these
 * values win over backend/.env (dotenv never overrides variables that are
 * already set). Tests must never touch the development or production database.
 */
import os from "os";
import path from "path";

const TEST_DB = process.env.TEST_DB_NAME || "videora_test";
if (!/_test$/.test(TEST_DB)) {
  throw new Error(`Refusing to run tests against "${TEST_DB}": test database names must end in "_test".`);
}

Object.assign(process.env, {
  NODE_ENV: "test",
  DB_NAME: TEST_DB,
  JWT_SECRET: "t".repeat(48) + "-access-signing-key-for-tests-only",
  JWT_REFRESH_SECRET: "r".repeat(48) + "-refresh-signing-key-for-tests-only",
  API_KEYS: "test_web_key:web,test_mobile_key:mobile",
  UPLOADS_DIR: path.join(os.tmpdir(), "vidora-test-uploads"),
  TELEGRAM_BOT_TOKEN: "",
  // Never reach the real Firebase project from tests.
  FIREBASE_SERVICE_ACCOUNT_PATH: path.join(os.tmpdir(), "vidora-test-no-firebase.json"),
  FRONTEND_URL: "http://localhost:8080",
  FRONTEND_ORIGINS: "http://localhost:8080",
});
process.env.TRUST_PROXY ??= "";
