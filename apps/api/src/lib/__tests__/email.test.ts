import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({
  NODE_ENV: "production",
  RESEND_API_KEY: "synthetic-provider-key",
  EMAIL_FROM: "Worthlane <support@worthlane.app>",
}));
vi.mock("../env", () => ({ env: config }));
import { sendPasswordResetEmail } from "../email";

const recipient = "synthetic-recipient@example.test";
const code = "SYNTH234";
const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(config, {
    NODE_ENV: "production", RESEND_API_KEY: "synthetic-provider-key",
    EMAIL_FROM: "Worthlane <support@worthlane.app>",
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("transactional email privacy and delivery", () => {
  it("sends the reset code only in the intended provider payload", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await sendPasswordResetEmail(recipient, code);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(options.body);
    expect(body.to).toEqual([recipient]);
    expect(body.from).toBe(config.EMAIL_FROM);
    expect(body.text).toContain(code);
    expect(body.html).toContain(code);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects missing production credentials and sender before any request", async () => {
    config.RESEND_API_KEY = "";
    await expect(sendPasswordResetEmail(recipient, code)).rejects.toThrow("RESEND_API_KEY");
    config.RESEND_API_KEY = "synthetic-provider-key";
    config.EMAIL_FROM = " ";
    await expect(sendPasswordResetEmail(recipient, code)).rejects.toThrow("EMAIL_FROM");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not read or expose private provider rejection details", async () => {
    const readBody = vi.fn().mockResolvedValue(`${recipient} ${code} synthetic-provider-key`);
    fetchMock.mockResolvedValue({ ok: false, status: 422, text: readBody });
    await expect(sendPasswordResetEmail(recipient, code))
      .rejects.toThrow("Email provider rejected delivery (422).");
    expect(readBody).not.toHaveBeenCalled();
  });

  it("replaces transport exception details with a generic failure", async () => {
    fetchMock.mockRejectedValue(new Error(`${recipient} ${code} synthetic-provider-key`));
    await expect(sendPasswordResetEmail(recipient, code))
      .rejects.toThrow(/^Email delivery failed or timed out\.$/);
  });

  it("aborts pending delivery using the bounded timeout signal", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const controller = new AbortController();
    timeout.mockReturnValue(controller.signal);
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("private transport error")));
    }));
    const result = sendPasswordResetEmail(recipient, code);
    controller.abort();
    await expect(result).rejects.toThrow("Email delivery failed or timed out.");
    expect(timeout).toHaveBeenCalledWith(10_000);
  });

  it("never logs the recipient or reset code when development delivery is skipped", async () => {
    config.NODE_ENV = "development";
    config.RESEND_API_KEY = "";
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendPasswordResetEmail(recipient, code);
    expect(log).toHaveBeenCalledWith("[DEV email] Delivery skipped: email provider is not configured.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
