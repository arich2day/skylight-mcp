/**
 * Bulk-import recipes into Skylight.
 *
 * Usage:
 *   npx tsx scripts/import-recipes.ts                      # imports scripts/recipes.json
 *   npx tsx scripts/import-recipes.ts scripts/recipes.csv  # CSV input
 *   npx tsx scripts/import-recipes.ts <file> --dry         # print formatted output, create nothing
 *
 * Requires env: SKYLIGHT_TOKEN (+ SKYLIGHT_AUTH_TYPE=bearer) and SKYLIGHT_FRAME_ID.
 * See docs/recipe-import.md for the input format and details.
 *
 * Skylight recipes only have: a name (summary), a single free-text `description`,
 * and a meal category. This script folds ingredients/instructions and any extra
 * details (protein, flavor, price, appliance, side, picky-eater option, etc.)
 * into `description` using Skylight's plain-text convention so it renders cleanly
 * in the app menus.
 */
import { readFileSync } from "node:fs";
import { createRecipe, getMealCategories, getRecipes } from "../src/api/endpoints/meals.js";

export interface RecipeInput {
  name: string;
  category?: string; // Breakfast / Lunch / Dinner / Snack (matched by label)
  protein?: string;
  style?: string; // style / flavor profile
  price?: string | number; // per serving
  appliance?: string;
  servings?: string | number;
  prep?: string;
  cook?: string;
  ingredients?: string[] | string; // array, or comma/semicolon/newline-separated
  instructions?: string[] | string; // array, or sentences/newlines/semicolons
  side?: string; // suggested appetizer / side
  pickyEater?: string; // picky-eater option
  notes?: string;
  source?: string;
}

function splitList(v: string[] | string | undefined, sep: RegExp): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : v.split(sep);
  return arr.map((s) => s.trim()).filter(Boolean);
}

const parseIngredients = (v?: string[] | string): string[] => splitList(v, /[,;\n]+/);

function parseInstructions(v?: string[] | string): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((s) => s.trim()).filter(Boolean);
  // Prefer explicit separators; otherwise split a paragraph into sentences.
  if (/\n|;/.test(v)) return v.split(/[\n;]+/).map((s) => s.trim()).filter(Boolean);
  return v.split(/(?<=[.!?])\s+(?=["'(A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
}

function formatPrice(p?: string | number): string {
  if (p == null || p === "") return "";
  const s = String(p).trim();
  return `${s.startsWith("$") ? s : "$" + s}/serving`;
}

/** Build the single `description` blob using Skylight's Ingredients/Instructions convention. */
export function buildDescription(r: RecipeInput): string {
  const blocks: string[] = [];

  const headline = [r.style, r.protein, formatPrice(r.price)]
    .map((s) => (s == null ? "" : String(s).trim()))
    .filter(Boolean)
    .join("  •  ");
  if (headline) blocks.push(headline);

  const sub: string[] = [];
  if (r.appliance) sub.push(`Appliance: ${String(r.appliance).trim()}`);
  const meta: string[] = [];
  if (r.servings != null && r.servings !== "") meta.push(`Serves: ${r.servings}`);
  if (r.prep) meta.push(`Prep: ${r.prep}`);
  if (r.cook) meta.push(`Cook: ${r.cook}`);
  if (meta.length) sub.push(meta.join("   •   "));
  if (sub.length) blocks.push(sub.join("\n"));

  const ingredients = parseIngredients(r.ingredients);
  if (ingredients.length) {
    blocks.push("Ingredients:\n" + ingredients.map((i) => (i.startsWith("-") ? i : `- ${i}`)).join("\n"));
  }

  const steps = parseInstructions(r.instructions);
  if (steps.length) {
    blocks.push("Instructions:\n" + steps.map((s, i) => (/^\d+[.)]/.test(s) ? s : `${i + 1}. ${s}`)).join("\n"));
  }

  const extras: string[] = [];
  if (r.side) extras.push(`Side: ${String(r.side).trim()}`);
  if (r.pickyEater) extras.push(`Picky eater: ${String(r.pickyEater).trim()}`);
  if (extras.length) blocks.push(extras.join("\n"));

  if (r.notes) blocks.push("Notes:\n" + String(r.notes).trim());
  if (r.source) blocks.push(`Source: ${String(r.source).trim()}`);

  return blocks.join("\n\n");
}

// ---- CSV support ---------------------------------------------------------

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim().length));
}

const HEADER_MAP: Record<string, keyof RecipeInput> = {
  category: "category",
  recipename: "name", name: "name",
  targetprotein: "protein", protein: "protein",
  styleflavorprofile: "style", style: "style", flavorprofile: "style",
  keyingredients: "ingredients", ingredients: "ingredients",
  priceserv: "price", price: "price", priceserving: "price",
  targetappliance: "appliance", appliance: "appliance",
  stepbystepdirections: "instructions", directions: "instructions", instructions: "instructions", steps: "instructions",
  suggestedappetizerside: "side", side: "side", suggestedside: "side",
  pickyeateroption: "pickyEater", pickyeater: "pickyEater",
  servings: "servings", prep: "prep", cook: "cook", notes: "notes", source: "source",
};

const normHeader = (h: string): string => h.toLowerCase().replace(/[^a-z0-9]/g, "");

