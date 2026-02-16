# maintainable.app — Marketing Plan

## 1. Executive Summary

maintainable.app is an email-based habit tracker. No app, no account — just email what you did today and get an AI response that remembers your entire history. It notices patterns, celebrates milestones, and gently nudges on missed days.

**Why it works:** Every habit app adds friction (download, signup, daily open, tap through UI). Email removes all of it. The check-in takes 30 seconds. The response arrives in 30 more. That's it.

**Why now:** AI makes email-based products viable for the first time. Pre-LLM, an email habit tracker would need rigid formatting or human operators. Now the AI handles natural language, remembers context, and responds with genuine personality.

---

## 2. Target Segments

### Segment 1: App-Fatigued Health Conscious (Beachhead)
- **Who:** 25-45, tried 3+ habit apps, currently using none
- **Pain point:** Habit apps feel like another chore. Gamification is patronizing. They've tried Habitica, Streaks, Done, Productive — all abandoned within 2 months
- **Insight:** The problem isn't motivation, it's the medium. They don't want to open another app
- **Key message:** "You don't need another app. You need an email."
- **Channels:** Reddit (r/getdisciplined, r/habits, r/productivity), YouTube productivity creators, Twitter/X wellness accounts, Product Hunt
- **Why beachhead:** Already want the product category. Lowest education needed — they get it immediately

### Segment 2: Low-Tech / Non-Technical
- **Who:** 45-70, less comfortable with apps, but emails daily
- **Pain point:** Kids suggest health apps they can't figure out. Doctor says track water/medication. They forget or give up
- **Insight:** Email is the one tech tool this demographic already uses confidently
- **Key message:** "If you can send an email, you can track your habits."
- **Channels:** Facebook groups (health, retirement, caregiving), word of mouth (gift from children), doctor's office flyers, YouTube tutorials
- **Why important:** Viral growth vector — younger people buy it for parents. Incredibly sticky once adopted (email is routine)

### Segment 3: Accountability Seekers
- **Who:** 25-40, want a daily check-in partner
- **Pain point:** Don't want to burden friends with daily habit updates. Can't afford a coach ($200+/mo). Accountability apps require mutual commitment from a stranger
- **Insight:** They want someone who notices when they skip and celebrates when they hit milestones
- **Key message:** "An AI that remembers every day — not just today."
- **Channels:** Fitness communities, sobriety support groups (careful/respectful messaging), coaching/self-improvement newsletters, podcast ads
- **Why important:** Highest emotional engagement, strongest testimonials, longest retention

### Segment 4: Privacy-First Wellness
- **Who:** 30-50, tracking sensitive habits (mental health, sobriety, medication, therapy exercises)
- **Pain point:** Don't trust apps with personal health data. Don't want an account that profiles them. Worried about data breaches
- **Insight:** No account = no profile = no data to sell. Email can be encrypted end-to-end
- **Key message:** "No account. No profile. No one watching. Just you and your inbox."
- **Channels:** Privacy-focused communities (r/privacy, r/degoogle), ProtonMail users, mental health forums (careful/respectful), sobriety communities
- **Why important:** Strong differentiator vs every competitor. Unlocks sensitive use cases no app touches

### Segment 5: Automation / Quantified Self
- **Who:** 25-40, already tracks everything, wants programmatic access
- **Pain point:** Existing tracking is manual spreadsheets or complex Notion setups. Want AI analysis without building it themselves
- **Insight:** Email is a universal API. Works with Zapier, n8n, IFTTT, cron scripts
- **Key message:** "The simplest habit API is an email address."
- **Channels:** Hacker News, r/selfhosted, r/quantifiedself, dev Twitter, newsletters (TLDR, Morning Brew tech)
- **Why important:** Small segment but loud — they write blog posts, make YouTube videos, tell friends

---

## 3. Positioning

### Value Proposition
**"Maintain your habits with email. No app. No streaks. Just accountability that remembers."**

