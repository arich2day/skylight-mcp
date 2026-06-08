/**
 * Skylight Authentication
 * Handles login via email/password to obtain API token
 */

const BASE_URL = "https://app.ourskylight.com";

export interface LoginResponse {
  data: {
    id: string;
    type: "authenticated_user";
    attributes: {
      email: string;
      token: string;
      subscription_status: string;
    };
  };
  meta?: {
    password_reset?: boolean;
  };
}

export interface AuthResult {
  userId: string;
  email: string;
  token: string;
  subscriptionStatus: string;
}

/**
 * Login to Skylight with email and password
 * Returns the authentication token and user info
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  console.error(`[auth] Attempting login for ${email}...`);

  const response = await fetch(`${BASE_URL}/api/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  console.error(`[auth] Login response status: ${response.status}`);

  if (!response.ok) {
    let errorBody = "";
    let serverMessage = "";
    try {
      errorBody = await response.text();
      console.error(`[auth] Login error response: ${errorBody}`);
      const parsed = JSON.parse(errorBody);
      // Skylight returns { "errors": ["..."] }
      if (Array.isArray(parsed?.errors)) serverMessage = parsed.errors.join("; ");
    } catch {
      // non-JSON body; fall back to raw text
      serverMessage = errorBody;
    }

    // The email/password endpoint is version-gated for app clients. Surface the
    // real reason instead of a misleading "wrong password", and point at the
    // token-based auth that does work.
    if (/no longer supported|update to the latest/i.test(serverMessage)) {
      throw new Error(
        `Skylight rejected the email/password login: "${serverMessage}". ` +
          `This endpoint is version-gated and cannot be used directly. ` +
          `Use token auth instead: set SKYLIGHT_TOKEN (a Bearer session token captured from app.ourskylight.com) ` +
          `with SKYLIGHT_AUTH_TYPE=bearer, and unset SKYLIGHT_EMAIL/SKYLIGHT_PASSWORD.`
      );
    }

    if (response.status === 401) {
      throw new Error(
        `Invalid email or password${serverMessage ? ` (${serverMessage})` : ""}. ` +
          `Please check your SKYLIGHT_EMAIL and SKYLIGHT_PASSWORD environment variables.`
      );
    }

    throw new Error(`Login failed: HTTP ${response.status}${serverMessage ? ` - ${serverMessage}` : ""}`);
  }

  const data = (await response.json()) as LoginResponse;

  console.error(`[auth] Login successful, token prefix: ${data.data.attributes.token.substring(0, 10)}...`);

  return {
    userId: data.data.id,
    email: data.data.attributes.email,
    token: data.data.attributes.token,
    subscriptionStatus: data.data.attributes.subscription_status,
  };
}

// Cache for auth result
let cachedAuth: AuthResult | null = null;

/**
 * Get cached auth result or login if needed
 */
export async function getAuth(email: string, password: string): Promise<AuthResult> {
  if (cachedAuth) {
    return cachedAuth;
  }

  cachedAuth = await login(email, password);
  return cachedAuth;
}

/**
 * Clear cached auth (for re-login)
 */
export function clearAuthCache(): void {
  cachedAuth = null;
}
