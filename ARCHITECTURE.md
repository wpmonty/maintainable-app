# maintainable.app — Architecture: Intent Parsing + Structured Storage

## The Two-Stage Pipeline

Every inbound email goes through two LLM calls:

```
Email arrives
    │
    ▼
┌─────────────────────────┐
│  CALL 1: Intent Parser  │  (cheap/fast model — llama3.1 or qwen3)
│  "What is the user      │
│   trying to do?"        │
│                         │
│  Returns: structured    │
│  JSON with 1+ intents   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Execute intents        │  (pure code — no LLM)
│  against database       │
│  - Add/remove habits    │
│  - Record check-in      │
│  - Query history        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  CALL 2: Response Gen   │  (quality model — mistral-nemo)
│  "Respond to the user   │
│   given what just        │
│   happened + their       │
│   history"              │
│                         │
│  Input: structured      │
│  context (not raw msgs) │
└───────────┬─────────────┘
            │
            ▼
   Send reply email
```

## Intent Parser (Call 1)

### Multi-Intent Design

A single email can contain multiple intents. The parser returns an array:

```
User: "water 8, pullups 12, drop vitamins, add meditation. how am I doing this week?"
```

Parses to:

```json
{
  "intents": [
    {
      "type": "checkin",
      "entries": [
        { "habit": "water", "value": 8, "unit": "glasses" },
        { "habit": "pullups", "value": 12, "unit": "reps" }
      ]
    },
    {
      "type": "remove_habit",
      "habits": ["vitamins"]
    },
    {
      "type": "add_habit",
      "habits": [
        { "name": "meditation", "unit": null, "goal": null }
      ]
    },
    {
      "type": "query",
      "scope": "week",
      "question": "how am I doing this week?"
    }
  ]
}
```

### Intent Types

| Type | Trigger Examples | DB Action |
|---|---|---|
| `checkin` | "water 6, pullups 10" | INSERT into checkins |
| `add_habit` | "track meditation", "add running" | INSERT into habits |
| `remove_habit` | "stop tracking vitamins", "drop pullups" | SOFT DELETE habit |
| `update_habit` | "change water goal to 10 glasses" | UPDATE habit goal/unit |
| `query` | "how's my week?", "pullup trend?" | SELECT from checkins |
| `greeting` | "hey", "good morning" | No DB action |
| `help` | "what can you do?", "how does this work?" | No DB action |
| `settings` | "send me weekly summaries", "change my name" | UPDATE user prefs |

### Parser System Prompt

```
You are an intent parser for a habit tracking service. Given a user's email, extract ALL intents as structured JSON.

Rules:
- A single message can contain MULTIPLE intents. Extract all of them.
- Check-in values should be parsed as numbers when possible.
- Habit names should be normalized to lowercase singular form.
- If a value has no number, treat it as boolean (did/didn't do it).
- "skip" or empty messages = no intents, just { "intents": [{ "type": "greeting" }] }
- Unknown/ambiguous text = { "type": "query", "question": "<original text>" }

Output ONLY valid JSON. No explanation.
```

### Execution Order

Intents execute in a deterministic order regardless of how the user wrote them:

1. `add_habit` — create new habits first
2. `remove_habit` — remove habits
3. `update_habit` — modify existing habits
4. `settings` — update preferences
5. `checkin` — record values (after habit CRUD so new habits can be checked into)
6. `query` — pull data (after checkin so current day is included)
7. `greeting` / `help` — informational, no DB side effects

This means "add meditation, meditation 20 min" works in a single email — the habit is created, then the check-in is recorded against it.

## Database Schema

```sql
-- Users identified by email
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,              -- parsed from email or set by user
  tier TEXT NOT NULL DEFAULT 'free',
  credits_remaining INTEGER NOT NULL DEFAULT 5,
  preferences JSON DEFAULT '{}',  -- weekly_summary, timezone, etc.
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_checkin_at TEXT
);

-- Habits per user (what they're tracking)
CREATE TABLE habits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,             -- normalized lowercase: "water", "pullups"
  display_name TEXT,              -- original casing: "Pull-ups"
  unit TEXT,                      -- "glasses", "reps", "minutes", null = boolean
  goal REAL,                      -- daily target: 8 (glasses), 15 (reps), null = any
  active INTEGER NOT NULL DEFAULT 1,  -- soft delete
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  removed_at TEXT,
  UNIQUE(user_id, name)
);

-- Individual check-in entries (one row per habit per day)
CREATE TABLE checkins (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  habit_id TEXT NOT NULL REFERENCES habits(id),
  date TEXT NOT NULL,             -- YYYY-MM-DD (one entry per habit per day)
  value REAL,                     -- numeric: 8 (glasses), 12 (reps)
  done INTEGER,                   -- boolean habits: 1/0
  note TEXT,                      -- optional freetext: "back hurts today"
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, habit_id, date)
);

-- Raw email log (immutable audit trail)
CREATE TABLE emails (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id TEXT REFERENCES users(id),
  direction TEXT NOT NULL,        -- 'inbound' or 'outbound'
  subject TEXT,
  body TEXT NOT NULL,
  parsed_intents JSON,            -- Call 1 output stored for debugging
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Payment records
CREATE TABLE payments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_usd REAL NOT NULL,
  credits_purchased INTEGER NOT NULL,
  tx_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_checkins_user_date ON checkins(user_id, date);
CREATE INDEX idx_checkins_habit_date ON checkins(habit_id, date);
CREATE INDEX idx_habits_user ON habits(user_id, active);
CREATE INDEX idx_emails_user ON emails(user_id, created_at);
```

