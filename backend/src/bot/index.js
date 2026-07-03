/**
 * Vidora Telegram Bot
 *
 * Flow:
 *  1. User sends /start  → bot asks for API key
 *  2. User sends API key → verified against DB, chat_id saved
 *  3. User sends any file/video/document → bot downloads it,
 *     uploads to Vidora, replies with shareable link
 *
 * Run standalone:  node src/bot/index.js
 * Or imported by   src/index.js  (starts automatically with server)
 */

import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import axios       from "axios";
import FormData    from "form-data";
import path        from "path";
import fs          from "fs";
import { v4 as uuidv4 } from "uuid";
import pool        from "../db/connection.js";

const TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.BASE_URL || "http://localhost:5001";
const API_KEY  = process.env.API_KEYS?.split(",")[0]?.split(":")[0] || ""; // server-level key for internal calls

if (!TOKEN) {
  console.warn("⚠️  TELEGRAM_BOT_TOKEN not set — bot will not start.");
  process.exit(0);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ── helpers ───────────────────────────────────────────────────────────────────

/** Lookup user by API key, return { user_id, name, email } or null */
async function getUserByApiKey(apiKey) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, k.api_key
     FROM user_api_keys k
     JOIN users u ON u.id = k.user_id
     WHERE k.api_key = ?`,
    [apiKey.trim()]
  );
  return rows[0] || null;
}

/** Save / update telegram_chat_id for a user */
async function linkChatId(userId, chatId) {
  await pool.query(
    "UPDATE user_api_keys SET telegram_chat_id = ? WHERE user_id = ?",
    [chatId, userId]
  );
}

/** Get verified user by telegram chat_id */
async function getUserByChatId(chatId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, k.api_key
     FROM user_api_keys k
     JOIN users u ON u.id = k.user_id
     WHERE k.telegram_chat_id = ?`,
    [chatId]
  );
  return rows[0] || null;
}

/** Download a Telegram file to /tmp and return local path + original name */
async function downloadTelegramFile(fileId, fileName) {
  const fileInfo  = await bot.getFile(fileId);
  const fileUrl   = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;
  const ext       = path.extname(fileInfo.file_path) || path.extname(fileName || "") || "";
  const localName = `${uuidv4()}${ext}`;
  const localPath = path.join("/tmp", localName);

  const response = await axios.get(fileUrl, { responseType: "stream" });
  const writer   = fs.createWriteStream(localPath);

  await new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error",  reject);
  });

  return { localPath, localName, originalName: fileName || localName };
}

/** Upload file to Vidora backend on behalf of a user */
async function uploadToVidora(userId, userApiKey, localPath, originalName, mimeType) {
  const form = new FormData();
  form.append("file", fs.createReadStream(localPath), {
    filename:    originalName,
    contentType: mimeType || "application/octet-stream",
  });

  // We call the internal upload endpoint using the server-level API key
  // and a special bot-upload route that accepts user_id directly
  const res = await axios.post(
    `${BASE_URL}/api/files/bot-upload`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        "X-API-Key":    API_KEY,
        "X-Bot-User-Id": userId,
        "X-User-Api-Key": userApiKey,
      },
      maxContentLength: Infinity,
      maxBodyLength:    Infinity,
    }
  );

  return res.data;
}

// ── State: track users waiting to enter API key ───────────────────────────────
// chatId → "awaiting_key"
const pendingVerification = new Set();

