import { readFileSync, writeFileSync } from "node:fs";

import { getConfig, usesEmailAuth, usesRefreshAuth, type Config } from "../config.js";
import { login } from "./auth.js";
import { refreshAccessToken } from "./oauth.js";
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  SkylightError,
} from "../utils/errors.js";

const BASE_URL = "https://app.ourskylight.com";

/**
 * Skylight subscription status types
 */
export type SubscriptionStatus = "plus" | "free" | "trial" | null;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string | boolean | number | undefined>;
  body?: unknown;
}

/**
 * Skylight API Client
 * Handles authentication and HTTP requests to the Skylight API
 */
export class SkylightClient {
  private config: Config;
  private resolvedToken: string | null = null;
  private resolvedUserId: string | null = null;
  private resolvedTokenExpiresAt = 0; // epoch ms; for refresh-token auth
  private currentRefreshToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private loginPromise: Promise<{ token: string; userId: string }> | null = null;
  private subscriptionStatus: SubscriptionStatus = null;

  constructor(config?: Config) {
    this.config = config ?? getConfig();
  }

  /**
   * Get the authentication credentials.
   * - Refresh-token auth: mint/renew a short-lived access token via OAuth.
   * - Email/password auth: log in.
   * - Manual token auth: use the configured token as-is.
   */
  private async getCredentials(): Promise<{ token: string; userId: string | null }> {
    // OAuth refresh-token auth (self-renewing)
    if (usesRefreshAuth(this.config)) {
      return { token: await this.getRefreshAuthToken(), userId: null };
    }

    // If we already have a resolved token, use it
    if (this.resolvedToken) {
      return { token: this.resolvedToken, userId: this.resolvedUserId };
    }

    // If using token-based auth, use the configured token
    if (!usesEmailAuth(this.config)) {
      return { token: this.config.token!, userId: null };
    }

    // If already logging in, wait for that to complete
    if (this.loginPromise) {
      const result = await this.loginPromise;
      return { token: result.token, userId: result.userId };
    }

    // Login with email/password
    this.loginPromise = this.performLogin();
    try {
      const result = await this.loginPromise;
      this.resolvedToken = result.token;
      this.resolvedUserId = result.userId;
      return result;
    } finally {
      this.loginPromise = null;
    }
  }

