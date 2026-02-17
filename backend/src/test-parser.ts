import { parseIntents } from './parser.js';

// ── Test cases: input → expected intents ──

interface HabitExpect {
  value?: number;
  status?: 'full' | 'partial' | 'skip';
}

interface TestCase {
  name: string;
  input: string;
  userHabits?: string[];  // active habits for context-dependent tests
  expect: {
    types: string[];
    habits?: Record<string, number | boolean | HabitExpect>;
    addedHabits?: string[];
    removedHabits?: string[];
    queryScope?: string;
  };
}

const JAMES_HABITS = ['water', 'pullups', 'praise wife', 'power smiles', 'multivitamin'];

const TESTS: TestCase[] = [
  // ── Basic check-ins ──
  {
    name: 'simple numeric check-in',
    input: 'water 8 glasses, pullups 12',
    expect: {
      types: ['checkin'],
      habits: { water: 8, pullups: 12 },
    },
  },
  {
    name: 'boolean check-in',
    input: 'took vitamins, did meditation',
    expect: {
      types: ['checkin'],
      habits: { vitamins: true, meditation: true },
    },
  },
  {
    name: 'mixed numeric and boolean',
    input: 'water 6, pullups 10, took vitamin',
    expect: {
      types: ['checkin'],
      habits: { water: 6, pullups: 10 },
    },
  },
  {
    name: 'single habit check-in',
    input: 'ran 3 miles',
    expect: {
      types: ['checkin'],
      habits: { running: 3 },
    },
  },

  // ── CRUD operations ──
  {
    name: 'add single habit',
    input: 'track meditation',
    expect: {
      types: ['add_habit'],
      addedHabits: ['meditation'],
    },
  },
  {
    name: 'add multiple habits',
    input: 'start tracking yoga and journaling',
    expect: {
      types: ['add_habit'],
      addedHabits: ['yoga', 'journaling'],
    },
  },
  {
    name: 'remove habit',
    input: 'stop tracking vitamins',
    expect: {
      types: ['remove_habit'],
      removedHabits: ['vitamins'],
    },
  },
  {
    name: 'update habit goal',
    input: 'change water goal to 10 glasses',
    expect: {
      types: ['update_habit'],
    },
  },

  // ── Multi-intent ──
  {
    name: 'checkin + add + remove + query',
    input: 'water 8, drop vitamins, add yoga, how was my week?',
    expect: {
      types: ['checkin', 'remove_habit', 'add_habit', 'query'],
      habits: { water: 8 },
      removedHabits: ['vitamins'],
      addedHabits: ['yoga'],
    },
  },
  {
    name: 'add then immediately check in',
    input: 'add meditation, meditation 20 minutes',
    expect: {
      types: ['add_habit', 'checkin'],
      addedHabits: ['meditation'],
      habits: { meditation: 20 },
    },
  },

  // ── Queries ──
  {
    name: 'weekly progress query',
    input: 'how am I doing this week?',
    expect: {
      types: ['query'],
    },
  },
  {
    name: 'trend query',
    input: 'what are my pullup trends?',
    expect: {
      types: ['query'],
    },
  },

  // ── Edge cases ──
  {
    name: 'greeting',
    input: 'hey',
    expect: {
      types: ['greeting'],
    },
  },
  {
    name: 'skip day',
    input: 'skip',
    expect: {
      types: ['greeting'],
    },
  },
  {
    name: 'help request',
    input: 'what can you do?',
    expect: {
      types: ['help'],
    },
  },
  {
    name: 'natural language checkin',
    input: 'drank about 7 glasses of water today and did 15 pullups. also walked for 30 min',
    expect: {
      types: ['checkin'],
      habits: { water: 7, pullups: 15 },
    },
  },
  {
    name: 'checkin with note',
    input: 'pullups 8, back was hurting today',
    expect: {
      types: ['checkin'],
      habits: { pullups: 8 },
    },
  },
  {
    name: 'empty/minimal',
    input: '.',
    expect: {
      types: ['greeting'],
    },
  },

  // ── Status enum tests ──
  {
    name: 'skip explicit',
    input: 'skipped water today, no pullups',
    expect: {
      types: ['checkin'],
      habits: { water: { status: 'skip' }, pullups: { status: 'skip' } },
    },
  },
  {
    name: 'partial check-in',
    input: 'some water, a few pullups',
    expect: {
      types: ['checkin'],
      habits: { water: { status: 'partial' }, pullups: { status: 'partial' } },
    },
  },
  {
    name: 'mixed status',
    input: 'water 8, skipped pullups, some meditation',
    expect: {
      types: ['checkin'],
      habits: {
        water: { value: 8, status: 'full' },
        pullups: { status: 'skip' },
        meditation: { status: 'partial' },
      },
    },
  },

  // ── Real user data (James's habit replies) ──
  {
    name: 'real: mixed beverages + late + negatives + query',
    input: 'Had water, soda, tea. Power smile and vitamin late. Praised wife for party planning. No pullups Give me a recap of our habits so far',
    userHabits: JAMES_HABITS,
    expect: {
      types: ['checkin', 'query'],
      habits: {
        water: { status: 'full' },
        pullups: { status: 'skip' },
      },
    },
  },
  {
    name: 'real: all good',
    userHabits: JAMES_HABITS,
    input: 'All good',
    expect: {
      types: ['checkin'],
    },
  },
  {
    name: 'real: everything but X',
    userHabits: JAMES_HABITS,
    input: 'Everything yesterday. Everything but pullups today',
    expect: {
      types: ['checkin'],
      habits: {
        pullups: { status: 'skip' },
      },
    },
  },
  {
    name: 'real: everything with partial',
    userHabits: JAMES_HABITS,
    input: 'Everything; just a few pullups',
    expect: {
      types: ['checkin'],
      habits: {
        pullups: { status: 'partial' },
      },
    },
  },
  {
    name: 'real: terse mixed list',
    userHabits: JAMES_HABITS,
    input: 'Water tea and soda No pullups Praised No smile Had vitamin',
    expect: {
      types: ['checkin'],
      habits: {
        water: { status: 'full' },
        pullups: { status: 'skip' },
      },
    },
  },
  {
    name: 'real: negatives with good otherwise',
    userHabits: JAMES_HABITS,
    input: 'No power smile or pullups, but good otherwise',
    expect: {
      types: ['checkin'],
      habits: {
        pullups: { status: 'skip' },
      },
    },
  },
  {
    name: 'real: not yet',
    userHabits: JAMES_HABITS,
    input: 'No pullups or vitamins yet',
    expect: {
      types: ['checkin'],
      habits: {
        pullups: { status: 'skip' },
      },
    },
  },

  // ── Shorthand / typos ──
  {
    name: 'shorthand habits',
    input: 'h2o 8, pups 10',
    expect: {
      types: ['checkin'],
    },
  },
  {
    name: 'negatives',
    input: "didn't drink water, no pullups today",
    expect: {
      types: ['checkin'],
      habits: { water: { status: 'skip' }, pullups: { status: 'skip' } },
    },
  },

  // ── Emotional context ──
  {
    name: 'rough day with note',
    input: 'rough day, only 3 glasses of water. skipped everything else',
    expect: {
      types: ['checkin'],
      habits: { water: { value: 3, status: 'partial' } },
    },
  },
];

