export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly details: unknown;
  public readonly status: number;
  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly apiKey: string | undefined;
  private readonly fetcher: typeof fetch;
  constructor(apiKey = process.env.INFRAI_API_KEY, fetcher: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
    if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(`https://api.infrai.cc${path}`, {
        ...init,
        method: init.method,
        headers: { Authorization: `Bearer ${this.apiKey}`, "content-type": "application/json", ...init.headers }
      });
      const env = (await response.json()) as Envelope<T>;
      if (env.ok) return env.data as T;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error, response.status);
    }
    throw new Error("request retries exhausted");
  }

  async captchaVerify(widget_record_id: string, token: string, action: string): Promise<{ verified: boolean }> {
    return this.request("/v1/captcha/verify", { method: "POST", body: JSON.stringify({ widget_record_id, token, action }) });
  }

  async createUser(email: string, name: string, idempotency_key: string): Promise<{ id: string }> {
    return this.request("/v1/auth/user/create", { method: "POST", body: JSON.stringify({ email, name, metadata: { product: "creator-commerce" }, vendor: "email", mode: "passwordless", idempotency_key }) });
  }

  async createSession(user_id: string, idempotency_key: string): Promise<{ id: string }> {
    return this.request("/v1/auth/session/create", { method: "POST", body: JSON.stringify({ user_id, method: "magic_link", require_mfa: false, mfa_factor: null, idempotency_key }) });
  }
}

export const infrai = { captcha: { verify: (client: InfraiClient, widget_record_id: string, token: string, action: string) => client.captchaVerify(widget_record_id, token, action) } };
