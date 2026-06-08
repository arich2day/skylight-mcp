import { z } from "zod";

// Config schema supports two auth methods:
// 1. Email/password (preferred) - will login and get token automatically
// 2. Token-based (legacy) - for manual token capture
const ConfigSchema = z
  .object({
    // Email/password auth (preferred)
    email: z.string().email().optional(),
    password: z.string().min(1).optional(),

    // Token-based auth (legacy)
    token: z.string().min(1).optional(),
    authType: z.enum(["bearer", "basic"]).default("bearer"),

    // OAuth refresh-token auth (recommended): the server mints/renews its own
    // short-lived access tokens from a long-lived refresh token.
    refreshToken: z.string().min(1).optional(),
    oauthClientId: z.string().default("skylight-mobile"),
    tokenCachePath: z.string().optional(),

    // Required
    frameId: z.string().min(1, "SKYLIGHT_FRAME_ID is required"),

    // Optional
    timezone: z.string().default("America/New_York"),
  })
  .refine(
    (data) => {
      // Must have one of: refresh token, email+password, or a manual token.
      const hasEmailAuth = data.email && data.password;
      const hasTokenAuth = !!data.token;
      const hasRefreshAuth = !!data.refreshToken;
      return hasEmailAuth || hasTokenAuth || hasRefreshAuth;
    },
    {
      message:
        "Provide one auth method: SKYLIGHT_REFRESH_TOKEN, or SKYLIGHT_EMAIL and SKYLIGHT_PASSWORD, or SKYLIGHT_TOKEN",
    }
  );

export type Config = z.infer<typeof ConfigSchema>;

export interface ResolvedConfig {
  token: string;
  frameId: string;
  timezone: string;
  authType: "bearer" | "basic";
}

export function loadConfig(): Config {
  const result = ConfigSchema.safeParse({
    email: process.env.SKYLIGHT_EMAIL,
    password: process.env.SKYLIGHT_PASSWORD,
    token: process.env.SKYLIGHT_TOKEN,
    refreshToken: process.env.SKYLIGHT_REFRESH_TOKEN,
    oauthClientId: process.env.SKYLIGHT_OAUTH_CLIENT_ID || "skylight-mobile",
    tokenCachePath: process.env.SKYLIGHT_TOKEN_CACHE,
    frameId: process.env.SKYLIGHT_FRAME_ID,
    authType: process.env.SKYLIGHT_AUTH_TYPE || "bearer",
    timezone: process.env.SKYLIGHT_TIMEZONE || "America/New_York",
  });

  if (!result.success) {
    const errors = result.error.errors.map((e) => `  - ${e.message}`).join("\n");
    console.error(`
Skylight MCP Server - Configuration Error

Missing or invalid configuration:
${errors}

Authentication (choose one):
  Option 1 - OAuth Refresh Token (recommended; self-renewing):
    SKYLIGHT_REFRESH_TOKEN - Long-lived OAuth refresh token (server mints access tokens itself)
    SKYLIGHT_OAUTH_CLIENT_ID - OAuth client id (default: skylight-mobile)
    See docs/getting-a-token.md.

  Option 2 - Manual Token (short-lived):
    SKYLIGHT_TOKEN    - A captured Bearer access token
    SKYLIGHT_AUTH_TYPE - 'bearer' or 'basic' (default: bearer)

  Option 3 - Email/Password (currently blocked by Skylight's version gate):
    SKYLIGHT_EMAIL    - Your Skylight account email
    SKYLIGHT_PASSWORD - Your Skylight account password

Required:
  SKYLIGHT_FRAME_ID - Your frame/household ID

Optional:
  SKYLIGHT_TIMEZONE - Timezone for dates (default: America/New_York)

To find your frame ID:
1. Log in to the Skylight app
2. Use a proxy tool to capture API traffic
3. Look for the frame ID in URLs like /api/frames/{frameId}/chores
`);
    process.exit(1);
  }

  return result.data;
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Check if config uses email/password auth
 */
export function usesEmailAuth(config: Config): boolean {
  return !!(config.email && config.password);
}

/**
 * Check if config uses OAuth refresh-token auth (self-renewing access tokens).
 */
export function usesRefreshAuth(config: Config): boolean {
  return !!config.refreshToken;
}
