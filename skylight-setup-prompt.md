# Skylight Family Setup Prompt (MCP-native)

Paste the prompt below into an AI assistant that has the **Skylight MCP** connected. It replaces the
old Puppeteer/headless-Chrome script approach — the MCP talks to the Skylight API directly, so no
browser, selectors, script file, node dependencies, or pasted credentials are needed.

> Things from the original request that are **not possible** via the Skylight API (and so are listed as
> a manual checklist at the end of the prompt): daily baseline screen time and standard
> extension/upgrade caps. These are device parental-control settings with no API.

---

```
Use the connected **Skylight MCP** to set up our family's chore chart and rewards store.
Do NOT use Puppeteer, a browser, selectors, or write any script — the MCP calls the Skylight API
directly. Do not ask for or use my email/password; the MCP already handles auth.

STEP 0 — Discover & confirm (do this first, then pause for my OK):
1. Call get_family_members and show me the profiles. Map people → profiles and tell me if any are missing:
   - Alvin (11)  → child profile "Alvin"
   - Zoe (9)     → child profile "Zoe"
   - Maven (4)   → child profile "Maven"
   - Alvin III   → the DAD profile
   - Quiana      → the MOM profile
   (Note there are two "Alvins" — the 11-year-old child and Dad — so use the profile labels to disambiguate.)
2. Confirm the account has Skylight Plus. If the reward tools (get_rewards/create_reward) aren't
   available, tell me and skip the Rewards section.

STEP 1 — Create chores with create_chore. Rules:
   - Stars → rewardPoints.  - Assign each to the right person via assignee.
   - Recurring chores: recurring=true with recurrencePattern:
       Daily            → "daily"
       Sun/Wed          → "RRULE:FREQ=WEEKLY;BYDAY=SU,WE"
       Fri/Sat          → "RRULE:FREQ=WEEKLY;BYDAY=FR,SA"
       Wed/Sat          → "RRULE:FREQ=WEEKLY;BYDAY=WE,SA"
       Sat              → "RRULE:FREQ=WEEKLY;BYDAY=SA"
   - Keep the time-of-day label (Morning/Evening/Post-Meals) and any emoji in the chore name.

ALVIN (assignee = Alvin):
   - "[Morning] Morning Routine (Get dressed, bed, teeth)"        daily   | 2 stars
   - "[Evening] Evening Routine (Teeth, backpack, shoes away)"     daily   | 2 stars
   - "[Post-Meals] Clear & wipe the dining table"                 daily   | 2 stars
   - "[Post-Meals] Vacuum under the dining table"                 daily   | 2 stars
   - "Empty the dishwasher"                                       daily   | 3 stars
   - "Load the dishwasher"                                        daily   | 3 stars
   - "Wash, dry, fold, and put away own clothes completely"       Sun/Wed | 10 stars
   - "Vacuum the living room"                                     Fri/Sat | 5 stars
   - "Clean the powder room"                                      Sat     | 10 stars

ZOE (assignee = Zoe):
   - "[Morning] Morning Routine (Get dressed, bed, teeth)"        daily   | 2 stars
   - "[Evening] Evening Routine (Teeth, backpack, shoes away)"     daily   | 2 stars
   - "[Post-Meals] Clear & wipe the dining table"                 daily   | 2 stars
   - "[Post-Meals] Vacuum under the dining table"                 daily   | 2 stars
   - "Empty the dishwasher"                                       daily   | 3 stars
   - "Load the dishwasher"                                        daily   | 3 stars
   - "Wash, dry, fold, and put away own clothes completely"       Sun/Wed | 10 stars
   - "Clean and organize the playroom"                            Wed/Sat | 5 stars

MAVEN (assignee = Maven):
   - "[Morning] Morning Routine 👕🪥 (Get dressed, brush teeth)"    daily   | 2 stars
   - "[Evening] Evening Routine 🥱👟 (Pajamas on, shoes away)"      daily   | 2 stars
   - "[After Play] Put toys away 🚗"                              daily   | 3 stars
   - "Try on the potty 🚽"                                        daily   | 1 star
   - "Poop in the potty 🎉 (Instant Prize Box Entry!)"            daily   | 10 stars
     (this is a per-success reward; modeled as a daily recurring chore)

DAD (assignee = Alvin III / Dad profile)  AND  MOM (assignee = Quiana / Mom profile) — same 5 each:
   - "Make up bed 🛌"                  daily   | 1 star
   - "Workout / Exercise 🏋️‍♂️"          daily   | 1 star
   - "Wash clothes 🧺"                 weekly  | 5 stars   (recurrencePattern "weekly")
   - "Clean master bathroom 🧼"        weekly  | 5 stars
   - "Lead Bible Study 📖"             weekly  | 5 stars

STEP 2 — Create the rewards store with create_reward (Plus only). Rules:
   - Stars → pointValue.  - Assign each reward to the right child via assignee.
   - Set respawnOnRedemption=true (these are repeatable rewards).

ALVIN (assignee = Alvin):
   - "+30 Mins Gaming Time"                          5
   - "Pick Family Movie Night Choice"                5
   - "3-Hour Weekend Mega Block (Fri-Sun)"          25
   - "$5 V-Bucks Card"                              25
   - "Pizza Dinner Swap Pass"                       25
   - "Chore-Free Day Pass"                          25
   - "The Fortnite Battle Pass"                     100
   - "Host a Friends-Over Gaming Night"             100
   - "$20 Cash"                                     100
   - "Pro Gaming Controller / Desk Accessory"       500

ZOE (assignee = Zoe):
   - "+30 Mins Phone/Switch Time"                    5
   - "Pick Family Movie Night Choice"                5
   - "3-Hour Weekend Mega Block (Fri-Sun)"          25
   - "$5 Robux / App Cash"                          25
   - "Baskin-Robbins Ice Cream Date"               25
   - "Trip to the Art Store"                        25
   - "A New Nintendo Switch Game"                  100
   - "1-on-1 Target/Craft Date with Parents"       100
   - "$20 Cash"                                     100
   - "Her Own Nintendo Switch 🌟"                   500

MAVEN (assignee = Maven):
   - "+15 Mins Video Time 📺"                        5
   - "Pick Family Dance Song 🕺"                     5
   - "15 Mins Late Bedtime 🌙"                       5
   - "Baskin-Robbins Ice Cream Trip 🍦"            25
   - "Premium Matchbox / Hot Wheels Car 🏎️"        25
   - "Living Room Blanket Fort Night 🏰"            25
   - "'Yes Day' Morning (1 Hour Parent Play) 🏎️"  100
   - "Major Toy Car Track Set 🚙"                  100
   - "Family Trip to Indoor Trampoline Park / Theme Park 🎢"  500

STEP 3 — Verify: call get_chores (and get_rewards) per profile and show me a summary of everything created.

MANUAL — set these yourself in the Skylight app (no API exists for them):
   - Daily baseline screen time: Alvin 60–90 min, Zoe 60 min, Maven 30–45 min.
   - Standard extension caps: Alvin max 2/day, Zoe max 2/day, Maven max 1/day.
```

