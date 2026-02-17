# Integration Guide: Signup Flow

This guide shows how to wire the new signup flow components into the existing backend.

## File Structure

```
backend/src/
├── welcome.ts         ← Email templates (NEW)
├── webhooks.ts        ← Payment handlers (NEW)
├── onboarding.ts      ← Flow integration logic (NEW)
├── demo-signup.ts     ← Demo script (NEW)
├── parser.ts          ← Updated with negation handling
├── test-parser.ts     ← Updated with groups
├── db.ts              ← Existing
├── executor.ts        ← Existing
└── response-gen.ts    ← Existing
```

## Step 1: Wire Onboarding into Email Handler

In your main email processing flow (wherever you handle inbound emails):

```typescript
import { handleNewUserEmail, augmentFirstCheckinResponse } from './onboarding.js';

async function processInboundEmail(from: string, body: string) {
  // 1. Check if user exists
  const user = await db.getUserByEmail(from);
  const isNewUser = !user;

  // 2. Handle onboarding for new users
  if (isNewUser) {
    const onboarding = await handleNewUserEmail(from, body, true);
    
    if (onboarding.shouldSendWelcome && onboarding.welcomeEmail) {
      // Send welcome email and exit
      await sendEmail(from, onboarding.welcomeEmail.subject, onboarding.welcomeEmail.body);
      return;
    }
    
    // If we get here, new user sent a check-in — create user and process normally
    await db.createUser(from, { creditsRemaining: 5, tier: 'free' });
  }

  // 3. Check credits
  const currentUser = user ?? await db.getUserByEmail(from);
  if (!hasCreditsRemaining(currentUser.creditsRemaining, currentUser.tier)) {
    const outOfCredits = generateOutOfCreditsResponse(from);
    await sendEmail(from, outOfCredits.subject, outOfCredits.body);
    return;
  }

  // 4. Normal processing
  const parsed = await parseIntents(body, { userHabits: await db.getUserHabits(from) });
  const executed = await executeIntents(parsed.intents, from);
  const context = await buildContext(from, executed);
  const response = await generateResponse(context, body);

  // 5. Augment response for first check-in
  const finalResponse = isNewUser 
    ? augmentFirstCheckinResponse(response)
    : response;

  // 6. Send reply and decrement credits
  await sendEmail(from, 'Re: Your check-in', finalResponse);
  await db.decrementCredits(from);
}
```

## Step 2: Wire Webhooks into Express

In your Express app setup:

```typescript
import express from 'express';
import { registerWebhookRoutes } from './webhooks.js';

const app = express();
app.use(express.json());

// Register webhook routes
registerWebhookRoutes(app);

// Your other routes...

app.listen(3000, () => {
  console.log('Server listening on :3000');
});
```

This adds:
- `POST /webhook/payment` - main payment webhook
- `GET /webhook/health` - health check

## Step 3: Implement SMTP Sending

The email generators return `{ subject: string; body: string }`. Wire them to your SMTP client:

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.protonmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'habits@maintainable.app',
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendEmail(to: string, subject: string, body: string) {
  await transporter.sendMail({
    from: 'habits@maintainable.app',
    to,
    subject,
    text: body,
  });
}
```

## Step 4: Database Persistence

Add these methods to your `db.ts`:

```typescript
// User management
export async function getUserByEmail(email: string): Promise<User | null> { ... }
export async function createUser(email: string, opts: { creditsRemaining: number; tier: string }): Promise<User> { ... }
export async function decrementCredits(email: string): Promise<void> { ... }
export async function getUserHabits(email: string): Promise<string[]> { ... }

// Payment tracking
export async function recordPayment(payment: {
  userId: string;
  amount: number;
  creditsGranted: number;
  txHash?: string;
}): Promise<void> { ... }

export async function grantCredits(email: string, credits: number): Promise<void> { ... }
export async function deactivateUser(email: string): Promise<void> { ... }
```

## Step 5: Update Webhook Handlers

In `webhooks.ts`, replace the console.log sections with actual DB + email calls:

```typescript
async function handlePaymentSuccess(payload: PaymentWebhookPayload): Promise<void> {
  // Find user
  const user = await db.getUserByEmail(payload.userEmail);
  
  // Grant credits
  await db.grantCredits(payload.userEmail, payload.creditsGranted ?? 30);
  
  // Record payment
  await db.recordPayment({
    userId: user.id,
    amount: payload.amount ?? 0,
    creditsGranted: payload.creditsGranted ?? 30,
    txHash: payload.transactionId,
  });
  
  // Send activation email
  const email = generateActivationEmail({
    userEmail: payload.userEmail,
    creditsGranted: payload.creditsGranted ?? 30,
  });
  
  await sendEmail(payload.userEmail, email.subject, email.body);
}
```

## Step 6: Configure Ecommerce Webhooks

Point your payment provider's webhook URL to:
```
https://your-domain.com/webhook/payment
```

**Webhook signature verification (IMPORTANT):**

Add signature verification in `webhooks.ts`:

```typescript
function verifyWebhookSignature(req: Request): boolean {
  const signature = req.headers['x-webhook-signature'] as string;
  const secret = process.env.WEBHOOK_SECRET;
  const payload = JSON.stringify(req.body);
  
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSig;
}

export async function handlePaymentWebhook(req: Request, res: Response): Promise<void> {
  if (!verifyWebhookSignature(req)) {
    console.warn('[webhook] Invalid signature');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  // ... rest of handler
}
```

## Testing

### Manual Test: New User Flow
1. Start your server
2. Send email to habits@maintainable.app with body "Hey there"
3. Should receive welcome email
4. Reply with "water 8, pullups 10"
5. Should receive augmented first check-in response

### Manual Test: Payment Webhook
```bash
curl -X POST http://localhost:3000/webhook/payment \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.success",
    "userEmail": "test@example.com",
    "creditsGranted": 30,
    "transactionId": "tx_test123",
    "timestamp": "2026-02-16T23:00:00Z"
  }'
```

### Run Demo Script
```bash
cd backend
npx tsx src/demo-signup.ts
```

## Environment Variables

Add to your `.env`:
```bash
SMTP_PASSWORD=your_proton_password
WEBHOOK_SECRET=your_webhook_secret
DATABASE_PATH=./data/maintainable.db
```

## Monitoring

Log these events for production monitoring:
- New user signups
- Welcome emails sent
- Payment webhook events
- Credit grants/deductions
- SMTP send failures
- Webhook signature failures

Consider adding to a logging service (Sentry, Datadog, etc.)

---

## Next Steps After Integration

1. **Test with real email client** - Send actual emails through the flow
2. **Load test** - Verify webhook handlers under load
3. **Monitor logs** - Watch for SMTP failures or DB errors
4. **Set up alerts** - Failed payments, low credits, etc.
5. **Add analytics** - Track signup → paid conversion rate

---

## Questions?

Check `SPRINT_SUMMARY.md` for implementation details or run the demo script to see the flow in action.
