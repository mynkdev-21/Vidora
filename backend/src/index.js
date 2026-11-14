/**
 * Server entry point: validates configuration, then starts the HTTP server,
 * Firebase and (optionally) the Telegram bot. The Express app lives in app.js.
 */
import { config, validateConfig } from "./config.js";

const { errors, warnings } = validateConfig();
warnings.forEach((w) => console.warn(`⚠️  ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`❌ ${e}`));
  if (config.isProduction) {
    console.error("Refusing to start in production with an unsafe configuration.");
    process.exit(1);
  }
}

const { default: app } = await import("./app.js");
const { verifyConnection } = await import("./db/connection.js");
try {
  await verifyConnection();
} catch (err) {
  console.error("❌ MySQL connection failed:", err.message);
  process.exit(1);
}

const { initFirebase } = await import("./utils/firebase.js");
initFirebase();

const { startCleanupJob } = await import("./jobs/cleanup.js");
startCleanupJob();

if (config.telegramBotToken) {
  import("./bot/index.js").catch((err) => console.error("⚠️  Bot failed to start:", err.message));
}

app.listen(config.port, "0.0.0.0", () => {
  console.log(`\n🚀 Videora API running on http://0.0.0.0:${config.port}`);
  console.log(`   Public URL:  ${config.baseUrl}`);
  console.log(`   Environment: ${config.env}\n`);
});
