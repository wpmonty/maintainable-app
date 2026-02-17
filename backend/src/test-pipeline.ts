import { createDb, getOrCreateUser, getUserHabits } from './db.js';
import { parseIntents } from './parser.js';
import { validateParseResult } from './validation.js';
import { executeIntents } from './executor.js';
import { buildStructuredContext } from './context-builder.js';
import { generateResponse } from './response-gen.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unlinkSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = join(__dirname, '..', 'data', 'test-pipeline.db');

// Clean slate
if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);

const db = createDb(TEST_DB_PATH);

// ── Seed test data ──

function seedUser() {
  const { id } = getOrCreateUser(db, 'james@test.com');
  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run('James', id);

  // Add habits with goals
  const habits = [
    { name: 'water', unit: 'glasses', goal: 8 },
    { name: 'pullups', unit: 'reps', goal: null },
    { name: 'praise wife', unit: null, goal: null },
    { name: 'power smiles', unit: null, goal: null },
    { name: 'multivitamin', unit: null, goal: null },
  ];

  for (const h of habits) {
    db.prepare(
      'INSERT OR IGNORE INTO habits (user_id, name, display_name, unit, goal) VALUES (?, ?, ?, ?, ?)'
    ).run(id, h.name, h.name, h.unit, h.goal);
  }

  // Seed some history (last 5 days)
  const today = new Date();
  for (let i = 5; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const userHabits = getUserHabits(db, id);
    for (const habit of userHabits) {
      // Simulate some variance
      const skip = Math.random() < 0.15;
      if (skip) continue;

      const value = habit.unit === 'glasses' ? Math.floor(Math.random() * 4) + 5 :
                    habit.unit === 'reps' ? Math.floor(Math.random() * 10) + 5 : null;
      const done = value !== null ? null : 1;

      db.prepare(
        'INSERT OR IGNORE INTO checkins (user_id, habit_id, date, value, status, done) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, habit.id, dateStr, value, 'full', done ?? 1);
    }
  }

  return id;
}

// ── Pipeline test cases ──

interface PipelineTest {
  name: string;
  email: string;
}

const TESTS: PipelineTest[] = [
  {
    name: 'Simple check-in',
    email: 'water 8, pullups 12',
  },
  {
    name: 'Multi-intent: checkin + remove + query',
    email: "water 8, drop multivitamin, how's my week?",
  },
  {
    name: 'Real user: negatives with good otherwise',
    email: 'No power smile or pullups, but good otherwise',
  },
  {
    name: 'Real user: everything with partial',
    email: 'Everything; just a few pullups',
  },
  {
    name: 'Greeting',
    email: 'hey',
  },
];

// ── Run ──

async function runPipeline() {
  console.log('\n🔬 Full Pipeline Test\n');
  console.log('='.repeat(70));

  const userId = seedUser();
  const today = new Date().toISOString().split('T')[0];
  const habits = getUserHabits(db, userId);
  const habitNames = habits.map(h => h.name);

  console.log(`\nSeeded user: James (${habits.length} habits, 5 days history)`);
  console.log(`Habits: ${habitNames.join(', ')}\n`);

  for (const test of TESTS) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📧 Test: ${test.name}`);
    console.log(`   Input: "${test.email}"`);
    console.log();

    try {
      // Step 1: Parse
      console.log('  ┌─ CALL 1: Intent Parser (llama3.1:8b)');
      const { result: parsed, latencyMs: parseMs } = await parseIntents(test.email, {
        model: 'llama3.1:8b',
        userHabits: habitNames,
      });
      const { valid, errors } = validateParseResult(parsed);

      console.log(`  │  Intents: ${JSON.stringify(valid.intents.map(i => i.type))}`);
      if (valid.intents.some(i => i.type === 'checkin')) {
        const checkin = valid.intents.find(i => i.type === 'checkin');
        if (checkin?.type === 'checkin') {
          for (const e of checkin.entries) {
            console.log(`  │    ${e.habit}: ${e.value ?? ''} [${e.status}]${e.note ? ' note: ' + e.note : ''}`);
          }
        }
      }
      if (errors.length > 0) {
        console.log(`  │  ⚠️  Validation errors: ${errors.map(e => e.message).join(', ')}`);
      }
      console.log(`  │  ⏱️  ${parseMs}ms`);
      console.log('  │');

      // Step 2: Execute
      console.log('  ├─ EXECUTE (deterministic)');
      const results = executeIntents(db, userId, valid.intents, today);
      for (const r of results) {
        console.log(`  │  ${r.success ? '✅' : '❌'} ${r.detail}`);
      }
      console.log('  │');

      // Step 3: Build context
      console.log('  ├─ STRUCTURED CONTEXT');
      const context = buildStructuredContext(db, userId, today, results, test.email);
      // Print abbreviated context
      const contextLines = context.split('\n');
      for (const line of contextLines.slice(0, 15)) {
        console.log(`  │  ${line}`);
      }
      if (contextLines.length > 15) {
        console.log(`  │  ... (${contextLines.length - 15} more lines)`);
      }
      console.log('  │');

      // Step 4: Response gen
      console.log('  ├─ CALL 2: Response Gen (mistral-nemo)');
      const { response, latencyMs: responseMs } = await generateResponse(context);
      console.log(`  │  ⏱️  ${responseMs}ms`);
      console.log('  │');
      console.log('  └─ 📤 RESPONSE:');
      console.log();
      // Indent response
      for (const line of response.split('\n')) {
        console.log(`     ${line}`);
      }
      console.log();
      console.log(`  Total: ${parseMs + responseMs}ms (parse: ${parseMs}ms + response: ${responseMs}ms)`);

    } catch (err) {
      console.log(`  💥 ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Pipeline test complete.\n');

  // Cleanup
  db.close();
}

runPipeline();