---

## Why the original prompt was changed

**Removed as unnecessary** (the MCP makes them obsolete):

- Puppeteer, headless Chrome, page navigation, DOM clicks/inputs, and the `setup_skylight.js` file —
  the MCP uses structured JSON:API calls, there is no UI to drive.
- "Review the target selectors for the Skylight web platform" — there are no selectors.
- Installing node dependencies.
- `SKYLIGHT_EMAIL` / `SKYLIGHT_PASSWORD` placeholders — the MCP already holds auth via its own env
  config; credentials should never be pasted into a prompt or script.
- Creating the 5 profiles — they already exist, and the MCP can only read profiles
  (`get_family_members`), not create them.

**Kept, but remapped to real MCP capabilities:**

| Original concept            | MCP mapping                                                        |
|-----------------------------|-------------------------------------------------------------------|
| Stars on a chore            | `create_chore` → `rewardPoints`                                   |
| Stars on a reward           | `create_reward` → `pointValue`                                   |
| Assign to a person          | `assignee` (resolved to a Skylight profile/category)             |
| Daily / weekly / day-of-week| `recurring: true` + `recurrencePattern` ("daily"/"weekly"/RRULE) |
| Morning/Evening/Post-Meals  | recurring chores with the label kept in the name (no native routine flag via MCP) |
| Emojis                      | kept in the chore/reward name text                               |

**Not possible via the API → manual checklist:** daily baseline screen time and extension/upgrade caps
are device parental-control settings with no Skylight API or MCP tool.
