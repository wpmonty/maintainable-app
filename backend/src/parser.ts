import type { ParseResult, Intent } from './types.js';

const PARSER_SYSTEM_PROMPT = `You are an intent parser for a habit tracking service. Given a user's email, extract ALL intents as structured JSON.

Rules:
- A single message can contain MULTIPLE intents. Extract all of them.
- Check-in values should be parsed as numbers when possible.
- Habit names should be normalized to lowercase singular form.
- Each check-in entry has a STATUS field: "full" (did it fully/met goal), "partial" (did some but not full), or "skip" (didn't do it).
  - "water 8" with goal 8 → status: "full", value: 8
  - "some water", "a little water", "a few X", "just a few X", "only a little X", "water 3" (under goal) → status: "partial", value if given
  - "skipped water", "no water", "didn't drink water", "X no", "no X" → status: "skip"
  - "did pullups", "took vitamins", "X yes" (no number, affirmative) → status: "full"
  - When parsing "X 4/8" or "X 4 out of 8" → value: 4, status: "partial" (did 4 out of goal 8)

NEGATION PATTERNS (CRITICAL):
- "No X" / "No X today" / "Didn't do X" / "Skipped X" / "X no" → create ONE checkin entry: { habit: "X", status: "skip" }
- "No X or Y" / "No X and Y" → create SKIP entries for EACH: [{ habit: "X", status: "skip" }, { habit: "Y", status: "skip" }]
- "No X yet" / "No X so far" → SKIP entry for X (user is indicating they haven't done it)
- "X yes, Y no" / "vitamins yes, exercise no" → create FULL entry for X and SKIP entry for Y (NOT remove_habit)
- "No X, but good otherwise" / "No X or Y, but everything else" / "No X, good otherwise" / "No X, rest is good" → 
  * Create SKIP entries for ALL explicitly negated habits (X, Y)
  * Create FULL entries for ALL other habits the user tracks (requires userHabits context)
  * Example: user tracks [water, pullups, vitamins], message "No pullups, good otherwise" → 
    [{ habit: "pullups", status: "skip" }, { habit: "water", status: "full" }, { habit: "vitamins", status: "full" }]
- "Everything but X" / "All good except X" / "Everything except X" → 
  * Create SKIP entry for X
  * Create FULL entries for all other habits in userHabits
- "Everything" / "All good" / "All done" / "Everything today" → create FULL entries for ALL habits in userHabits

IMPORTANT: When you see negation words like "No", "didn't", "skipped" followed by a habit name, or "habit no", you MUST create a skip entry for that habit, NOT a remove_habit intent. "X no" means they didn't do it today (skip), not that they want to stop tracking it (remove).

- Notes: extra context like "back hurts", "felt great", "rough day", "feeling sick today", "traveling today", "crazy busy day" goes in the "note" field of the check-in entry, NOT as a separate query intent.
- "skip", "off day", or content-free messages = { "intents": [{ "type": "greeting" }] }
- "what can you do?", "how does this work?", "help" = { "type": "help" }
- Emotional or situational context ("feeling sick", "traveling", "busy day", "back hurts", "felt great") should be absorbed into check-in notes, NOT turned into separate query intents
- ONLY create query intents for genuine questions about stats/progress/trends, NOT for contextual statements
- Unknown/ambiguous text that is truly asking a question = { "type": "query", "question": "<original text>" }
- For "add"/"track"/"start" + habit name = add_habit intent.
- For "drop"/"stop"/"remove" + habit name = remove_habit intent.
- For "change goal"/"set target" = update_habit intent.
- For "how am I doing", "stats", "progress", "trend" = query intent.

GOAL-SETTING vs CHECK-IN (CRITICAL):
- "I want to drink 4 glasses of water" / "maybe 4 glasses?" / "my goal is 4" → add_habit with goal, NOT a check-in
- "I want to track X" / "I'd like to start X" / "can you help me with X" → add_habit, NOT a check-in
- "I want to improve X" / "I want to work on X" / "I want to get better at X" → add_habit (because if user doesn't have X yet, it should be added)
- "I drank 4 glasses" / "had 4 glasses" / "water 4" → check-in with value 4
- Key distinction: future tense / desire = add_habit. Past tense / completed = check-in.
- ONLY use update_habit when user explicitly says "change goal" / "set target" / "update X to Y"

CORRECTION INTENT:
- "That's wrong" / "I didn't actually..." / "No I didn't" / "Shouldn't that be..." / "Undo that" → correction
- User is disputing something previously recorded
- { "type": "correction", "claim": "<what user says is wrong>" }

AFFIRM INTENT:
- "yes" / "yeah" / "yep" / "sure" / "ok" / "okay" / "absolutely" / "let's do it" / "sounds good" / "go ahead" → affirm
- User is confirming or agreeing to something (e.g., welcome email confirmation)
- { "type": "affirm" }

Intent types: checkin, add_habit, remove_habit, update_habit, query, greeting, help, settings, correction, affirm

Output ONLY valid JSON matching this schema:
{
  "intents": [
    // checkin: { "type": "checkin", "entries": [{ "habit": "water", "status": "full", "value": 8, "unit": "glasses", "note": "optional" }] }
    // add_habit: { "type": "add_habit", "habits": [{ "name": "meditation", "unit": null, "goal": null }] }
    // remove_habit: { "type": "remove_habit", "habits": ["vitamins"] }
    // update_habit: { "type": "update_habit", "habit": "water", "goal": 10 }
    // query: { "type": "query", "scope": "week", "question": "how am I doing?" }
    // greeting: { "type": "greeting" }
    // help: { "type": "help" }
    // correction: { "type": "correction", "claim": "I didn't drink water today" }
    // affirm: { "type": "affirm" }
  ]
}

Output ONLY the JSON object. No markdown, no explanation, no code fences.`;

