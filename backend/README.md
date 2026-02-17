# Maintainable Email Service

Standalone email-based habit tracking service. Polls IMAP for emails, processes them through the intent parser → executor → context builder → response generator pipeline, and sends replies via SMTP.

## Architecture

```
Email arrives → IMAP Poll → Parse Intents → Execute → Build Context → Generate Response → SMTP Send
```

### Components

1. **`src/email-client.ts`** - IMAP/SMTP email operations
   - Polls IMAP every 30 seconds for new emails
   - Tracks seen Message-IDs to avoid reprocessing (stored in `data/seen_ids.json`)
   - Sends replies via SMTP
   - Parses email headers and strips HTML to plain text

2. **`src/pipeline.ts`** - Orchestrates the full email→response flow
   - Looks up or creates user by email address
   - Handles new user onboarding (welcome emails or first check-in augmentation)
   - Parses intents with user's habit context
   - Executes intents against database
   - Builds structured context from DB
   - Generates response using LLM
   - Logs all emails in database

3. **`src/server.ts`** - Main entry point
   - Initializes SQLite database
   - Starts IMAP polling daemon (runs continuously)
   - Express HTTP server on port 9800
   - Endpoints:
     - `GET /health` - Health check
     - `POST /webhook/payment` - Payment webhook (stubbed)
   - Graceful shutdown on SIGINT/SIGTERM

4. **`src/seed.ts`** - Seed test data
   - Creates James as active user (tier: free)
   - Creates his 5 habits: water, pullups, power smile, multivitamin, praise wife

## Configuration

Email credentials are read from: `/Users/davis/.openclaw/credentials/maintainable-email.json`

```json
{
  "email": "hello@maintainable.app",
  "password": "...",
  "imap": {
    "host": "mail.privateemail.com",
    "port": 993,
    "ssl": true
  },
  "smtp": {
    "host": "mail.privateemail.com",
    "port": 465,
    "ssl": true
  }
}
```

## Setup

```bash
# Install dependencies
npm install

# Seed test data (creates James + habits)
npx tsx src/seed.ts

# Start server
npx tsx src/server.ts
```

## Testing

```bash
# Health check
curl http://localhost:9800/health

# Expected output:
# {
#   "status": "ok",
#   "service": "maintainable-backend",
#   "timestamp": "2026-02-17T15:40:55.987Z",
#   "polling": true
# }
```

## How It Works

1. **Email arrives** at hello@maintainable.app
2. **IMAP daemon** polls every 30 seconds, finds new emails
3. **Pipeline processes**:
   - Looks up user by sender email (creates if new)
   - New users get welcome email or augmented first check-in response
   - Existing users: parse intents → execute → build context → generate response
4. **Response sent** via SMTP as reply to original email
5. **Everything logged** in SQLite database

## Models

- **Parser**: `llama3.1:8b` (via Ollama at http://127.0.0.1:11434)
- **Response Gen**: `mistral-nemo` (via Ollama at http://127.0.0.1:11434)

## Database

SQLite database created at `data/maintainable.db` with tables:
- `users` - User accounts
- `habits` - User habits (with soft-delete)
- `checkins` - Daily habit check-ins
- `emails` - All incoming/outgoing emails
- `payments` - Payment records (unused in MVP)

## Dependencies

- `express` - HTTP server
- `imap-simple` - IMAP client
- `nodemailer` - SMTP client
- `mailparser` - Email parsing
- `better-sqlite3` - Database

## MVP Notes

- NO credits system - all users get unlimited access
- Email replies have no signoff for check-in responses
- System/welcome emails sign off with "Talk soon 🌱"
- Completely independent of OpenClaw (no imports, no shared code)
- Resilient: catches errors, logs them, keeps polling

## Files Created

✅ `src/email-client.ts` - IMAP/SMTP operations  
✅ `src/pipeline.ts` - Email processing pipeline  
✅ `src/server.ts` - Main entry point  
✅ `src/seed.ts` - Test data seeding  

All existing files remain unchanged.