// ── Bot handlers ──────────────────────────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  // Check if already verified
  const existing = await getUserByChatId(chatId).catch(() => null);
  if (existing) {
    return bot.sendMessage(chatId,
      `✅ *Already connected!*\n\nHello ${existing.name}, your account is linked.\n\nJust send me any file or video and I'll upload it to your Vidora profile.`,
      { parse_mode: "Markdown" }
    );
  }

  pendingVerification.add(chatId);
  bot.sendMessage(chatId,
    `👋 *Welcome to Vidora Bot!*\n\nTo get started, I need to verify your account.\n\n🔑 Please send your *Vidora API Key*.\n\nYou can find it at:\n👉 Dashboard → API Key`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/help/, async (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Vidora Bot Help*\n\n` +
    `/start — Connect your Vidora account\n` +
    `/status — Check your connection status\n` +
    `/copy <link> — Copy a Vidora file to your account\n` +
    `/help — Show this message\n\n` +
    `*Uploading files:*\nJust send any file, video, document, or photo and I'll upload it to your Vidora profile and send you the shareable link.`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/copy (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1].trim();

  // Must be verified
  const user = await getUserByChatId(chatId).catch(() => null);
  if (!user) {
    return bot.sendMessage(chatId, `🔒 Please link your account first.\n\nSend /start to get started.`);
  }

  const statusMsg = await bot.sendMessage(chatId, `⏳ Copying file…`);

  try {
    // Extract token from URL
    let token = url;
    if (token.includes("/v/")) token = token.split("/v/")[1];
    if (token.includes("/")) token = token.split("/")[0];
    if (token.includes("?")) token = token.split("?")[0];

    // Find original file
    let file = null;
    const [shareRows] = await pool.query(
      `SELECT f.* FROM share_tokens st JOIN files f ON f.id = st.file_id
       WHERE st.token = ? AND st.is_active = 1 AND f.status = 'active'`,
      [token]
    );
    if (shareRows.length) file = shareRows[0];
    else {
      const [fileRows] = await pool.query("SELECT * FROM files WHERE id = ? AND status = 'active'", [token]);
      if (fileRows.length) file = fileRows[0];
    }

    if (!file) {
      return bot.editMessageText(`❌ *File not found or link invalid.*`, { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "Markdown" });
    }

    if (file.user_id === user.id) {
      return bot.editMessageText(`ℹ️ This file is already in your account.`, { chat_id: chatId, message_id: statusMsg.message_id });
    }

    // Create reference copy
    const newId = uuidv4();
    await pool.query(
      `INSERT INTO files (id, user_id, original_name, stored_name, mime_type, size_bytes, storage_path, public_url, thumbnail_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [newId, user.id, file.original_name, file.stored_name, file.mime_type, file.size_bytes, file.storage_path, file.public_url, file.thumbnail_url]
    );

    // Generate share token for the copy
    const crypto = await import("crypto");
    const shareToken = crypto.randomBytes(12).toString("base64url");
    await pool.query(
      "INSERT INTO share_tokens (id, file_id, token) VALUES (?, ?, ?)",
      [uuidv4(), newId, shareToken]
    );
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";
    const copyShareUrl = `${FRONTEND_URL}/v/${shareToken}`;

    const safeName = file.original_name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    await bot.editMessageText(
      `✅ *File copied\\!*\n\n📄 ${safeName}\n📦 ${formatBytes(file.size_bytes)}\n\n🔗 Share Link:\n\`${copyShareUrl}\``,
      { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "MarkdownV2" }
    ).catch(() => {
      bot.editMessageText(
        `✅ File copied!\n\n📄 ${file.original_name}\n📦 ${formatBytes(file.size_bytes)}\n\n🔗 ${copyShareUrl}`,
        { chat_id: chatId, message_id: statusMsg.message_id }
      );
    });
  } catch (err) {
    console.error("[Bot] Copy error:", err.message);
    bot.editMessageText(`❌ Copy failed: ${err.message}`, { chat_id: chatId, message_id: statusMsg.message_id }).catch(() => {});
  }
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const user   = await getUserByChatId(chatId).catch(() => null);
  if (user) {
    bot.sendMessage(chatId,
      `✅ *Connected*\n\nAccount: ${user.name} (${user.email})\n\nSend me any file to upload it.`,
      { parse_mode: "Markdown" }
    );
  } else {
    bot.sendMessage(chatId,
      `❌ *Not connected*\n\nSend /start to link your Vidora account.`,
      { parse_mode: "Markdown" }
    );
  }
});

