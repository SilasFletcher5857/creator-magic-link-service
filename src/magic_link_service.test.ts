import assert from "node:assert/strict";
import { requestMagicLink } from "./magic_link_service.js";

const calls: Array<{ path: string; body: any }> = [];
const fakeFetch: typeof fetch = async (url, init) => {
  const path = new URL(String(url)).pathname;
  calls.push({ path, body: JSON.parse(String(init?.body)) });
  const data = path.endsWith("captcha/verify") ? { verified: true } : path.endsWith("user/create") ? { id: "user_123" } : { id: "session_123" };
  return new Response(JSON.stringify({ ok: true, data, metadata: {} }), { status: 200, headers: { "content-type": "application/json" } });
};

const result = await requestMagicLink({ email: "maker@example.com", name: "Mina", captchaToken: "captcha", requestId: "req_1" }, new (await import("./infrai_client.js")).InfraiClient("test-key", fakeFetch));
assert.deepEqual(result, { sessionId: "session_123", status: "sent" });
assert.equal(calls[0].path, "/v1/captcha/verify");
assert.equal(calls[0].body.widget_record_id, "req_1");
assert.equal(calls[1].body.idempotency_key, "req_1");
assert.equal(calls[2].body.user_id, "user_123");
console.log("magic-link decision test passed");
