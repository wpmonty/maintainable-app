import Database from 'better-sqlite3';
import { EmailClient } from './email-client.js';
import { getUserHabits } from './db.js';

/**
 * Daily check-in reminder scheduler.
 * 
 * Sends a reminder email to each user at their preferred time (default 9 PM CST).
 * Runs as a loop inside the server process, checking every minute.
 * 
 * Backlogged:
 * - Per-user timezone preference
 * - Per-user reminder count + time of day
 * - Quiet mode / do-not-disturb
 */

const DEFAULT_REMINDER_HOUR = 21; // 9 PM
const DEFAULT_TIMEZONE = 'America/Chicago';
const CHECK_INTERVAL_MS = 60_000; // Check every minute

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  preferences: string;
  last_checkin_at: string | null;
}

interface SchedulerOptions {
  db: Database.Database;
  emailClient: EmailClient;
  log: (level: 'info' | 'warn' | 'error', component: string, message: string, extra?: any) => void;
}

export class CheckinScheduler {
  private db: Database.Database;
  private emailClient: EmailClient;
  private log: SchedulerOptions['log'];
  private active = true;
  private sentToday: Set<string> = new Set(); // user IDs already reminded today
  private currentDay: string = ''; // track day rollover

  constructor(opts: SchedulerOptions) {
    this.db = opts.db;
    this.emailClient = opts.emailClient;
    this.log = opts.log;
  }

  /**
   * Start the scheduler loop.
   */
  async start(): Promise<void> {
    this.log('info', 'scheduler', 'Daily check-in scheduler started');

    while (this.active) {
      try {
        await this.tick();
      } catch (error: any) {
        this.log('error', 'scheduler', `Scheduler error: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
    }
  }

  stop(): void {
    this.active = false;
  }

  private async tick(): Promise<void> {
    const now = new Date();
    const today = this.getDateInTz(now, DEFAULT_TIMEZONE);
    const hour = this.getHourInTz(now, DEFAULT_TIMEZONE);

    // Day rollover — reset sent tracking
    if (today !== this.currentDay) {
      this.sentToday.clear();
      this.currentDay = today;
      this.log('info', 'scheduler', `New day: ${today}`);
    }

    // Only send during the reminder hour
    if (hour !== DEFAULT_REMINDER_HOUR) return;

    // Get all users who haven't been reminded today
    const users = this.db.prepare(
      'SELECT id, email, display_name, preferences, last_checkin_at FROM users'
    ).all() as UserRow[];

    for (const user of users) {
      if (this.sentToday.has(user.id)) continue;

      // Check if user has any active habits (don't remind if no habits set up)
      const habits = getUserHabits(this.db, user.id);
      if (habits.length === 0) continue;

      // Check if they already checked in today
      const todayCheckin = this.db.prepare(
        'SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND date = ?'
      ).get(user.id, today) as { count: number };

      // Build reminder message
      const name = user.display_name || user.email.split('@')[0];
      const habitNames = habits.map(h => h.display_name || h.name);
      
      let body: string;
      if (todayCheckin.count > 0) {
        // Already checked in — send encouragement, not a nag
        body = `Hey ${name}! You already checked in today — nice work. If you did anything else, just reply with an update. Otherwise, see you tomorrow!`;
      } else {
        // No check-in yet — gentle reminder
        body = `Hey ${name}! How did today go?\n\nYour habits: ${habitNames.join(', ')}\n\nJust reply with what you did — like "${habitNames[0]} done${habitNames.length > 1 ? ', ' + habitNames[1] + ' done' : ''}" or whatever feels natural.`;
      }

      try {
        await this.emailClient.sendFresh(
          user.email,
          `Daily check-in — ${this.formatDate(today)}`,
          body
        );
        this.sentToday.add(user.id);
        this.log('info', 'scheduler', `Reminder sent to ${user.email}`, { 
          habits: habits.length,
          alreadyCheckedIn: todayCheckin.count > 0 
        });
      } catch (error: any) {
        this.log('error', 'scheduler', `Failed to send reminder to ${user.email}: ${error.message}`);
      }
    }
  }

  private getDateInTz(date: Date, tz: string): string {
    return date.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD format
  }

  private getHourInTz(date: Date, tz: string): number {
    return parseInt(date.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }));
  }

  private formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`; // MM/DD/YY
  }
}
