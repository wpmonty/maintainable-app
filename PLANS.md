# maintainable.app — Technical Plans

## Architecture

### Core Concept
Email-based habit tracker powered by AI. User sends a check-in email → AI responds with context-aware encouragement. All state lives server-side.

### Backend (shared with mailbox-ai)
- **Framework:** NestJS + TypeScript
- **Database:** SQLite via better-sqlite3
- **LLM:** Ollama (local) for development, cloud models for production
- **Email:** Inbound via IMAP polling, outbound via SMTP (Proton Bridge for now, custom domain later)

### Multi-Vertical Architecture
maintainable.app is one vertical of a shared backend. The same service can power multiple domains with different branding and system prompts.

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ maintainable.app│  │  [journal].app  │  │  [sobriety].app │
│  Habit Tracker  │  │    Journaling   │  │   Check-ins     │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └──────────┬─────────┘────────────────────┘
                    │
         ┌──────────▼──────────┐
         │    Shared Backend   │
         │  NestJS + SQLite    │
         │  + Ollama / Cloud   │
         └─────────────────────┘
```

What changes per vertical:
- Landing page (site/)
- System prompt (what the AI "knows")
- Check-in schedule (daily, weekly, etc.)
- Pricing tiers
- Domain + email address

What stays the same:
- Backend code
- Database schema (with `vertical` column)
- LLM pipeline
- Email handling
- Payment processing

### Database Schema (Draft)

```sql
-- Users identified by email, associated with a vertical
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  vertical TEXT NOT NULL DEFAULT 'habits',
  tier TEXT NOT NULL DEFAULT 'free',
  credits_remaining INTEGER NOT NULL DEFAULT 5,
  created_at TEXT NOT NULL,
  last_checkin_at TEXT,
  UNIQUE(email, vertical)
);

-- Check-in history (the AI's memory)
CREATE TABLE checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,       -- raw email body
  response TEXT NOT NULL,      -- AI response
  latency_ms INTEGER,
  created_at TEXT NOT NULL
);

-- Payment records
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_usd REAL NOT NULL,
  credits_purchased INTEGER NOT NULL,
  tx_hash TEXT,                -- crypto transaction
  created_at TEXT NOT NULL
);
```

### System Prompt (Habit Tracker Vertical)

```
You are a friendly, encouraging habit tracker assistant. The user emails you daily with their habit check-ins. You respond with:
1. Acknowledgment of what they did today
2. Brief reference to their recent patterns (if you can see history)
3. One short encouraging or motivating note
4. If they missed something, gentle nudge — never guilt

Keep responses under 150 words. Be warm but not saccharine. Sound like a friend who actually cares, not a corporate wellness app.
```

This prompt is per-vertical. A journaling vertical would have a completely different prompt focused on reflection and emotional processing.

## Model Strategy

### Development
- Ollama with local models (mistral-nemo, llama3.1, qwen3)
- Smoke tests validate quality per model (see smoke-test/)

### Production
- Start with cheapest model that passes quality bar
- Escalate to better models for paying tiers if needed
- Monitor: response quality, latency, cost per check-in

### Smoke Test Results
Results stored in `../mailbox-ai/smoke-test/results-*.json`
- mistral-nemo: baseline model
- llama3.1:8b: alternative
- qwen3:8b: alternative

## Roadmap

### Phase 0: Validate (NOW)
- [x] Smoke test with 50 simulated days
- [x] Marketing site
- [x] Marketing plan + segments
- [ ] Run smoke tests on all 3 models
- [ ] Pick production model based on results

### Phase 1: MVP
- [ ] Email ingestion (IMAP polling)
- [ ] User identification by sender address
- [ ] Context window: load last N check-ins as conversation history
- [ ] Response generation via Ollama
- [ ] SMTP reply
- [ ] Free tier (5 check-ins, no payment required)
- [ ] Custom domain email (habits@maintainable.app)

### Phase 2: Payments
- [ ] Crypto payment detection (Lobster Wallet MCP integration)
- [ ] Credit system (purchase blocks, decrement on use)
- [ ] Payment confirmation email
- [ ] Tier enforcement (free → paid cutoff)

### Phase 3: Polish
- [ ] Response quality tuning (prompt iteration)
- [ ] Milestone detection (day 7, 14, 30, etc.)
- [ ] Pattern recognition ("you always skip Mondays")
- [ ] Weekly summary email (optional)
- [ ] Re-engagement emails for inactive users

### Phase 4: Multi-Vertical
- [ ] Vertical config system (domain → prompt + settings)
- [ ] Second vertical launch (journaling or medication tracking)
- [ ] Shared admin dashboard

## Infrastructure

### Current (Development)
- Mac mini (M4, 16GB) running Ollama
- Proton Bridge for email
- SQLite for storage
- No external dependencies

### Production (Future)
- VPS with GPU access (or cloud LLM API)
- Custom domain with proper MX records
- Object storage for email archives (optional)
- Monitoring + alerting

## Cost Model

### Per Check-in Cost
- Local Ollama: ~$0.00 (electricity only)
- Cloud LLM (Haiku-tier): ~$0.002
- Cloud LLM (Sonnet-tier): ~$0.015
- Email sending: ~$0.001

### Revenue per check-in: $0.07-0.10

**Margin at scale with cloud LLM:** 85-97% depending on model tier.

## Open Questions
- Domain registrar? (maintainable.app availability + price)
- Email provider for production? (Google Workspace, Proton Business, Fastmail, self-hosted)
- Do we need a web dashboard at all? Or pure email?
- Weekly digest format — automatic or opt-in?
- What happens when a user emails from a different address?
