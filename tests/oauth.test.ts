import { describe, it, expect, vi, afterEach } from "vitest";
import { refreshAccessToken, DEFAULT_OAUTH_CLIENT_ID } from "../src/api/oauth.js";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  })) as unknown as typeof fetch;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("refreshAccessToken", () => {
  it("posts the refresh_token grant and returns the new tokens", async () => {
    const fetchSpy = mockFetch(200, {
      access_token: "new-access",
      refresh_token: "rotated-refresh",
      expires_in: 3600,
      token_type: "Bearer",
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await refreshAccessToken("the-refresh-token");

    expect(result).toEqual({
      accessToken: "new-access",
      refreshToken: "rotated-refresh",
      expiresIn: 3600,
    });

    const [url, init] = (fetchSpy as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe("https://app.ourskylight.com/oauth/token");
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({
      grant_type: "refresh_token",
      refresh_token: "the-refresh-token",
      client_id: DEFAULT_OAUTH_CLIENT_ID,
    });
  });

  it("falls back to the sent refresh token when the response omits one", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { access_token: "a", expires_in: 100 }));
    const result = await refreshAccessToken("keep-me");
    expect(result.refreshToken).toBe("keep-me");
    expect(result.accessToken).toBe("a");
  });

  it("defaults expiresIn when not provided", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { access_token: "a" }));
    const result = await refreshAccessToken("rt");
    expect(result.expiresIn).toBe(7200);
  });

  it("throws a helpful error on invalid_grant", async () => {
    vi.stubGlobal("fetch", mockFetch(400, { error: "invalid_grant", error_description: "expired" }));
    await expect(refreshAccessToken("bad")).rejects.toThrow(/expired/);
  });

  it("throws when no access_token is returned", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { refresh_token: "x" }));
    await expect(refreshAccessToken("rt")).rejects.toThrow(/access_token/);
  });
});

describe("config refresh-token auth", () => {
  it("accepts a refresh token as a valid auth method", async () => {
    vi.resetModules();
    process.env.SKYLIGHT_REFRESH_TOKEN = "rt-123";
    process.env.SKYLIGHT_FRAME_ID = "4041937";
    delete process.env.SKYLIGHT_EMAIL;
    delete process.env.SKYLIGHT_PASSWORD;
    delete process.env.SKYLIGHT_TOKEN;

    const { loadConfig, usesRefreshAuth } = await import("../src/config.js");
    const cfg = loadConfig();
    expect(cfg.refreshToken).toBe("rt-123");
    expect(cfg.oauthClientId).toBe("skylight-mobile");
    expect(usesRefreshAuth(cfg)).toBe(true);

    delete process.env.SKYLIGHT_REFRESH_TOKEN;
  });
});