// ── Main message handler ──────────────────────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Skip commands — handled above
  if (msg.text?.startsWith("/")) return;

  // ── API key verification flow ──────────────────────────────────────────────
  if (pendingVerification.has(chatId) && msg.text) {
    const apiKey = msg.text.trim();

    try {
      const user = await getUserByApiKey(apiKey);
      if (!user) {
        return bot.sendMessage(chatId,
          `❌ *Invalid API key.*\n\nPlease check your key at Dashboard → API Key and try again.`,
          { parse_mode: "Markdown" }
        );
      }

      await linkChatId(user.id, chatId);
      pendingVerification.delete(chatId);

      bot.sendMessage(chatId,
        `✅ *Account verified!*\n\nWelcome, *${user.name}*! 🎉\n\nYour Telegram is now linked to your Vidora account.\n\n📤 Just send me any file or video and I'll upload it to your profile and give you a shareable link.`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      console.error("[Bot] Verification error:", err.message);
      bot.sendMessage(chatId, "⚠️ Something went wrong. Please try again.");
    }
    return;
  }

  // ── File / video upload flow ───────────────────────────────────────────────
  const hasFile = msg.document || msg.video || msg.audio || msg.photo || msg.voice || msg.video_note;
  if (!hasFile) return;

  // Must be verified
  const user = await getUserByChatId(chatId).catch(() => null);
  if (!user) {
    return bot.sendMessage(chatId,
      `🔒 Please link your account first.\n\nSend /start to get started.`
    );
  }

  // Determine file info
  let fileId, fileName, mimeType, fileSize;

  if (msg.document) {
    fileId   = msg.document.file_id;
    fileName = msg.document.file_name || "file";
    mimeType = msg.document.mime_type || "application/octet-stream";
    fileSize = msg.document.file_size;
  } else if (msg.video) {
    fileId   = msg.video.file_id;
    fileName = msg.video.file_name || `video_${Date.now()}.mp4`;
    mimeType = msg.video.mime_type || "video/mp4";
    fileSize = msg.video.file_size;
  } else if (msg.audio) {
    fileId   = msg.audio.file_id;
    fileName = msg.audio.file_name || `audio_${Date.now()}.mp3`;
    mimeType = msg.audio.mime_type || "audio/mpeg";
    fileSize = msg.audio.file_size;
  } else if (msg.photo) {
    // Largest photo size
    const photo = msg.photo[msg.photo.length - 1];
    fileId   = photo.file_id;
    fileName = `photo_${Date.now()}.jpg`;
    mimeType = "image/jpeg";
    fileSize = photo.file_size;
  } else if (msg.voice) {
    fileId   = msg.voice.file_id;
    fileName = `voice_${Date.now()}.ogg`;
    mimeType = msg.voice.mime_type || "audio/ogg";
    fileSize = msg.voice.file_size;
  } else if (msg.video_note) {
    fileId   = msg.video_note.file_id;
    fileName = `videonote_${Date.now()}.mp4`;
    mimeType = "video/mp4";
    fileSize = msg.video_note.file_size;
  }

  // Telegram Bot API getFile supports up to 50MB
  const MAX_BOT_SIZE = 50 * 1024 * 1024;
  if (fileSize && fileSize > MAX_BOT_SIZE) {
    return bot.sendMessage(chatId,
      `⚠️ *File too large* (${formatBytes(fileSize)})\n\nTelegram bots support files up to 50 MB.\n\nPlease upload larger files directly from the Dashboard.`,
      { parse_mode: "Markdown" }
    );
  }

  const statusMsg = await bot.sendMessage(chatId, `⏳ Uploading *${fileName}*…`, { parse_mode: "Markdown" });

  let localPath;
  try {
    // 1. Download from Telegram
    const downloaded = await downloadTelegramFile(fileId, fileName);
    localPath = downloaded.localPath;

    // 2. Upload to Vidora
    const result = await uploadToVidora(user.id, user.api_key, localPath, fileName, mimeType);

    const publicUrl  = result?.data?.file?.public_url || "";
    const fileRecord = result?.data?.file;
    const vidoraFileId = fileRecord?.id || "";

    // Generate share token and build share URL
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";
    let shareUrl = "";
    if (vidoraFileId) {
      try {
        const crypto = await import("crypto");
        const shareToken = crypto.randomBytes(12).toString("base64url");
        await pool.query(
          "INSERT INTO share_tokens (id, file_id, token) VALUES (?, ?, ?)",
          [uuidv4(), vidoraFileId, shareToken]
        );
        shareUrl = `${FRONTEND_URL}/v/${shareToken}`;
      } catch {
        shareUrl = `${FRONTEND_URL}/v/${vidoraFileId}`;
      }
    }

    // 3. Reply with link
    const safeName = (fileRecord?.original_name || fileName).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    await bot.editMessageText(
      `✅ *Upload successful!*\n\n` +
      `📄 *File:* ${safeName}\n` +
      `📦 *Size:* ${fileRecord ? formatBytes(fileRecord.size_bytes) : "—"}\n\n` +
      `🔗 *Share Link:*\n\`${shareUrl}\``,
      {
        chat_id:    chatId,
        message_id: statusMsg.message_id,
        parse_mode: "Markdown",
      }
    );

    // Tappable button — only works with public HTTPS URLs
    const isPublicUrl = shareUrl.startsWith("https://");
    if (isPublicUrl) {
      bot.sendMessage(chatId, "Tap to open share page:", {
        reply_markup: {
          inline_keyboard: [[{ text: "🔗 Open Share Page", url: shareUrl }]],
        },
      });
    }
  } catch (err) {
    console.error("[Bot] Upload error:", err.message);
    bot.editMessageText(
      `❌ *Upload failed*\n\n${err.message || "Something went wrong. Please try again."}`,
      { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "Markdown" }
    ).catch(() => {});
  } finally {
    // Clean up temp file
    if (localPath && fs.existsSync(localPath)) {
      fs.unlink(localPath, () => {});
    }
  }
});

// ── Polling error handler ─────────────────────────────────────────────────────
bot.on("polling_error", (err) => {
  console.error("[Bot] Polling error:", err.message);
});

function formatBytes(b) {
  if (!b) return "0 B";
  const k = 1024, s = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(2))} ${s[i]}`;
}

console.log("🤖 Vidora Telegram Bot started (polling)");

export default bot;
