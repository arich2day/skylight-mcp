# Getting a Skylight Bearer token

The Skylight web app (`https://app.ourskylight.com`) authenticates each API
request with an `Authorization: Bearer <token>` header. You can grab that token
and use it directly with the MCP server:

```env
SKYLIGHT_TOKEN=<token>
SKYLIGHT_AUTH_TYPE=bearer
SKYLIGHT_FRAME_ID=<your_frame_id>
```

> **Why token auth?** The email/password login endpoint (`/api/sessions`) is
> version-gated for app clients and currently rejects logins with
> *"This version of Skylight is no longer supported."* The web app signs in via
> SSO and yields a Bearer token, so capturing that token is the reliable path.
>
> Tokens expire — when the server starts returning `401`s, grab a fresh one with
> any method below.

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
