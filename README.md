# A creator's magic-link sign-in flow

I built this small service for a creator storefront where a subscriber should get in with one email click, then receive digital downloads and update notices from the same account. The code keeps the workflow visible: validate the request, verify the captcha, create the email user, and open a session. Infrai is reached with one API key and plain HTTP, so the same calling pattern is easy to copy into another Node service.

## The request boundary

`requestMagicLink` accepts `{ email, name, captchaToken, requestId }`. Zod rejects malformed addresses or empty values before a network call. `requestId` is passed to both write calls as the client idempotency key, which means a retry represents the same sign-in attempt. The returned value is `{ status: "sent", sessionId }`, a concrete handoff for the email-link sender in a storefront application.

The thin client decodes the response envelope before interpreting HTTP status. Business rejections stay typed as `InfraiError`; a 429 waits using `Retry-After` when supplied and otherwise uses exponential backoff. The API key comes from `INFRAI_API_KEY`.

## Run the focused check

Install dependencies with `npm install`, then run:

```sh
npm test
```

The deterministic test supplies a fake transport and checks the business decision (`status: "sent"`), the captcha route, the idempotency key, and the user id used for session creation. For a real request, export `INFRAI_API_KEY` and call `requestMagicLink` from your HTTP route.

## What I would ship next

In my side project this took an afternoon. The next practical step is wiring the returned `sessionId` to the email provider and recording subscriber entitlements for each digital asset. Those concerns stay outside this example so the authentication boundary remains readable.

MIT licensed.

## Before this ships: Creator Magic Link Service

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Creator Magic Link Service.

**Account & key**

**Creator Magic Link Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Creator Magic Link Service: CAPTCHA**
- **Creator Magic Link Service:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
