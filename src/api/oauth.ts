/**
 * Skylight OAuth2 token refresh.
 *
 * The Skylight web/mobile app authenticates via an OAuth2 Authorization Code (+PKCE)
 * flow against app.ourskylight.com. Access (Bearer) tokens are short-lived, but the
 * `skylight-mobile` client is issued a long-lived refresh token that can mint new
 * access tokens with no interactive login:
 *
 *   POST /oauth/token { grant_type: "refresh_token", refresh_token, client_id }
 *
 * This lets the server keep itself authenticated from a single captured refresh token.
 */
const BASE_URL = "https://app.ourskylight.com";

export const DEFAULT_OAUTH_CLIENT_ID = "skylight-mobile";

export interface RefreshResult {
  accessToken: string;
  /** May be a rotated value; callers should persist it for the next refresh. */
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
}

/**
 * Exchange a refresh token for a fresh access token via the OAuth2 token endpoint.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string = DEFAULT_OAUTH_CLIENT_ID
): Promise<RefreshResult> {
  const response = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      detail = parsed.error_description || parsed.error || text;
    } catch {
      // keep raw text
    }
    throw new Error(
      `OAuth token refresh failed (HTTP ${response.status}): ${detail}. ` +
        `Your SKYLIGHT_REFRESH_TOKEN may be expired or revoked — capture a new one.`
    );
  }

  let data: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("OAuth token refresh returned a non-JSON response");
  }

  if (!data.access_token) {
    throw new Error("OAuth token refresh response did not include an access_token");
  }

  return {
    accessToken: data.access_token,
    // Refresh tokens may rotate; fall back to the one we sent if not returned.
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: Number(data.expires_in) || 7200,
  };
}
