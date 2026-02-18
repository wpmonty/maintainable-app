import express from 'express';
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createDb } from './db.js';
import { EmailClient } from './email-client.js';
import { processPipelineEmail } from './pipeline.js';
import type { EmailConfig } from './email-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const PORT = 9810;
const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds
const CREDENTIALS_PATH = '/Users/davis/.openclaw/credentials/maintainable-email.json';
const LOG_PATH = join(__dirname, '..', 'data', 'server.log');

// ── Logging ──
mkdirSync(dirname(LOG_PATH), { recursive: true });

function log(level: 'info' | 'warn' | 'error', component: string, message: string, extra?: any) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    component,
    message,
    ...(extra ? { extra } : {}),
  };
  const line = JSON.stringify(entry);
  console.log(line);
  try {
    appendFileSync(LOG_PATH, line + '\n');
  } catch {}
}

// ── Crash handlers ──
process.on('uncaughtException', (err) => {
  log('error', 'process', 'Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  log('error', 'process', 'Unhandled rejection', {
    error: reason?.message || String(reason),
    stack: reason?.stack,
  });
  // Don't exit — let the polling loop continue
});

// Load email credentials
function loadCredentials(): EmailConfig {
  try {
    const raw = readFileSync(CREDENTIALS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error: any) {
    log('error', 'config', `Failed to load credentials: ${error.message}`);
    process.exit(1);
  }
}

// Initialize components
const db = createDb();
const emailConfig = loadCredentials();
const emailClient = new EmailClient(emailConfig, db);

// Track stats
let stats = {
  startedAt: new Date().toISOString(),
  emailsProcessed: 0,
  emailsFailed: 0,
  lastPollAt: null as string | null,
  lastEmailAt: null as string | null,
  lastError: null as string | null,
};

// Email polling daemon
let pollingActive = true;

async function emailDaemon() {
  log('info', 'daemon', 'Starting email polling daemon');
  
  // Test IMAP connection on startup
  const connected = await emailClient.testConnection();
  if (!connected) {
    log('error', 'daemon', 'IMAP connection failed on startup. Exiting.');
    process.exit(1);
  }

  while (pollingActive) {
    stats.lastPollAt = new Date().toISOString();
    try {
      const newEmails = await emailClient.pollNewEmails();
      
      if (newEmails.length > 0) {
        log('info', 'daemon', `Found ${newEmails.length} new email(s)`);
        
        for (const email of newEmails) {
          try {
            // Update status to 'processing'
            db.prepare(`
              UPDATE inbound_emails 
              SET status = 'processing' 
              WHERE message_id = ?
            `).run(email.messageId);

            const result = await processPipelineEmail({ db, email });
            
            if (result.shouldReply) {
              await emailClient.sendReply(
                email.from,
                result.replySubject,
                result.replyBody,
                email.messageId
              );
              log('info', 'daemon', `Reply sent to ${email.from}`, { subject: email.subject });
            }

            // Update status to 'replied' with processed timestamp
            db.prepare(`
              UPDATE inbound_emails 
              SET status = 'replied', processed_at = datetime('now') 
              WHERE message_id = ?
            `).run(email.messageId);

            stats.emailsProcessed++;
            stats.lastEmailAt = new Date().toISOString();
          } catch (error: any) {
            // Update status to 'failed' with error message
            db.prepare(`
              UPDATE inbound_emails 
              SET status = 'failed', error = ?, processed_at = datetime('now') 
              WHERE message_id = ?
            `).run(error.message, email.messageId);

            stats.emailsFailed++;
            stats.lastError = `${error.message} (${new Date().toISOString()})`;
            log('error', 'pipeline', `Error processing email from ${email.from}`, {
              error: error.message,
              stack: error.stack,
            });
          }
        }
      }
    } catch (error: any) {
      stats.lastError = `${error.message} (${new Date().toISOString()})`;
      log('error', 'daemon', `Polling error: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// Start email daemon in background
emailDaemon().catch(error => {
  log('error', 'daemon', `Fatal error: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

// Express HTTP server
const app = express();
app.use(express.json());

// Health check endpoint (enriched)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'maintainable-backend',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    ...stats,
  });
});

// Payment webhook endpoint (stubbed)
app.post('/webhook/payment', (req, res) => {
  log('info', 'webhook', 'Received payment webhook', { body: req.body });
  res.json({ received: true });
});

// Start HTTP server
app.listen(PORT, () => {
  log('info', 'server', `HTTP server listening on port ${PORT}`);
  log('info', 'server', `Email polling active (every ${POLL_INTERVAL_MS / 1000}s)`);
  log('info', 'server', `Monitoring: ${emailConfig.email}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('info', 'server', 'Shutting down (SIGINT)');
  pollingActive = false;
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('info', 'server', 'Shutting down (SIGTERM)');
  pollingActive = false;
  db.close();
  process.exit(0);
});
