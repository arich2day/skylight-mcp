/**
 * Bulk-import recipes into Skylight.
 *
 * Usage:
 *   npx tsx scripts/import-recipes.ts                 # imports scripts/recipes.json
 *   npx tsx scripts/import-recipes.ts --dry           # print the formatted output, create nothing
 *   npx tsx scripts/import-recipes.ts path/to/file.json
 *
 * Requires env: SKYLIGHT_TOKEN (+ SKYLIGHT_AUTH_TYPE=bearer) and SKYLIGHT_FRAME_ID.
 * See docs/recipe-import.md for the input format and details.
 *
 * Skylight recipes only have: a name (summary), a single free-text `description`,
 * and a meal category. This script folds ingredients/instructions/extra details
 * into `description` using Skylight's own plain-text convention so it renders
 * cleanly in the app menus.
 */
import { readFileSync } from "node:fs";
import { createRecipe, getMealCategories } from "../src/api/endpoints/meals.js";

export interface RecipeInput {
  name: string;
  category?: string; // Breakfast / Lunch / Dinner / Snack ... (matched by name)
  servings?: string | number;
  prep?: string;
  cook?: string;
  ingredients?: string[] | string; // array, or newline/semicolon-separated string
  instructions?: string[] | string;
  notes?: string;
  source?: string;
}

function toLines(v?: string[] | string): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : v.split(/\r?\n|;/);
  return arr.map((s) => s.trim()).filter(Boolean);
}

/** Build the single `description` blob using Skylight's Ingredients/Instructions convention. */
export function buildDescription(r: RecipeInput): string {
  const blocks: string[] = [];

  const meta: string[] = [];
  if (r.servings != null && r.servings !== "") meta.push(`Serves: ${r.servings}`);
  if (r.prep) meta.push(`Prep: ${r.prep}`);
  if (r.cook) meta.push(`Cook: ${r.cook}`);
  if (meta.length) blocks.push(meta.join("   •   "));

  const ingredients = toLines(r.ingredients);
  if (ingredients.length) {
    blocks.push("Ingredients:\n" + ingredients.map((i) => (i.startsWith("-") ? i : `- ${i}`)).join("\n"));
  }

  const steps = toLines(r.instructions);
  if (steps.length) {
    blocks.push("Instructions:\n" + steps.map((s, i) => (/^\d+[.)]/.test(s) ? s : `${i + 1}. ${s}`)).join("\n"));
  }

  if (r.notes) blocks.push("Notes:\n" + r.notes.trim());
  if (r.source) blocks.push(`Source: ${r.source.trim()}`);

  return blocks.join("\n\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const file = args.find((a) => !a.startsWith("--")) ?? "scripts/recipes.json";

  const recipes = JSON.parse(readFileSync(file, "utf8")) as RecipeInput[];
  console.log(`Loaded ${recipes.length} recipe(s) from ${file}${dry ? "  (dry run — nothing will be created)" : ""}\n`);

  let categories: { id: string; name: string }[] = [];
  if (!dry) {
    categories = (await getMealCategories()).map((c) => {
      const attrs = c.attributes as Record<string, unknown>;
      return { id: c.id, name: String(attrs.label ?? attrs.name ?? "") };
    });
    console.log("Available meal categories:", categories.map((c) => c.name).join(", ") || "(none)", "\n");
  }

  const resolveCategory = (name?: string): string | undefined => {
    if (!name) return undefined;
    const lower = name.toLowerCase();
    const match =
      categories.find((c) => c.name.toLowerCase() === lower) ??
      categories.find((c) => c.name.toLowerCase().includes(lower));
    return match?.id;
  };

  let created = 0;
  const failures: string[] = [];

  for (const r of recipes) {
    const description = buildDescription(r);

    if (dry) {
      console.log(`===== ${r.name}${r.category ? `  [${r.category}]` : ""} =====`);
      console.log(description + "\n");
      continue;
    }

    const categoryId = resolveCategory(r.category);
    if (r.category && !categoryId) {
      console.warn(`  ! category "${r.category}" not found for "${r.name}" — creating it uncategorized`);
    }

    try {
      const recipe = await createRecipe({ summary: r.name, description, mealCategoryId: categoryId });
      console.log(`✓ ${r.name} (id ${recipe.id})`);
      created++;
    } catch (e) {
      failures.push(`${r.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!dry) {
    console.log(`\nCreated ${created}/${recipes.length} recipe(s).`);
    if (failures.length) {
      console.log("Failures:");
      failures.forEach((f) => console.log("  ✗ " + f));
      process.exitCode = 1;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
