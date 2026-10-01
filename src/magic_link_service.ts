import { z } from "zod";
import { InfraiClient, infrai, InfraiError } from "./infrai_client.js";

export const magicLinkRequest = z.object({ email: z.string().email(), name: z.string().min(1), captchaToken: z.string().min(1), requestId: z.string().min(1) });
export type MagicLinkRequest = z.infer<typeof magicLinkRequest>;

export async function requestMagicLink(input: unknown, client = new InfraiClient()): Promise<{ sessionId: string; status: "sent" }> {
  const request = magicLinkRequest.parse(input);
  try {
    const captcha = await infrai.captcha.verify(client, request.requestId, request.captchaToken, "magic_link");
    if (!captcha.verified) throw new InfraiError("CAPTCHA_REJECTED", captcha, 422);
    const user = await client.createUser(request.email, request.name, request.requestId);
    const session = await client.createSession(user.id, request.requestId);
    return { sessionId: session.id, status: "sent" };
  } catch (error) {
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) throw error;
    throw error;
  }
}
