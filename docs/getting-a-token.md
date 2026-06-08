# Authenticating the Skylight MCP server

Skylight's web app authenticates with OAuth2 (`client_id=skylight-mobile`) against
`https://app.ourskylight.com`. The email/password endpoint (`/api/sessions`) is
version-gated and rejects logins (*"This version of Skylight is no longer
supported."*), so the server uses tokens captured from a logged-in web session.

There are two options, **best first**.

## ✅ Recommended: OAuth refresh token (self-renewing — set it once)

Access (Bearer) tokens expire after ~an hour, but the `skylight-mobile` client is
issued a **long-lived refresh token**. Give the server that, and it mints/renews
its own access tokens automatically — you (almost) never capture again:

```env
SKYLIGHT_REFRESH_TOKEN=<refresh token>
SKYLIGHT_FRAME_ID=<your_frame_id>
# optional: SKYLIGHT_OAUTH_CLIENT_ID=skylight-mobile  (default)
# optional: SKYLIGHT_TOKEN_CACHE=/path/token.json  (persists a rotated refresh token across restarts)
```

**Get the refresh token** — on `app.ourskylight.com`, open DevTools → **Console**:

```js
const all = { ...localStorage, ...sessionStorage };
const out = {};
for (const [k, v] of Object.entries(all))
  if (/token|auth|session|oauth/i.test(k) || /refresh_token|access_token/i.test(String(v))) out[k] = v;
console.log(out); try { copy(JSON.stringify(out, null, 2)); } catch {}
```

Look for a `refresh_token` value (usually in a JSON blob next to `access_token`)
and set it as `SKYLIGHT_REFRESH_TOKEN`.

> ⚠️ A refresh token is a **long-lived, powerful credential** (it can mint access
> tokens until revoked). Treat it like a password — keep it in env, never commit
> it. Signing out of that web session revokes it. If `SKYLIGHT_TOKEN_CACHE` is
> set, the server persists rotated refresh tokens there (mode `600`).

## Short-lived: capture a Bearer access token

If you'd rather not use a refresh token, grab a short-lived Bearer access token
and set it directly (you'll re-capture it whenever it expires):

```env
SKYLIGHT_TOKEN=<token>
SKYLIGHT_AUTH_TYPE=bearer
SKYLIGHT_FRAME_ID=<your_frame_id>
```

Grab it with any method below.

---

## Method 1 — DevTools console snippet (easiest)

1. Open <https://app.ourskylight.com> and make sure you're logged in.
2. Press **F12** → **Console** tab.
3. Paste this and press Enter:

   ```js
   (() => {
     const of = window.fetch, ox = XMLHttpRequest.prototype.setRequestHeader;
     const done = () => { window.fetch = of; XMLHttpRequest.prototype.setRequestHeader = ox; };
     const grab = (a) => {
       if (typeof a === 'string' && /^Bearer\s+/i.test(a)) {
         const t = a.replace(/^Bearer\s+/i, '').trim();
         try { copy(t); } catch {}
         console.log('%c✅ Token copied to clipboard:', 'color:green;font-weight:bold');
         console.log(t);
         done();
       }
     };
     window.fetch = function (i, init) {
       try { const h = init && init.headers; if (h) grab(h instanceof Headers ? h.get('Authorization') : (h.Authorization || h.authorization)); } catch {}
       return of.apply(this, arguments);
     };
     XMLHttpRequest.prototype.setRequestHeader = function (k, v) { if (/^authorization$/i.test(k)) grab(v); return ox.apply(this, arguments); };
     console.log('🔌 Hooked — now click around (open the calendar or chores) to capture the token…');
   })();
   ```

4. Click anything in the app (open the calendar or chores). The token prints in
   the console **and is copied to your clipboard** (`copy()` is a built-in
   DevTools helper).

## Method 2 — One-click bookmarklet (reusable)

Create a new bookmark and set its **URL** to the line below. Then, whenever
you're on `app.ourskylight.com`, click around once and click the bookmark — it
copies the token and shows it in a prompt:

```
javascript:(()=>{const ox=XMLHttpRequest.prototype.setRequestHeader;XMLHttpRequest.prototype.setRequestHeader=function(k,v){if(/^authorization$/i.test(k)&&/^Bearer/i.test(v)){const t=v.replace(/^Bearer\s+/i,'');XMLHttpRequest.prototype.setRequestHeader=ox;navigator.clipboard&&navigator.clipboard.writeText(t);prompt('Skylight token (copied):',t);}return ox.apply(this,arguments);};alert('Armed — now click around the app to capture the token.');})();
```

## Method 3 — Browser storage peek

In the **Console**, dump local/session storage and look for a long token-looking
value (often under a `token` / `auth` key):

```js
console.log({ local: { ...localStorage }, session: { ...sessionStorage } });
```

## Method 4 — Network capture (fallback): use `chrome://net-export`, **not** "Save as HAR"

If the console methods are blocked (e.g. by a strict CSP), capture the network
traffic to a file instead.

> ⚠️ **Use `chrome://net-export`, not a HAR export.** A HAR only contains what's
> sitting in the DevTools **Network** panel for the current tab at the moment you
> save it. The token-bearing request often happens during the SSO sign-in popup
> (a separate window that closes immediately) or before the panel starts
> recording, so by the time you save the HAR it's already gone.
> `chrome://net-export` logs **all** network activity — across popups and
> navigations — to a single file you can search afterward.

1. Open a new tab and go to **`chrome://net-export`**.
2. Click **Start Logging to Disk**, choose a file, and keep this tab open.
3. In another tab, go to <https://app.ourskylight.com>, log in, and open the
   calendar/chores so authenticated API calls are made.
4. Return to the `chrome://net-export` tab and click **Stop Logging**.
5. Open the saved `.json` log in a text editor and search for
   **`Authorization`** (or `Bearer`). The value after `Bearer ` is your token.
   You're looking for requests to `app.ourskylight.com/api/...`.

## Finding your Frame ID

While you're in there, your **Frame ID** is the number in the API URLs, e.g.
`https://app.ourskylight.com/api/frames/`**`4041937`**`/chores`. Use it for
`SKYLIGHT_FRAME_ID`.

---

**Security:** these snippets only read the header locally in your own browser —
nothing is sent anywhere. Treat the token like a password (it grants access to
your family's calendar/chores); don't paste it into shared chats or commit it.
