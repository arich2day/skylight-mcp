# 🌟 Skylight MCP Server (v2.0.0)

> A unified Model Context Protocol (MCP) server connecting **Skylight Smart Calendar & Digital Photo Frames** to any AI agent or assistant — including **Gemini Spark, Google Gemini / Gemini CLI, Antigravity, Claude Desktop, Claude Code, Cursor, Windsurf, Cline, Roo Code, ChatGPT Desktop / Codex, Goose, Continue.dev**, and custom agents.

---

## 📑 Table of Contents
1. [What This Server Does](#what-this-server-does)
2. [What's New in v2.0.0](#whats-new-in-v200)
3. [Step 1: How to Get Your Skylight Token](#step-1-how-to-get-your-skylight-token)
   - [Method A: 1-Click Bookmarklet (Phones, iPads & Desktop)](#method-a-1-click-bookmarklet-recommended-for-phones-ipads--desktop)
   - [Method B: Chrome Extension (Desktop)](#method-b-chrome-extension-desktop-chrome--edge--brave)
4. [Step 2: How to Add the MCP Server to Your AI Tools](#step-2-how-to-add-the-mcp-server-to-your-ai-tools)
   - [1. Gemini Spark (Always-On AI Agent)](#1-gemini-spark-always-on-ai-agent)
   - [2. Google Gemini / Gemini CLI](#2-google-gemini--gemini-cli)
   - [3. Antigravity](#3-antigravity)
   - [4. Claude Desktop](#4-claude-desktop-macos--windows)
   - [5. Claude Code (CLI)](#5-claude-code-cli)
   - [6. Cursor](#6-cursor)
   - [7. Windsurf](#7-windsurf)
   - [8. Cline (VS Code Extension)](#8-cline-vs-code-extension)
   - [9. Roo Code (VS Code Extension)](#9-roo-code-vs-code-extension)
   - [10. Continue.dev](#10-continuedev)
   - [11. Goose CLI](#11-goose-cli)
   - [12. ChatGPT Desktop / OpenAI Codex](#12-chatgpt-desktop--openai-codex)
5. [Cloud Deployment Guide (Host on Render for 24/7 Remote SSE)](#cloud-deployment-guide-render)
6. [How to Use & Example Prompts for Your AI Agent](#how-to-use--example-prompts-for-your-ai-agent)
7. [Full MCP Tools Reference (13 Tools)](#full-mcp-tools-reference-13-tools)
8. [Troubleshooting & FAQ](#troubleshooting--faq)
9. [How to Update This Repo on an iPad](#how-to-update-this-repo-on-an-ipad)

---

## What This Server Does

This server gives your AI assistants full control to manage your household's Skylight devices:
* 📅 **Calendar Events**: View today's schedule, create events, resolve conflicts, and delete entries.
* 🏷️ **Categories & Profiles**: Organize events by family member, color code, or linked external calendars.
* 🧹 **Chores & Checklists**: Track household task assignments and toggle completion states.
* 🛒 **Lists & Groceries**: View and add items to shared shopping, grocery, and to-do lists.
* 🍲 **Meal Planning**: Retrieve planned family dinners and recipe links.
* 🎁 **Rewards**: Track chore points earned and reward redemption options.
* 👑 **Plus Subscription**: Verify active Skylight Plus features and expiration status.
* 🖼️ **Frames & Devices**: Inspect active frames, screen settings, and device IDs.

---

## What's New in v2.0.0

* **Direct Token Authentication**: Replaced legacy email/password authentication (which is version-gated by Skylight with 401 errors) with OAuth token authentication (`SKYLIGHT_TOKEN`).
* **Expanded API Endpoints**:
  * Added `check_plus_subscription` for subscription and entitlement checks.
  * Added `list_lists` and `add_list_item` for grocery and shopping lists.
  * Added `list_meals` for scheduled family dinners.
  * Added `list_rewards` for chore point balances.
* **Universal Token Extraction Helpers**:
  * **Chrome Extension (`/extension`)**: Adds a 1-click floating button on `app.ourskylight.com` to capture and copy your persistent refresh token.
  * **1-Click Bookmarklet (`/tools/bookmarklet.js`)**: A zero-install script compatible with all desktop and mobile browsers (including iPad/iPhone Safari and Chrome).
* **Flexible Hosting**: Works locally via `stdio` or remotely via `SSE` (e.g., Render, Railway) with Supergateway.

---

## Step 1: How to Get Your Skylight Token

Choose the method that is most convenient for you or your family members.

---

### Method A: 1-Click Bookmarklet (Recommended for Phones, iPads & Desktop)

*Zero installation required. Works on Safari, Chrome, Edge, and Firefox on iOS, iPadOS, Android, Mac, and Windows.*

#### Initial Setup (Takes 30 seconds):
1. In your browser, bookmark any webpage and name it:  
   `🔑 Get Skylight Token`
2. Open your bookmarks manager / edit the bookmark:
   * **iOS / iPadOS Safari**: Tap the **Bookmarks** icon (book) -> Tap **Edit** -> Tap `🔑 Get Skylight Token`.
   * **Desktop Chrome / Safari / Edge**: Right-click the bookmark -> Select **Edit...**.
3. Clear the **URL** field completely and paste this exact script:

```javascript
javascript:(function(){function searchDeep(obj,depth=0){if(depth>5||!obj)return null;if(typeof obj==='string'){if(obj.length>20&&!obj.includes(' ')&&!obj.startsWith('http'))return obj;return null;}if(typeof obj==='object'){const priorityKeys=['refreshToken','refresh_token','token','accessToken','access_token','jwt','sessionToken','idToken','authToken'];for(const key of priorityKeys){if(obj[key]&&typeof obj[key]==='string')return obj[key];}for(const k in obj){if(Object.prototype.hasOwnProperty.call(obj,k)){const res=searchDeep(obj[k],depth+1);if(res)return res;}}}return null;}let token=null;for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);const val=localStorage.getItem(key);try{const parsed=JSON.parse(val);token=searchDeep(parsed);if(token)break;}catch(e){if(val&&val.length>20&&!val.includes(' ')){token=val;break;}}}if(token){navigator.clipboard.writeText(token).then(()=>{alert("✅ Skylight Token copied to clipboard!\n\nYou can now paste it into your AI agent or environment config.");}).catch(()=>{prompt("Copy your Skylight Token below:",token);});}else{alert("⚠️ Could not find token. Make sure you are logged into app.ourskylight.com first!");}})();
```
4. Save the bookmark.

#### How to Use:
1. Open [app.ourskylight.com](https://app.ourskylight.com) in your browser and log in.
2. While on the Skylight page:
   * **On Mobile / iPad**: Tap the address bar, type `🔑 Get Skylight Token`, and tap the bookmark result.
   * **On Desktop**: Click `🔑 Get Skylight Token` directly on your bookmarks bar.
3. An alert will confirm the token has been copied to your clipboard!
4. **Close the tab.** *(Do NOT click "Log Out", as logging out revokes the token on Skylight's server).*

---

### Method B: Chrome Extension (Desktop Chrome / Edge / Brave)

*Adds a floating button right on the Skylight website that copies your token with one click.*

#### Initial Setup:
1. Download or clone this repository.
2. In your browser, navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** (top-left) and select the `extension/` folder in this repository.

#### How to Use:
1. Open [app.ourskylight.com](https://app.ourskylight.com) and log in.
2. A blue floating button labeled **"🔑 Copy Skylight Token for AI Agents"** will automatically appear in the bottom-right corner of the page.
3. Click it to copy the token to your clipboard.
4. Close the tab when finished.

---

## Step 2: How to Add the MCP Server to Your AI Tools

You can connect your AI agent in two ways:
* **Remote SSE Connection (Recommended)**: Connects to your hosted cloud server (e.g., on Render) via a URL. No local Node.js required.
* **Local stdio Connection**: Runs the server locally on your computer via Node.js.

---

### 1. Gemini Spark (Always-On AI Agent)

[Gemini Spark](https://gemini.google.com) is Google's proactive, 24/7 autonomous cloud agent. Because Gemini Spark runs persistently in Google Cloud, it can monitor your Skylight calendar, run automated morning briefings, and track chores in the background without needing your local computer on.

Gemini Spark connects directly to your hosted Skylight MCP server over HTTPS via **Connected Apps**.

#### Requirements:
* Deploy your Skylight MCP server to the cloud (e.g., [Render](#cloud-deployment-guide-render), Railway, or Cloud Run) with your `SKYLIGHT_TOKEN`.
* Personal Google Account with Gemini Spark access (under a Google AI subscription).
* Ensure "Keep Activity" is turned on in your Gemini settings.

#### Setup Steps:
1. Open [gemini.google.com](https://gemini.google.com) in your browser.
2. In the navigation sidebar or profile menu, go to **Settings & help** (⚙️) -> **Connected Apps**.
3. Scroll down to the **"Custom apps for Spark"** section and click **"Add a custom app"**.
4. In the URL prompt, enter your hosted MCP server endpoint:
   ```text
   https://your-service-name.onrender.com/sse
   ```
5. Name the app (e.g., `Skylight Calendar`) and confirm the tool permissions.
6. Click **Connect**. Gemini Spark will verify the server and register all 13 tools (events, chores, lists, meals, rewards).

#### Proactive Task Examples:
* *"Every morning at 7:00 AM, check our Skylight calendar and chores for today, and send me a daily briefing."*
* *"Proactively monitor for any scheduling conflicts between family members on our Skylight calendar."*
* *"When dinner recipes are added to Skylight meals, check if all ingredients are on our Skylight grocery list."*

---

### 2. Google Gemini / Gemini CLI

For developers using the official **Gemini CLI** or Gemini developer tools:

#### Local stdio Mode:
Add the server definition to your global Gemini settings (`~/.gemini/settings.json`) or your project settings (`.gemini/settings.json`):

```json
{
  "mcpServers": {
    "skylight": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/skylight-mcp/dist/index.js"],
      "env": {
        "SKYLIGHT_TOKEN": "YOUR_COPIED_TOKEN_HERE",
        "SKYLIGHT_AUTH_TYPE": "bearer"
      }
    }
  }
}
```

#### Remote SSE Mode (via mcp-proxy):
If connecting to your hosted remote instance:

```json
{
  "mcpServers": {
    "skylight": {
      "command": "npx",
      "args": ["-y", "mcp-proxy", "https://your-service-name.onrender.com/sse"]
    }
  }
}
```

#### Verify Tools in Gemini CLI:
Start your Gemini CLI session and run:
```bash
/mcp
```
This lists all active MCP servers and confirms the 13 Skylight tools (`list_events`, `create_event`, `list_chores`, `list_lists`, etc.) are ready.

---

### 3. Antigravity

#### Remote SSE Mode (Recommended):
1. Open Antigravity -> Go to **Settings** -> **MCP Servers** (or **Integrations**).
2. Click **Add New Server** -> Select **SSE / Remote URL**.
3. Set the **Server URL** to:
   ```text
   [https://your-service-name.onrender.com/sse](https://your-service-name.onrender.com/sse)
   ```
4. Click **Save** and test the connection.

#### Local stdio Mode:
* **Transport**: `stdio`
* **Command**: `node /absolute/path/to/skylight-mcp/dist/index.js`
* **Environment Variables**:
  * `SKYLIGHT_TOKEN`: `<YOUR_COPIED_TOKEN>`
  * `SKYLIGHT_AUTH_TYPE`: `bearer`

---

### 4. Claude Desktop (macOS & Windows)

Edit your configuration file:
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### Local stdio Configuration:
```json
{
  "mcpServers": {
    "skylight": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/skylight-mcp/dist/index.js"],
      "env": {
        "SKYLIGHT_TOKEN": "YOUR_COPIED_TOKEN_HERE",
        "SKYLIGHT_AUTH_TYPE": "bearer"
      }
    }
  }
}
```

#### Remote SSE Configuration (via mcp-proxy):
```json
{
  "mcpServers": {
    "skylight": {
      "command": "npx",
      "args": ["-y", "mcp-proxy", "https://your-service-name.onrender.com/sse"]
    }
  }
}
```

---

### 5. Claude Code (CLI)

Run the following command in your terminal:

```bash
claude mcp add skylight node /ABSOLUTE/PATH/TO/skylight-mcp/dist/index.js -e SKYLIGHT_TOKEN="YOUR_COPIED_TOKEN_HERE" -e SKYLIGHT_AUTH_TYPE="bearer"
```

Or for remote SSE:
```bash
claude mcp add skylight npx -y mcp-proxy https://your-service-name.onrender.com/sse
```

---

### 6. Cursor

1. In Cursor, open **Settings** -> **Features** -> **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in the fields:
   * **Name**: `skylight`
   * **Type**: `command` (or `sse` if using remote URL)
   * **Command**: `node /ABSOLUTE/PATH/TO/skylight-mcp/dist/index.js`
4. Add your environment variables in Cursor's JSON config:
```json
{
  "mcpServers": {
    "skylight": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/skylight-mcp/dist/index.js"],
      "env": {
        "SKYLIGHT_TOKEN": "YOUR_COPIED_TOKEN_HERE",
        "SKYLIGHT_AUTH_TYPE": "bearer"
      }
    }
  }
}
```

---

### 7. Windsurf

1. Open Windsurf -> Go to **Settings** -> **Cascade** -> **MCP Servers**.
2. Or edit `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "skylight": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/skylight-mcp/dist/index.js"],
      "env": {
        "SKYLIGHT_TOKEN": "YOUR_COPIED_TOKEN_HERE",
        "SKYLIGHT_AUTH_TYPE": "bearer"
      }
    }
  }
}
```

---

### 8. Cline (VS Code Extension)

1. In VS Code, open the **Cline** extension in the sidebar.
2. Click the **MCP Servers** icon (network plug) -> Click **Configure MCP Servers** (opens `cline_mcp_settings.json`).
3. Add the following entry:
```json
{
  "mcpServers": {
    "skylight": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/skylight-mcp/dist/index.js"],
      "env": {
        "SKYLIGHT_TOKEN": "YOUR_COPIED_TOKEN_HERE",
        "SKYLIGHT_AUTH_TYPE": "bearer"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

---

### 9. Roo Code (VS Code Extension)

1. In VS Code, open the **Roo Code** extension in the sidebar.
2. Click **Settings** -> **MCP Servers** -> **Edit Configuration** (opens `roo_mcp_settings.json`).
3. Add the server entry:
```json
{
  "mcpServers": {
    "skylight": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/skylight-mcp/dist/index.js"],
      "env": {
        "SKYLIGHT_TOKEN": "YOUR_COPIED_TOKEN_HERE",
        "SKYLIGHT_AUTH_TYPE": "bearer"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

---

### 10. Continue.dev

In your `~/.continue/config.json`, add to the `mcpServers` list:

```json
{
  "mcpServers": [
    {
      "name": "skylight",
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/skylight-mcp/dist/index.js"],
      "env": {
        "SKYLIGHT_TOKEN": "YOUR_COPIED_TOKEN_HERE",
        "SKYLIGHT_AUTH_TYPE": "bearer"
      }
    }
  ]
}
```

---

### 11. Goose CLI

Add to Goose using the CLI:

```bash
goose configure add-extension \
  --name skylight \
  --cmd node \
  --args "/ABSOLUTE/PATH/TO/skylight-mcp/dist/index.js" \
  --env SKYLIGHT_TOKEN="YOUR_COPIED_TOKEN_HERE" \
  --env SKYLIGHT_AUTH_TYPE="bearer"
```

---

### 12. ChatGPT Desktop / OpenAI Codex

If using ChatGPT Desktop with MCP support, add the server to your settings file:

```json
{
  "mcpServers": {
    "skylight": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/skylight-mcp/dist/index.js"],
      "env": {
        "SKYLIGHT_TOKEN": "YOUR_COPIED_TOKEN_HERE",
        "SKYLIGHT_AUTH_TYPE": "bearer"
      }
    }
  }
}
```

---

## Cloud Deployment Guide (Render)

Host your MCP server for free/low-cost on [Render](https://render.com) so any tool can access it 24/7 via SSE.

### Step-by-Step Render Setup:
1. Fork or push this repository to your GitHub account.
2. Log into [Render](https://render.com) and click **New +** -> **Web Service**.
3. Select your `skylight-mcp` repository.
4. Configure the settings:
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start` *(or `supergateway --port $PORT --host 0.0.0.0 --stdio "node dist/index.js"`)*
5. Scroll down to **Environment Variables** and add:
   * `SKYLIGHT_TOKEN`: `<YOUR_COPIED_TOKEN>`
   * `SKYLIGHT_AUTH_TYPE`: `bearer`
   * *(⚠️ Make sure `SKYLIGHT_EMAIL` and `SKYLIGHT_PASSWORD` are NOT added!)*
6. Click **Deploy Web Service**.
7. Once deployed, copy your service URL. Your MCP endpoint is:
   ```text
   https://your-service-name.onrender.com/sse
   ```

---

## How to Use & Example Prompts for Your AI Agent

Once connected, you can manage your Skylight by simply chatting with your AI assistant:

### 🤖 Gemini Spark Proactive Automation Prompts
* *"Every morning at 7:00 AM, check our Skylight calendar and chores for the day and give me a quick morning briefing."*
* *"Proactively monitor our Skylight calendar and alert me if any events overlap this week."*
* *"Whenever I ask you to add groceries to my shopping list, add them to our Skylight kitchen list."*
* *"Check dinner plans for tonight on Skylight meals and remind me to start cooking at 5:00 PM."*

### 📅 Calendar Prompts
* *"What's on our family calendar for today and tomorrow?"*
* *"Add 'Dentist Appointment' for Friday from 2:00 PM to 3:00 PM under Alvin's profile."*
* *"Do we have any scheduling conflicts this Saturday morning?"*
* *"Reschedule the soccer practice on Tuesday to 5:30 PM."*
* *"Delete the cancelled meeting on Thursday at 11 AM."*

### 🛒 Lists & Grocery Prompts
* *"What lists do we have on our Skylight?"*
* *"Add 'Almond Milk' and 'Paper Towels' to our grocery list."*
* *"Show me all items currently on our packing list."*

### 🧹 Chores & Checklists
* *"What chores are on the board for today?"*
* *"Which chores are still pending?"*
* *"Mark the 'Feed the Dog' chore as completed."*

### 🍲 Meals & Recipes
* *"What dinners are planned on our Skylight this week?"*

### 🎁 Rewards & Plus Subscription
* *"How many chore reward points do the kids have?"*
* *"Do we have an active Skylight Plus subscription?"*

---

## Full MCP Tools Reference (13 Tools)

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `check_plus_subscription` | *(none)* | Checks Plus subscription status, expiration date, and feature access. |
| `list_events` | `date_min`, `date_max`, `timezone`, `frame_id` | Returns events in ISO-8601 format within the requested date window. |
| `create_event` | `summary`, `start`, `end`, `category_id`, `all_day`, `frame_id` | Creates a calendar event with optional category/color tagging. |
| `update_event` | `event_id`, `summary`, `start`, `end`, `category_id`, `frame_id` | Updates details of an existing calendar event. |
| `delete_event` | `event_id`, `frame_id` | Deletes a calendar event. |
| `list_categories` | `frame_id` | Returns all calendar categories, profiles, and color tags. |
| `list_chores` | `after`, `before`, `include_late`, `frame_id` | Retrieves assigned chores and task statuses. |
| `update_chore` | `chore_id`, `status`, `frame_id` | Updates chore state (`completed` or `pending`). |
| `list_lists` | `frame_id` | Lists all checklists, grocery lists, and to-do lists. |
| `add_list_item` | `list_id`, `text`, `frame_id` | Adds a new item to a specific Skylight list. |
| `list_meals` | `frame_id` | Retrieves scheduled meals and recipes from the meal planner. |
| `list_rewards` | `frame_id` | Retrieves chore reward points and redemption options. |
| `list_frames` | *(none)* | Lists household frames, frame IDs, and hardware metadata. |

---

## Troubleshooting & FAQ

### 1. Error: `401 Unauthorized` / "This version of Skylight is no longer supported"
* **Fix**: You have `SKYLIGHT_EMAIL` and `SKYLIGHT_PASSWORD` set in your environment. Delete both variables completely. Set `SKYLIGHT_TOKEN` and `SKYLIGHT_AUTH_TYPE=bearer`.

### 2. How long does the token last?
* The **refresh token** is long-lived and typically lasts **several months or indefinitely** as long as you do not explicitly click "Log Out" on the website.

### 3. My token stopped working. What happened?
* If you changed your account password or clicked "Log Out" in your web browser, Skylight revokes the active token. Simply run the bookmarklet or extension again while logged in to grab a fresh token.

### 4. Do I need to keep the browser open after copying the token?
* **No.** After copying the token, you can simply close the browser tab.

---

## License

MIT License. Open source and free to use.