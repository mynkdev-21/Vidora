import { test } from "node:test";
import assert from "node:assert/strict";
import { validateConfig } from "../../src/config.js";

const strong = (c) => c.repeat(64);
const base = (overrides = {}) => ({
  isProduction: true,
  jwt: { secret: strong("a"), refreshSecret: strong("b") },
  apiKeys: new Map([["k", "web"]]),
  frontendUrl: "https://vidora.app",
  baseUrl: "https://api.vidora.app",
  trustProxy: 1,
  ...overrides,
});

test("P2: production config with strong secrets passes", () => {
  assert.deepEqual(validateConfig(base()).errors, []);
});

test("P2: placeholder, short, missing or reused JWT secrets are rejected in production", () => {
  const cases = [
    { secret: "vidora_super_secret_jwt_key_change_this_in_production", refreshSecret: strong("b") },
    { secret: "short", refreshSecret: strong("b") },
    { secret: undefined, refreshSecret: strong("b") },
    { secret: strong("a"), refreshSecret: strong("a") },
  ];
  for (const jwt of cases) {
    assert.ok(validateConfig(base({ jwt })).errors.length > 0, `expected rejection for ${JSON.stringify(Object.keys(jwt))}`);
  }
});

test("P2: production requires https URLs; warns about missing TRUST_PROXY", () => {
  const { errors, warnings } = validateConfig(base({ frontendUrl: "http://x", baseUrl: "http://y", trustProxy: false }));
  assert.equal(errors.length, 2);
  assert.ok(warnings.some((w) => w.includes("TRUST_PROXY")));
});

test("validation messages never contain secret values", () => {
  const secret = "my-placeholder-secret-value-that-is-long-enough-123";
  const { errors } = validateConfig(base({ jwt: { secret, refreshSecret: strong("b") } }));
  assert.ok(errors.length > 0);
  assert.ok(errors.every((e) => !e.includes(secret)));
});
