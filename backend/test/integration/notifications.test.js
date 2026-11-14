/**
 * N5 — subscriber notifications used notifications.type = 'subscription',
 * which the enum didn't allow, so every insert failed silently.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { http, keyed, createUser, one, closeDb, pool } from "../helpers.js";

after(closeDb);

test("subscribers get an in-app notification when a creator uploads", async () => {
  const creator = await createUser();
  const subscriber = await createUser();
  await pool.query("UPDATE users SET fcm_token = ? WHERE id = ?", ["f".repeat(40), subscriber.id]);
  await pool.query("INSERT INTO subscriptions (id, subscriber_id, creator_id, notify) VALUES (?, ?, ?, 1)",
    [crypto.randomUUID(), subscriber.id, creator.id]);

  const up = await keyed(http().post("/api/files/upload"), creator.token)
    .attach("file", Buffer.from("hello"), { filename: "clip.txt", contentType: "text/plain" });
  assert.equal(up.status, 201);

  // Notification fan-out runs after the response; poll briefly.
  let row;
  for (let i = 0; i < 20 && !row; i++) {
    row = await one("SELECT type, title FROM notifications WHERE user_id = ?", [subscriber.id]);
    if (!row) await new Promise((r) => setTimeout(r, 50));
  }
  assert.ok(row, "notification was not created");
  assert.equal(row.type, "subscription");
});