export interface ParserOptions {
  model?: string;
  baseUrl?: string;
  userHabits?: string[];  // user's active habit names for context
}

const DEFAULTS = {
  model: 'llama3.1:8b',
  baseUrl: 'http://localhost:11434',
};

export async function parseIntents(
  emailBody: string,
  opts?: ParserOptions
): Promise<{ result: ParseResult; latencyMs: number }> {
  const model = opts?.model ?? DEFAULTS.model;
  const baseUrl = opts?.baseUrl ?? DEFAULTS.baseUrl;

  const start = Date.now();

  // Build system prompt with user's habit context if available
  let systemPrompt = PARSER_SYSTEM_PROMPT;
  if (opts?.userHabits?.length) {
    systemPrompt += `\n\n=== USER'S ACTIVE HABITS ===
${opts.userHabits.join(', ')}

EXPANSION RULES (use the habits list above):
- "all good" / "everything" / "all done" → create FULL entries for EVERY habit listed above
- "everything but X" / "everything except X" / "all good except X" → FULL for all habits EXCEPT X (X gets SKIP)
- "No X or Y, but good otherwise" / "No X, everything else good" → SKIP for X and Y, FULL for all other habits
- "good otherwise" / "rest is good" → when combined with negations, expand to FULL for all non-negated habits

When you see these patterns, YOU MUST generate an entry for EACH habit in the list. Do not leave any out.`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: emailBody },
      ],
      stream: false,
      format: 'json',
      options: { temperature: 0 },
    }),
  });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { message: { content: string } };
  const latencyMs = Date.now() - start;
  const raw = data.message.content.trim();

  // Parse and validate
  let parsed: ParseResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try to extract JSON from possible markdown fences
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    if (match) {
      parsed = JSON.parse(match[1].trim());
    } else {
      throw new Error(`Failed to parse LLM output as JSON: ${raw.slice(0, 200)}`);
    }
  }

  // Ensure intents array exists
  if (!parsed.intents || !Array.isArray(parsed.intents)) {
    // Maybe the model returned a single intent at top level
    if ('type' in parsed) {
      parsed = { intents: [parsed as unknown as Intent] };
    } else {
      parsed = { intents: [{ type: 'greeting' }] };
    }
  }

  // Absorb invented "note" type into the last checkin entry
  const noteIntent = parsed.intents.find((i: any) => i.type === 'note');
  if (noteIntent && 'text' in noteIntent) {
    const checkin = parsed.intents.find(i => i.type === 'checkin');
    if (checkin && checkin.type === 'checkin' && checkin.entries.length > 0) {
      checkin.entries[checkin.entries.length - 1].note = (noteIntent as any).text;
    }
    parsed.intents = parsed.intents.filter((i: any) => i.type !== 'note');
  }

  // Merge multiple checkin intents into one
  const checkins = parsed.intents.filter(i => i.type === 'checkin');
  if (checkins.length > 1) {
    const merged = { type: 'checkin' as const, entries: checkins.flatMap(c => c.type === 'checkin' ? c.entries : []) };
    parsed.intents = [merged, ...parsed.intents.filter(i => i.type !== 'checkin')];
  }

  // Normalize habit names in all intents
  for (const intent of parsed.intents) {
    if (intent.type === 'checkin') {
      for (const entry of intent.entries ?? []) {
        entry.habit = entry.habit?.toLowerCase().trim();
        // Normalize status — default to "full" if not provided
        if (!entry.status || !['full', 'partial', 'skip'].includes(entry.status)) {
          // Infer from legacy done/value fields or default
          if ((entry as any).done === false || entry.status === 'skip') {
            entry.status = 'skip';
          } else if (entry.value !== undefined) {
            entry.status = entry.status === 'partial' ? 'partial' : 'full';
          } else {
            entry.status = 'full';
          }
        }
        // Clean up legacy field
        delete (entry as any).done;
      }
    }
    if (intent.type === 'add_habit') {
      for (const h of intent.habits ?? []) {
        h.name = h.name?.toLowerCase().trim();
      }
    }
    if (intent.type === 'remove_habit') {
      intent.habits = intent.habits?.map((h: string) => h.toLowerCase().trim()) ?? [];
    }
    if (intent.type === 'update_habit') {
      intent.habit = intent.habit?.toLowerCase().trim();
    }
  }

  return { result: parsed, latencyMs };
}
