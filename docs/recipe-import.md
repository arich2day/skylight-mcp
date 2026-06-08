# Importing recipes into Skylight

Skylight recipes have only three writable parts:

| Field | Holds |
|---|---|
| `summary` | the recipe **name** |
| `description` | **one free-text blob** — ingredients, steps, and any extra details |
| meal category | Breakfast / Lunch / Dinner / Snack … (a selectable field) |

There are **no** structured fields for ingredients, steps, prep/cook time,
servings, nutrition, or a photo. Skylight's own built-in recipes put everything
in `description` using this plain-text convention, which is what renders cleanly
in the app menus:

```
Serves: 4   •   Prep: 20 min

Ingredients:
- 2 cups pancake mix
- Milk
- 1 tsp vanilla extract

Instructions:
1. Preheat a lightly greased skillet over medium heat.
2. Combine everything; stir until just blended.
3. Pour ~1/4 cup per pancake; flip when bubbles form.

Notes:
Add blueberries for a treat.
```

`scripts/import-recipes.ts` produces exactly this layout from a simple JSON file,
so any "extra details" you have land in the right place automatically.

## Input format

A JSON array of recipes (`ingredients`/`instructions` may be arrays **or** a
single string split on newlines/semicolons). See `scripts/recipes.example.json`.

```json
[
  {
    "name": "Fluffy Pancakes",
    "category": "Breakfast",
    "servings": 4,
    "prep": "20 min",
    "ingredients": ["2 cups pancake mix", "Milk", "2 eggs", "1 tsp vanilla"],
    "instructions": ["Preheat skillet.", "Mix until just blended.", "Pour 1/4 cup; flip when bubbly."],
    "notes": "Add blueberries for a treat.",
    "source": "Family favorite"
  }
]
```

Fields: `name` (required), `category`, `servings`, `prep`, `cook`,
`ingredients`, `instructions`, `notes`, `source`. Everything except `name` is
optional; `category` is matched by name against the frame's meal categories.

## Running it

Requires a valid token in the environment:

```bash
export SKYLIGHT_TOKEN=<fresh bearer token>   # see docs/getting-a-token.md
export SKYLIGHT_AUTH_TYPE=bearer
export SKYLIGHT_FRAME_ID=<your frame id>

# 1. Preview the formatted descriptions without touching the account:
npx tsx scripts/import-recipes.ts scripts/recipes.json --dry

# 2. Create them for real:
npx tsx scripts/import-recipes.ts scripts/recipes.json
```

Always run `--dry` first to eyeball the layout, then drop the flag to import.

## Resuming in a new session

This environment is ephemeral — only what's committed to the repo survives. The
machinery above (script + this doc + the format) persists, so to finish the
import in a fresh session you only need to supply the per-run data:

1. Paste your recipes; they get written to `scripts/recipes.json` (this file is
   git-ignored so personal data isn't committed).
2. Grab a **fresh** token (`docs/getting-a-token.md`) and set the env vars above.
3. Run the dry preview, confirm, then import.
