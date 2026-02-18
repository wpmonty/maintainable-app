/**
 * Reset user state for testing.
 * Wipes users, habits, checkins, emails — but preserves inbound_emails
 * dedup state so old emails don't get reprocessed.
 *
 * Usage: npx tsx src/reset.ts [--full]
 *   default: wipe user data only (keep email dedup)
 *   --full:  wipe everything including email dedup (will reprocess all inbox emails!)
 */

import { createDb } from './db.js';

const fullReset = process.argv.includes('--full');
const db = createDb();

console.log(`\n🗑️  Maintainable App — ${fullReset ? 'FULL' : 'User Data'} Reset\n`);

// Show current state
const userCount = (db.prepare('SELECT COUNT(*) as n FROM users').get() as any).n;
const habitCount = (db.prepare('SELECT COUNT(*) as n FROM habits').get() as any).n;
const checkinCount = (db.prepare('SELECT COUNT(*) as n FROM checkins').get() as any).n;
const emailCount = (db.prepare('SELECT COUNT(*) as n FROM emails').get() as any).n;
const inboundCount = (db.prepare('SELECT COUNT(*) as n FROM inbound_emails').get() as any).n;

console.log(`Current state:`);
console.log(`  Users: ${userCount}`);
console.log(`  Habits: ${habitCount}`);
console.log(`  Check-ins: ${checkinCount}`);
console.log(`  Emails (app log): ${emailCount}`);
console.log(`  Inbound emails (dedup): ${inboundCount}`);

// Wipe user data
db.exec('DELETE FROM checkins');
db.exec('DELETE FROM emails');
db.exec('DELETE FROM habits');
db.exec('DELETE FROM users');
console.log(`\n✓ Wiped users, habits, checkins, email logs`);

if (fullReset) {
  db.exec('DELETE FROM inbound_emails');
  console.log(`✓ Wiped inbound email dedup (⚠️  old emails will be reprocessed!)`);
} else {
  console.log(`✓ Kept inbound email dedup (${inboundCount} entries — old emails won't replay)`);
}

console.log(`\n✅ Reset complete. Next email to hello@maintainable.app will create a fresh user.\n`);

db.close();