  /**
   * Return a valid OAuth access token, refreshing it if expired/missing.
   * Concurrent callers share a single in-flight refresh.
   */
  private async getRefreshAuthToken(): Promise<string> {
    if (this.resolvedToken && Date.now() < this.resolvedTokenExpiresAt) {
      return this.resolvedToken;
    }
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async performRefresh(): Promise<string> {
    const refreshToken =
      this.currentRefreshToken ?? this.loadCachedRefreshToken() ?? this.config.refreshToken!;
    console.error("Refreshing Skylight access token...");
    const result = await refreshAccessToken(refreshToken, this.config.oauthClientId);
    this.resolvedToken = result.accessToken;
    // Renew a minute early to avoid using a token that expires mid-request.
    this.resolvedTokenExpiresAt = Date.now() + result.expiresIn * 1000 - 60_000;
    this.currentRefreshToken = result.refreshToken;
    this.saveCachedRefreshToken(result.refreshToken);
    return result.accessToken;
  }

  /** Load a (possibly rotated) refresh token from the optional on-disk cache. */
  private loadCachedRefreshToken(): string | null {
    const path = this.config.tokenCachePath;
    if (!path) return null;
    try {
      return (JSON.parse(readFileSync(path, "utf8")).refresh_token as string) ?? null;
    } catch {
      return null;
    }
  }

  /** Persist a rotated refresh token so it survives restarts (if a cache path is set). */
  private saveCachedRefreshToken(refreshToken: string): void {
    const path = this.config.tokenCachePath;
    if (!path) return;
    try {
      writeFileSync(path, JSON.stringify({ refresh_token: refreshToken }), { mode: 0o600 });
    } catch (e) {
      console.error(`[client] could not write token cache: ${e instanceof Error ? e.message : e}`);
    }
  }

  /**
   * Perform login and return token and userId
   */
  private async performLogin(): Promise<{ token: string; userId: string }> {
    const { email, password } = this.config;
    if (!email || !password) {
      throw new AuthenticationError("Email and password are required for login");
    }

    console.error("Logging in to Skylight...");
    const result = await login(email, password);
    this.subscriptionStatus = result.subscriptionStatus as SubscriptionStatus;
    console.error(`Logged in as ${result.email} (${result.subscriptionStatus})`);
    return { token: result.token, userId: result.userId };
  }

  /**
   * Build the Authorization header
   * For email/password auth: Basic base64(userId:token)
   * For manual token auth: Bearer or Basic based on config
   */
  private async getAuthHeader(): Promise<string> {
    const { token, userId } = await this.getCredentials();

    // If using email/password auth, use Basic auth with userId:token
    if (usesEmailAuth(this.config) && userId) {
      const credentials = Buffer.from(`${userId}:${token}`).toString("base64");
      return `Basic ${credentials}`;
    }

    // For manual token config, respect the authType setting
    if (this.config.authType === "basic") {
      return `Basic ${token}`;
    }
    return `Bearer ${token}`;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | boolean | number | undefined>): string {
    const url = new URL(endpoint, BASE_URL);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Handle API response errors
   */
  private async handleResponseError(response: Response, url: string): Promise<never> {
    const status = response.status;

    if (status === 401) {
      // Clear cached credentials on auth failure
      this.resolvedToken = null;
      this.resolvedUserId = null;
      console.error(`[client] 401 Unauthorized for ${url}`);

      if (usesEmailAuth(this.config)) {
        throw new AuthenticationError(
          "API request returned 401. This may indicate your frame ID is incorrect or doesn't belong to this account. " +
            "Please verify your SKYLIGHT_FRAME_ID environment variable."
        );
      }
      throw new AuthenticationError();
    }

    if (status === 404) {
      throw new NotFoundError("Resource");
    }

    if (status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new RateLimitError(retryAfter ? parseInt(retryAfter, 10) : undefined);
    }

    // Try to get error details from response
    let errorMessage = `HTTP ${status}`;
    try {
      const errorBody = await response.text();
      if (errorBody) {
        errorMessage += `: ${errorBody.slice(0, 200)}`;
      }
    } catch {
      // Ignore parse errors
    }

    throw new SkylightError(errorMessage, "HTTP_ERROR", status, status >= 500);
  }

  /**
   * Make an authenticated request to the Skylight API
   */
  async request<T>(endpoint: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
    const { method = "GET", params, body } = options;

    // Replace {frameId} placeholder with actual frame ID
    const resolvedEndpoint = endpoint.replace("{frameId}", this.config.frameId);
    const url = this.buildUrl(resolvedEndpoint, params);

    console.error(`[client] ${method} ${url}`);

    const headers: Record<string, string> = {
      Authorization: await this.getAuthHeader(),
      Accept: "application/json",
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.error(`[client] Response: ${response.status}`);

    if (!response.ok) {
      // For email/password or refresh-token auth, re-authenticate once on 401.
      if (
        response.status === 401 &&
        (usesEmailAuth(this.config) || usesRefreshAuth(this.config)) &&
        !isRetry
      ) {
        console.error("[client] Got 401, re-authenticating...");
        this.resolvedToken = null;
        this.resolvedUserId = null;
        this.resolvedTokenExpiresAt = 0;
        return this.request<T>(endpoint, options, true);
      }
      await this.handleResponseError(response, url);
    }

    // Handle 304 Not Modified and empty bodies (e.g. 204, some DELETEs)
    if (response.status === 304 || response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }

  /**
   * GET request helper
   */
  async get<T>(endpoint: string, params?: Record<string, string | boolean | number | undefined>): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", params });
  }

  /**
   * POST request helper
   */
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: "POST", body });
  }

  /**
   * Get the frame ID from config
   */
  get frameId(): string {
    return this.config.frameId;
  }

  /**
   * Get the timezone from config
   */
  get timezone(): string {
    return this.config.timezone;
  }

  /**
   * Check if user has Plus subscription
   */
  hasPlus(): boolean {
    return this.subscriptionStatus === "plus";
  }

  /**
   * Get the subscription status
   */
  getSubscriptionStatus(): SubscriptionStatus {
    return this.subscriptionStatus;
  }

  /**
   * Detect subscription status from /api/user.
   * Used for token-based auth, where there is no login response to read it from.
   */
  private async detectSubscriptionStatus(): Promise<void> {
    try {
      const user = await this.get<{
        data: { attributes: { subscription_status: string } };
      }>("/api/user");
      this.subscriptionStatus =
        (user?.data?.attributes?.subscription_status as SubscriptionStatus) ?? null;
      console.error(`Subscription status (token auth): ${this.subscriptionStatus}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[client] Could not determine subscription status from /api/user: ${message}`);
    }
  }

  /**
   * Initialize the client (triggers login if using email/password auth)
   */
  async initialize(): Promise<void> {
    await this.getCredentials();

    // Email/password login already populates subscriptionStatus. For token-based
    // auth there is no login response, so fetch it from /api/user to ensure
    // Plus-only tools register correctly.
    if (!usesEmailAuth(this.config) && this.subscriptionStatus === null) {
      await this.detectSubscriptionStatus();
    }
  }
}

// Singleton instance
let clientInstance: SkylightClient | null = null;

export function getClient(): SkylightClient {
  if (!clientInstance) {
    clientInstance = new SkylightClient();
  }
  return clientInstance;
}

/**
 * Initialize the client singleton and return it
 * This triggers login if using email/password auth
 */
export async function initializeClient(): Promise<SkylightClient> {
  const client = getClient();
  await client.initialize();
  return client;
}
