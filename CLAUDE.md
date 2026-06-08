# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MCP server enabling AI assistants to interact with the Skylight family calendar API (calendar, chores, lists, tasks, rewards, meals, photos).

Base API URL: `https://app.ourskylight.com`

## Commands

```bash
npm install
npm run build          # Compile TypeScript
npm run dev            # Development with hot reload (tsx watch)
npm test               # Run vitest tests
npm test -- dates      # Run single test file (matches filename)
npm run test:coverage  # Tests with coverage
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run generate:types # Generate TypeScript types from OpenAPI spec
```

## Architecture

**Two-tier tool system**:
1. `api/endpoints/*.ts` (11 modules) - Low-level HTTP wrappers for each API resource
2. `tools/*.ts` (9 modules) - MCP tool definitions with Zod parameter validation

**Tool Registration**: Each domain exports `registerXxxTools(server)` called from `server.ts`. Plus-only tools are conditionally registered based on subscription status.

**Key files**:
- `config.ts` - Zod-validated env config supporting two auth methods
- `api/client.ts` - HTTP client with Bearer/Basic auth, auto-login, subscription status tracking
- `api/auth.ts` - Login endpoint for email/password authentication
- `api/generated-types.ts` - Auto-generated types from OpenAPI spec
- `utils/dates.ts` - Parses "today", "tomorrow", day names, YYYY-MM-DD

## Authentication

Two methods supported (validated via Zod refinement in `config.ts`):

1. **Email/Password** (recommended): Set `SKYLIGHT_EMAIL` and `SKYLIGHT_PASSWORD`. Server auto-logs in via POST /api/sessions and uses `Basic base64(userId:token)` format for subsequent requests.
2. **Manual Token**: Set `SKYLIGHT_TOKEN` and optionally `SKYLIGHT_AUTH_TYPE` (bearer/basic).

Both require `SKYLIGHT_FRAME_ID` (household identifier from API URLs like `/api/frames/{frameId}/chores`).

**Note**: The Skylight API uses Basic auth with the format `Basic base64(userId:token)`, not Bearer tokens.

## Plus Subscription

Some features require a Skylight Plus subscription. The server detects subscription status from the login response (`subscription_status: "plus"`). Plus-only tools are not registered for non-Plus users.

**Plus-only domains**: Rewards, Meals, Photos

## MCP Tools (35+ total)

### Base Tools (Always Available)

| Category | Tools |
|----------|-------|
| Calendar | `get_calendar_events`, `get_source_calendars`, `create_calendar_event`, `update_calendar_event`, `delete_calendar_event` |
| Chores | `get_chores`, `create_chore`, `update_chore`, `delete_chore` |
| Lists | `get_lists`, `get_list_items`, `create_list`, `update_list`, `delete_list`, `create_list_item`, `update_list_item`, `delete_list_item` |
| Tasks | `create_task` |
| Family | `get_family_members`, `get_frame_info`, `get_devices` |
| Misc | `get_avatars`, `get_colors` |

### Plus-Only Tools

| Category | Tools |
|----------|-------|
| Rewards | `get_rewards`, `get_reward_points`, `create_reward`, `update_reward`, `delete_reward`, `redeem_reward`, `unredeem_reward` |
| Meals | `get_meal_categories`, `get_recipes`, `get_recipe`, `create_recipe`, `update_recipe`, `delete_recipe`, `add_recipe_to_grocery_list`, `get_meal_sittings`, `create_meal_sitting` |
| Photos | `get_albums` |

## Technical Details

- **Runtime**: Node.js 18+
- **Module System**: ESM (`"type": "module"`)
- **TypeScript**: ES2022 target, NodeNext module resolution, strict mode
- **API Format**: JSON:API patterns (type, id, attributes, relationships)
- **Timezone**: Defaults to America/New_York, configurable via `SKYLIGHT_TIMEZONE`
- **Type Generation**: Uses `openapi-typescript` to generate types from `skylight-api` OpenAPI spec

## Versioning & Releases

**Release Process**:
1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Commit changes and merge to main
4. Create and push a tag with `v` prefix: `git tag v1.2.3 && git push origin v1.2.3`

**Important**: Tags must start with `v` (e.g., `v1.1.7`) to trigger the release workflow. Tags without the `v` prefix (e.g., `1.1.7`) will not trigger a release.

The release workflow (`.github/workflows/release.yml`) will:
- Run linting, type checking, and tests
- Build the package
- Publish to npm with provenance
- Create a GitHub release with auto-generated changelog

## API Quirks

- **Calendar date_max is exclusive**: When querying calendar events, `date_max` is treated as exclusive. The code adds 1 day to include events on the end date.
- **Auth format**: Email/password login uses `Basic base64(userId:token)`. The web app's session token is a plain Bearer token — set `SKYLIGHT_TOKEN` with `SKYLIGHT_AUTH_TYPE=bearer` to reuse a captured session and skip login.
- **Writes use flat bodies, not JSON:API**: Chore/reward create/update send a flat JSON body. The assignee is a numeric `category_id` (chores) or `category_ids` array (rewards) — *not* a `relationships` object. GET responses are still JSON:API (`data`/`attributes`/`relationships`).
- **`recurrence_set` is an array of RRULE strings**: A single string silently saves as non-recurring. A multi-day `BYDAY=FR,SA` in one rule is rejected ("Valid FREQ value is required"); send one rule per day instead.
- **Routines**: Chores with `routine: true` must have exactly one `BYHOUR` of `6` (morning), `14` (midday), or `20` (evening).
- **Deleting recurring chores**: Requires an `apply_to` query param (`all` / `this` / `this_and_future`). Delete responses may have an empty body.

## Recipe Import (remembered convention)

A Skylight recipe has only three writable parts: `summary` (the name), one
free-text `description`, and a meal category (Breakfast/Lunch/Dinner/Snack,
matched by the category's `label`). There are **no** structured fields for
ingredients, steps, price, appliance, etc. — those all go into `description`.

**Always import recipes with `scripts/import-recipes.ts`** (don't hand-format):

```bash
npx tsx scripts/import-recipes.ts <file.csv|file.json> --dry   # preview, creates nothing
npx tsx scripts/import-recipes.ts <file.csv|file.json>         # create for real
```

Requires `SKYLIGHT_TOKEN` (+ `SKYLIGHT_AUTH_TYPE=bearer`) and `SKYLIGHT_FRAME_ID`.
The token expires — capture a fresh one per `docs/getting-a-token.md`. Personal
recipe data lives in `scripts/recipes.csv` / `scripts/recipes.json` (git-ignored).

**Description format (the "conversion" to preserve)** — extra details with no
native field are folded into `description` in this order:

1. Headline: `{Style/Flavor}  •  {Protein}  •  ${Price}/serving`
2. `Appliance: …` then a `Serves: … • Prep: … • Cook: …` line
3. `Ingredients:` with `- ` bullet lines (key ingredients split on commas)
4. `Instructions:` numbered steps (a directions paragraph is split into sentences)
5. `Side: …`, then `Picky eater: …`, then `Notes:`, then `Source: …`

CSV headers are matched loosely (case/spacing/punctuation ignored): Recipe Name,
Category, Target Protein, Style / Flavor Profile, Key Ingredients, Price / Serv.,
Target Appliance, Step-by-Step Directions, Suggested Appetizer / Side, Picky
Eater Option (plus Servings/Prep/Cook/Notes/Source). See `docs/recipe-import.md`.