## Response Generation (Call 2)

### Structured Context (not raw messages)

Instead of dumping raw email history into the context window, we build a structured context block from the database:

```
USER PROFILE:
  Name: James
  Tracking since: Jan 1 (46 days)
  Active habits: water (goal: 8 glasses), pullups (goal: none), meditation (new today)

TODAY'S CHECK-IN:
  water: 8 glasses ✓ (meets goal)
  pullups: 12 reps
  meditation: (new habit, no check-in yet)
  Removed: vitamins

THIS WEEK (Mon-Today):
  water: 8, 7, 8, 6, 8 (avg 7.4, goal met 3/5 days)
  pullups: 12, 10, -, 15, 12 (avg 12.3, missed Wed)

TRENDS (last 30 days):
  water: 92% goal compliance, improving
  pullups: avg 12.4 → 13.1 (up 5.6%), PR: 18 on Feb 11
  vitamins: 78% compliance (now removed)

MILESTONES:
  - Day 46 today
  - Next milestone: Day 50 (4 days away)
  - Pullup PR: 18 (Feb 11)

WHAT JUST HAPPENED:
  - Recorded check-in for water (8) and pullups (12)
  - Removed habit: vitamins
  - Added habit: meditation
  - User asked: "how am I doing this week?"
```

This is what the response LLM sees — real data, real trends, real numbers. No hallucination possible for factual claims.

### Response Prompt

```
You are a friendly habit tracking assistant. Respond to the user based on the structured context below.

Rules:
- Reference specific numbers and trends from the data (never guess)
- Acknowledge ALL actions that just happened (check-in recorded, habits added/removed, etc.)
- Answer any questions using the provided data
- Keep it under 150 words
- Be warm but not saccharine — like a friend who actually cares
- If they had a bad day, be gentle. If they hit a milestone, celebrate.

[STRUCTURED CONTEXT]
{context block}

[USER'S ORIGINAL MESSAGE]
{email body}
```

## Onboarding Flow

First email from a new sender:

```
New email from unknown sender
  → Create user record
  → Parse email for habits
  → If habits detected: create them, record first check-in
  → If no habits detected: send welcome with instructions

Welcome response:
"Hey! Welcome to maintainable. Just email me what you did today — 
like 'water 6 glasses, ran 20 min, took vitamins.' I'll remember 
everything and check in with you daily. What habits are you working on?"
```

Subsequent emails auto-detect new habits vs check-ins:
- "water 8, ran 3 miles" → if "ran" isn't a habit yet, auto-create it + record check-in
- Could also require explicit "track running" — TBD on how strict to be

## Smoke Test Extensions

The current smoke test validates tone and personality. Future extensions:

### Phase 1: Intent Parser Tests
```json
// test-intents.json — input/expected pairs
[
  {
    "input": "water 8, pullups 12",
    "expected_intents": [
      { "type": "checkin", "entries": [{ "habit": "water", "value": 8 }, { "habit": "pullups", "value": 12 }] }
    ]
  },
  {
    "input": "water 8, drop vitamins, add yoga, how was my week?",
    "expected_intents": [
      { "type": "checkin", "entries": [{ "habit": "water", "value": 8 }] },
      { "type": "remove_habit", "habits": ["vitamins"] },
      { "type": "add_habit", "habits": [{ "name": "yoga" }] },
      { "type": "query", "scope": "week" }
    ]
  },
  {
    "input": "skip",
    "expected_intents": [{ "type": "greeting" }]
  }
]
```

Test: parse each input, compare against expected. Score on:
- Correct number of intents detected
- Correct types
- Correct habit names / values
- No phantom intents

### Phase 2: Full Pipeline Tests
- Seed DB with known history
- Send check-in through full pipeline (parse → execute → respond)
- Verify: DB state matches expected, response references correct data

### Phase 3: CRUD Stress Test
- Rapid add/remove/update habits across 20 emails
- Verify DB consistency
- Verify responses acknowledge all changes
- Test edge cases: remove nonexistent habit, add duplicate, check-in for removed habit

## Open Design Questions

1. **Auto-create habits or require explicit "track X"?**
   - Auto-create is frictionless but might create junk habits from typos
   - Explicit is cleaner but adds friction on day 1
   - Hybrid: auto-create on first email (onboarding), require explicit after

2. **How strict on intent parsing?**
   - "did pullups" — boolean (done) or should we ask for a number?
   - "good day" — greeting or check-in with no data?
   - Conservative: ask for clarification. Aggressive: make best guess.

3. **Conflict resolution in multi-intent:**
   - "add water, remove water" in same email?
   - Last intent wins? Error? Ask for clarification?

4. **Check-in granularity:**
   - One check-in per day per habit (UPSERT — last value wins)?
   - Or allow multiple (morning water 4, evening water 4 = 8 total)?
   - UPSERT is simpler. Additive is more accurate. Leaning UPSERT for v1.

5. **Model assignment:**
   - Intent parser: cheapest model that reliably outputs JSON (llama3.1? qwen3?)
   - Response gen: best personality model (mistral-nemo based on smoke test)
   - Could be same model for both in v1, split later for cost optimization