### Differentiators
| maintainable.app | Traditional Habit Apps |
|---|---|
| Email (already open) | Separate app (must remember to open) |
| AI with full memory | Static checkboxes |
| No account needed | Signup + profile required |
| Natural language | Rigid check/uncheck UI |
| No streak pressure | Streak mechanics = guilt |
| 30 seconds | 2-5 min per session |
| Works for grandma | Requires app literacy |

### Competitive Landscape
- **Habitica / Streaks / Done / Productive:** Feature-rich but friction-heavy. Most users churn within 60 days. We compete on simplicity, not features.
- **Coach.me / BetterUp:** Human coaching at $200+/mo. We're $3/mo with AI. Not the same depth, but 98% cheaper.
- **Journaling apps (Day One, etc.):** Similar "daily reflection" use case but require an app. We're email-native.
- **Nothing (pen and paper):** Our real competitor. Most people who "track habits" use a notebook or nothing. We need to be easier than a notebook.

### Positioning Statement
For people who want habit accountability without another app to manage, maintainable.app is the only habit tracker that works entirely through email with an AI that remembers your complete history. Unlike Habitica or Streaks, there's nothing to download, no streaks to break, and no gamification to ignore.

---

## 4. Go-To-Market Strategy

### Phase 0: Smoke Test (Week 1)
- **Goal:** Validate the concept works at all
- **Action:** Run the 50-day smoke test with 3 models. Confirm response quality, latency, memory retention
- **Status:** IN PROGRESS — tests running now

