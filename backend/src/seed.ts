import { createDb } from './db.js';

// Seed James as an active user with habits
function seed() {
  console.log('[seed] Creating database and seeding data...\n');
  
  const db = createDb();
  
  // Create James
  const email = 'james.montgomery179@gmail.com';
  const tier = 'free';
  
  // Check if user already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  
  let userId: string;
  if (existingUser) {
    console.log(`[seed] User ${email} already exists (ID: ${existingUser.id})`);
    userId = existingUser.id;
    
    // Update to ensure they're active
    db.prepare('UPDATE users SET tier = ? WHERE id = ?').run(tier, userId);
  } else {
    const result = db.prepare(
      'INSERT INTO users (email, display_name, tier) VALUES (?, ?, ?) RETURNING id'
    ).get(email, 'James', tier) as { id: string };
    userId = result.id;
    console.log(`[seed] Created user: ${email} (ID: ${userId})`);
  }
  
  // Create habits
  const habits = [
    { name: 'water', displayName: 'Water', unit: 'glasses', goal: 8 },
    { name: 'pullups', displayName: 'Pullups', unit: 'reps', goal: null },
    { name: 'power smile', displayName: 'Power Smile', unit: null, goal: null },
    { name: 'multivitamin', displayName: 'Multivitamin', unit: null, goal: null },
    { name: 'praise wife', displayName: 'Praise Wife', unit: null, goal: null },
  ];
  
  for (const habit of habits) {
    // Check if habit already exists
    const existing = db.prepare(
      'SELECT id FROM habits WHERE user_id = ? AND name = ?'
    ).get(userId, habit.name) as { id: string } | undefined;
    
    if (existing) {
      console.log(`[seed] Habit "${habit.name}" already exists`);
      // Update to ensure it's active
      db.prepare(
        'UPDATE habits SET active = 1, removed_at = NULL, display_name = ?, unit = ?, goal = ? WHERE id = ?'
      ).run(habit.displayName, habit.unit, habit.goal, existing.id);
    } else {
      db.prepare(
        'INSERT INTO habits (user_id, name, display_name, unit, goal) VALUES (?, ?, ?, ?, ?)'
      ).run(userId, habit.name, habit.displayName, habit.unit, habit.goal);
      console.log(`[seed] Created habit: ${habit.name}${habit.unit ? ` (${habit.unit})` : ''}${habit.goal ? ` goal: ${habit.goal}` : ''}`);
    }
  }
  
  // Verify
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const habitCount = db.prepare('SELECT COUNT(*) as count FROM habits WHERE user_id = ? AND active = 1').get(userId) as { count: number };
  
  console.log(`\n[seed] ✓ Database seeded successfully`);
  console.log(`[seed] Total users: ${userCount.count}`);
  console.log(`[seed] James's active habits: ${habitCount.count}`);
  
  db.close();
}

// Run seed
seed();