// ── Runner ──

interface TestResult {
  name: string;
  pass: boolean;
  latencyMs: number;
  details: string;
  raw?: string;
}

async function runTests(model?: string): Promise<void> {
  const modelName = model ?? 'llama3.1:8b';
  console.log(`\n🧪 Intent Parser Test Suite — model: ${modelName}\n`);
  console.log('='.repeat(70));

  const results: TestResult[] = [];

  for (const test of TESTS) {
    process.stdout.write(`  ${test.name}... `);

    try {
      const { result, latencyMs } = await parseIntents(test.input, {
        model: modelName,
        userHabits: test.userHabits,
      });
      const intents = result.intents;

      // Check intent types
      const actualTypes = intents.map(i => i.type).sort();
      const expectedTypes = [...test.expect.types].sort();
      const typesMatch = JSON.stringify(actualTypes) === JSON.stringify(expectedTypes);

      // Check habits (for checkin intents)
      let habitsMatch = true;
      let habitDetails = '';
      if (test.expect.habits) {
        const checkinIntent = intents.find(i => i.type === 'checkin');
        if (checkinIntent && checkinIntent.type === 'checkin') {
          for (const [habit, expected] of Object.entries(test.expect.habits)) {
            const entry = checkinIntent.entries.find(
              e => e.habit === habit || e.habit?.includes(habit)
            );
            if (!entry) {
              habitsMatch = false;
              habitDetails += ` missing:${habit}`;
            } else if (typeof expected === 'number' && entry.value !== expected) {
              habitsMatch = false;
              habitDetails += ` ${habit}:got ${entry.value} want ${expected}`;
            } else if (typeof expected === 'object' && expected !== null) {
              const exp = expected as HabitExpect;
              if (exp.value !== undefined && entry.value !== exp.value) {
                habitsMatch = false;
                habitDetails += ` ${habit}:val got ${entry.value} want ${exp.value}`;
              }
              if (exp.status && entry.status !== exp.status) {
                habitsMatch = false;
                habitDetails += ` ${habit}:status got ${entry.status} want ${exp.status}`;
              }
            }
          }
        } else {
          habitsMatch = false;
          habitDetails = ' no checkin intent found';
        }
      }

      // Check added habits
      let addMatch = true;
      if (test.expect.addedHabits) {
        const addIntent = intents.find(i => i.type === 'add_habit');
        if (addIntent && addIntent.type === 'add_habit') {
          const actual = addIntent.habits.map(h => h.name.toLowerCase());
          for (const expected of test.expect.addedHabits) {
            if (!actual.some(a => a.includes(expected.toLowerCase()))) {
              addMatch = false;
              habitDetails += ` missing add:${expected}`;
            }
          }
        } else {
          addMatch = false;
          habitDetails += ' no add_habit intent';
        }
      }

      // Check removed habits
      let removeMatch = true;
      if (test.expect.removedHabits) {
        const removeIntent = intents.find(i => i.type === 'remove_habit');
        if (removeIntent && removeIntent.type === 'remove_habit') {
          const actual = removeIntent.habits.map(h => h.toLowerCase());
          for (const expected of test.expect.removedHabits) {
            if (!actual.some(a => a.includes(expected.toLowerCase()))) {
              removeMatch = false;
              habitDetails += ` missing remove:${expected}`;
            }
          }
        } else {
          removeMatch = false;
          habitDetails += ' no remove_habit intent';
        }
      }

      const pass = typesMatch && habitsMatch && addMatch && removeMatch;

      const detail = pass
        ? `✅ ${latencyMs}ms`
        : `❌ types:${typesMatch ? '✓' : `✗ got [${actualTypes}]`}${habitDetails}`;

      console.log(detail);

      results.push({
        name: test.name,
        pass,
        latencyMs,
        details: detail,
        raw: JSON.stringify(intents),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`💥 ${msg.slice(0, 100)}`);
      results.push({ name: test.name, pass: false, latencyMs: 0, details: `ERROR: ${msg}` });
    }
  }

  // ── Summary ──
  console.log('\n' + '='.repeat(70));
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const avgLatency = Math.round(results.filter(r => r.latencyMs > 0).reduce((s, r) => s + r.latencyMs, 0) / results.filter(r => r.latencyMs > 0).length);

  console.log(`\n📊 Results: ${passed}/${total} passed (${Math.round(passed/total*100)}%)`);
  console.log(`⏱️  Avg latency: ${avgLatency}ms`);
  console.log(`🤖 Model: ${modelName}\n`);

  if (passed < total) {
    console.log('Failed tests:');
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  ❌ ${r.name}: ${r.details}`);
      if (r.raw) console.log(`     Raw: ${r.raw.slice(0, 200)}`);
    }
  }
}

// Run with optional model arg
const model = process.argv[2];
runTests(model);