### Phase 1: Friends & Family Beta (Weeks 2-4)
- **Goal:** 20 real users, daily check-ins, qualitative feedback
- **Tactics:**
  - Personal invitations (James's network, my reach via email)
  - Simple landing page (built — site/)
  - Manual onboarding (reply to first email with instructions)
  - Daily monitoring of response quality
  - Feedback collection via email (dogfooding)
- **Success:** 10+ users still active at day 14, qualitative signal that responses are helpful
- **Cost:** $0 (running on existing infrastructure)

### Phase 2: Public Beta (Weeks 5-8)
- **Goal:** 200 users, first revenue
- **Tactics:**
  - Post to r/getdisciplined, r/habits, r/productivity with honest write-up
  - "Show HN" with technical angle ("I built a habit tracker that's just an email address")
  - Product Hunt launch
  - Twitter thread: "I quit every habit app. Then I tried emailing my habits instead."
  - Blog post on personal site
- **Success:** 200 signups, 20 paying, 50% 7-day retention
- **Pricing:** Free tier (5 check-ins) + $3/mo (30 check-ins)

### Phase 3: Growth (Weeks 9-16)
- **Goal:** 1,000 users, $1,000 MRR
- **Tactics:**
  - Referral program ("Send a friend 5 free check-ins")
  - SEO content (blog posts targeting "habit tracker without app", "email habit tracking", "simple habit tracker")
  - Partnership outreach to productivity YouTubers / newsletter writers
  - Segment 2 campaign: "Gift it to your parents" angle
  - Consider Segment 4 campaign if privacy messaging resonates
- **Success:** 1,000 users, 100 paying, <30% monthly churn

### Phase 4: Multi-Vertical (Weeks 17+)
- **Goal:** Launch second vertical on same backend
- **Candidates:** Journaling, medication tracking, sobriety check-ins, gratitude practice
- **How:** New domain, new landing page, new system prompt. Same backend.
- **Triggers:** Only launch when maintainable.app reaches 500+ active users

---

## 5. Pricing Strategy

### Tiers
| Tier | Check-ins | Price | Per Check-in | Target Segment |
|---|---|---|---|---|
| Free | 5 | $0 | — | Everyone (try before buy) |
| Monthly | 30 | $3 | $0.10 | Casual trackers |
| Yearly | 365 | $25 | $0.07 | Committed users |

### Why These Prices
- $3/mo is impulse-buy territory — cheaper than a coffee
- Yearly at $25 is a 30% discount — rewards commitment, reduces churn
- Free tier is 5 check-ins (enough to feel the memory feature), not time-limited
- Per-check-in model means you pay for what you use, not a subscription you forget

### Payment
- Crypto (ETH, USDC) from day 1 — aligns with mailbox-ai infrastructure
- Fiat (Stripe) added in Phase 3 if demand validates — lowers barrier for Segments 2 & 3
- No credit card required for free tier

### Conversion Hooks
- Free check-in response includes: "This was check-in 4 of 5 on your free tier."
- After free tier: "Your AI remembers everything. Keep going? [Purchase link]"
- Re-engagement: "It's been a week since your last check-in. Your AI still remembers your 15-day streak. Come back?"

---

## 6. Content Strategy

### Blog Topics
1. "I Quit Every Habit App. Then I Tried Email."
2. "Why Your Habit Tracker Shouldn't Be an App"
3. "The Science of Accountability (And Why AI Nails It)"
4. "How an AI Noticed My Monday Pattern Before I Did"
5. "Gift Guide: Tech for People Who Hate Tech"
6. "No Streaks, No Guilt: A Different Approach to Habits"
7. "50 Days of Emailing My Habits: What I Learned"
8. "The Privacy Case for Email-Based Health Tracking"
9. "Building a Habit Tracker With No UI"
10. "Why We Don't Have an App (And Never Will)"

### Email Sequences
- **Onboarding (3 emails):**
  1. Welcome + "Just reply to this email with what you did today"
  2. Day 3: "Your AI is starting to learn your patterns"
  3. Day 7: "One week! Here's what your AI noticed" + upgrade nudge
- **Re-engagement:**
  - Day 3 of inactivity: "Your AI misses you. (Just kidding. But your habits don't track themselves.)"
  - Day 7: "Pick up where you left off — your history is still here"
- **Milestone celebrations:**
  - Day 7, 14, 30, 50, 100 — special responses acknowledging the milestone

### Social Proof
- Screenshot testimonials of AI responses (with permission)
- "X days tracked" counter on landing page
- Blog posts from real users about their experience

---

## 7. Metrics & KPIs

### First 90 Days

| Metric | Target | How Measured |
|---|---|---|
| Total signups (unique senders) | 200 | Email logs |
| 7-day retention | 50% | Users who email on day 7+ |
| 14-day retention | 35% | Users who email on day 14+ |
| Free → paid conversion | 15% | Payment records |
| Paying customers | 30 | Payment records |
| MRR | $90 | Revenue tracking |
| Avg response time | <30s | Server logs |
| Response quality (user rating) | >4/5 | Periodic survey |
| NPS | >40 | Monthly survey |

### Leading Indicators
- Check-in frequency per user (daily = healthy, 3x/week = at risk, <1x/week = churning)
- Response length engagement (do users read long responses? click links?)
- Referral rate (how many users come from forwarded emails?)

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Email deliverability | High | Critical | SPF/DKIM/DMARC, dedicated IP, warm-up, monitor reputation. Test with Gmail/Outlook/Yahoo before launch |
| Response quality not good enough | Medium | High | Smoke test first (in progress). Tune system prompt. Use best model per tier. Human review of edge cases |
| Users forget to email | High | Medium | That's the feature — no nagging. But gentle re-engagement email after 3 days of silence |
| Privacy concern despite no-account model | Low | Medium | Clear privacy policy, encryption at rest, option to delete all data via email command |
| Competitor copies the concept | Medium | Low | Email + AI habit tracking is a feature, not a moat. Speed to market + community is the moat |
| LLM costs exceed revenue | Medium | High | Use cheapest model that works (smoke test comparing models). Per-check-in pricing covers variable cost |
| Scaling challenges | Low | Medium | Email is inherently async — no real-time pressure. Queue-based processing scales linearly |

---

## Appendix: One-Line Pitches

- **For app-fatigued:** "You don't need another app. You need an email."
- **For non-technical:** "If you can send an email, you can track your habits."
- **For accountability seekers:** "An AI that remembers every day — not just today."
- **For privacy-conscious:** "No account. No profile. No one watching."
- **For builders:** "The simplest habit API is an email address."
- **For investors:** "We turned email into a habit coaching platform. $3/mo, 90% gross margin, infinite verticals."