function csvToRecipes(text: string): RecipeInput[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const headers = rows[0].map(normHeader).map((h) => HEADER_MAP[h]);
  return rows.slice(1).map((cells) => {
    const r: Record<string, string> = {};
    headers.forEach((key, idx) => {
      const val = (cells[idx] ?? "").trim();
      if (key && val) r[key] = val;
    });
    return r as unknown as RecipeInput;
  }).filter((r) => r.name);
}

// ---- main ----------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const file = args.find((a) => !a.startsWith("--")) ?? "scripts/recipes.json";
  const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0);
  const delayMs = Number(args.find((a) => a.startsWith("--delay="))?.split("=")[1] ?? 120);
  // By default, recipes whose name already exists are skipped (idempotent /
  // resumable). Pass --no-skip to create them anyway (e.g. intentional variants).
  const skipExisting = !args.includes("--no-skip");
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const raw = readFileSync(file, "utf8");
  let recipes = file.toLowerCase().endsWith(".csv") ? csvToRecipes(raw) : (JSON.parse(raw) as RecipeInput[]);
  if (limit > 0) recipes = recipes.slice(0, limit);

  console.log(`Loaded ${recipes.length} recipe(s) from ${file}${dry ? "  (dry run — nothing will be created)" : ""}\n`);

  let categories: { id: string; name: string }[] = [];
  // Names of recipes already on the account — so re-running is idempotent and a
  // run interrupted by an expired token resumes cleanly with a fresh one.
  const existing = new Set<string>();
  if (!dry) {
    categories = (await getMealCategories()).map((c) => {
      const attrs = c.attributes as Record<string, unknown>;
      return { id: c.id, name: String(attrs.label ?? attrs.name ?? "") };
    });
    console.log("Available meal categories:", categories.map((c) => c.name).join(", ") || "(none)", "\n");

    for (const rec of await getRecipes()) {
      const summary = (rec.attributes as Record<string, unknown>).summary;
      if (summary) existing.add(String(summary).trim().toLowerCase());
    }
    if (skipExisting) console.log(`${existing.size} recipe(s) already on the account will be skipped.\n`);
    else console.log(`--no-skip: existing names will NOT be skipped.\n`);
  }

  const isAuthError = (e: unknown): boolean => {
    const m = e instanceof Error ? `${e.name} ${e.message}` : String(e);
    return /401|auth|invalid token|unauthorized/i.test(m);
  };

  // Map sheet categories that don't exist in Skylight onto its four built-in
  // categories (Breakfast / Lunch / Dinner / Snack). New categories can't be
  // created via the API. Override with SKYLIGHT_CATEGORY_ALIASES if needed.
  const CATEGORY_ALIASES: Record<string, string> = {
    "lunch prep": "Lunch",
    smoothie: "Breakfast",
    "kids meal": "Snack",
    "kids meals": "Snack",
  };

  const resolveCategory = (name?: string): string | undefined => {
    if (!name) return undefined;
    let lower = name.trim().toLowerCase();
    if (CATEGORY_ALIASES[lower]) lower = CATEGORY_ALIASES[lower].toLowerCase();
    const match =
      categories.find((c) => c.name.toLowerCase() === lower) ??
      categories.find((c) => c.name.toLowerCase().includes(lower)) ??
      categories.find((c) => lower.includes(c.name.toLowerCase()));
    return match?.id;
  };

  let created = 0;
  let skipped = 0;
  let aborted = false;
  const failures: string[] = [];

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    const description = buildDescription(r);

    if (dry) {
      console.log(`===== ${r.name}${r.category ? `  [${r.category}]` : ""} =====`);
      console.log(description + "\n");
      continue;
    }

    const key = r.name.trim().toLowerCase();
    if (skipExisting && existing.has(key)) { skipped++; continue; }

    const categoryId = resolveCategory(r.category);
    if (r.category && !categoryId) {
      console.warn(`  ! category "${r.category}" not found for "${r.name}" — creating it uncategorized`);
    }

    // Create with one retry to ride out a transient rate-limit/5xx on big runs.
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const recipe = await createRecipe({ summary: r.name, description, mealCategoryId: categoryId });
        existing.add(key);
        created++;
        if (created % 25 === 0) console.log(`  …${created} created (at "${r.name}")`);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (isAuthError(e)) break; // token dead — don't grind through the rest
        if (attempt === 0) await sleep(2000);
      }
    }

    if (lastErr) {
      if (isAuthError(lastErr)) {
        aborted = true;
        console.error(`\n⛔ Auth failed at recipe ${i + 1}/${recipes.length} ("${r.name}"). Token likely expired.`);
        console.error("   Re-run with a fresh SKYLIGHT_TOKEN — already-created recipes will be skipped.");
        break;
      }
      failures.push(`${r.name}: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
    }

    await sleep(delayMs);
  }

  if (!dry) {
    console.log(`\nCreated ${created}, skipped ${skipped} (already existed)${aborted ? ", ABORTED early" : ""}.`);
    if (failures.length) {
      console.log(`Failures (${failures.length}):`);
      failures.slice(0, 20).forEach((f) => console.log("  ✗ " + f));
      if (failures.length > 20) console.log(`  …and ${failures.length - 20} more`);
      process.exitCode = 1;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
