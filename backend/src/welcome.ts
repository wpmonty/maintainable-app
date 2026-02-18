// ── Welcome emails and onboarding flow ──

export interface WelcomeEmailOptions {
  userEmail: string;
  userName?: string;
}

export interface ActivationEmailOptions {
  userEmail: string;
  userName?: string;
  creditsGranted: number;
}

export interface DeactivationEmailOptions {
  userEmail: string;
  userName?: string;
  reason: 'subscription_ended' | 'payment_failed' | 'refund';
}

/**
 * Generate welcome email for new unknown sender
 */
export function generateWelcomeEmail(opts: WelcomeEmailOptions): { subject: string; body: string } {
  const name = opts.userName ?? 'there';
  
  return {
    subject: 'Welcome to maintainable',
    body: `Hey${name !== 'there' ? ' ' + name : ''}! Thanks for reaching out.

I'm your habit tracking assistant. Here's how it works:

1. Tell me what habits you want to track — just reply with something like "add stretching, add water 8 glasses, add multivitamin"
2. Each day, I'll send you a check-in reminder. Just reply with what you did: "water 6, stretched, took vitamin"
3. I remember everything — your streaks, your patterns, your personal bests

That's it. No app, no login, just email.

Reply with the habits you want to track and we'll get started.`,
  };
}

/**
 * Generate activation email after successful payment
 */
export function generateActivationEmail(opts: ActivationEmailOptions): { subject: string; body: string } {
  const name = opts.userName ?? 'there';
  const credits = opts.creditsGranted;
  
  return {
    subject: '✅ You\'re all set!',
    body: `Hey ${name},

Payment received — you're all set!

Just keep emailing me your daily habits like you've been doing. Nothing changes on your end.

Want to see your progress? Just ask:
  "How am I doing this week?"
  "Show me my pullup trends"

Talk soon 🌱`,
  };
}

/**
 * Generate deactivation email (subscription ended, payment failed, or refunded)
 */
export function generateDeactivationEmail(opts: DeactivationEmailOptions): { subject: string; body: string } {
  const name = opts.userName ?? 'there';
  
  let body = `Hey ${name},\n\n`;
  
  if (opts.reason === 'subscription_ended') {
    body += `Your check-ins have run out. No worries — your data is still here.

If you want to keep tracking, just grab more check-ins anytime:
  [payment link would go here]

If you're done for now, that's cool too. Your history isn't going anywhere.`;
  } else if (opts.reason === 'payment_failed') {
    body += `Looks like your payment didn't go through. No big deal.

Your data is safe, but you're out of check-ins for now.

Want to keep going? Try the payment again:
  [payment link would go here]`;
  } else {
    // refund
    body += `Your payment has been refunded.

If something wasn't working right, I'd love to hear about it. Just reply to this email.

Your data is still here if you want to come back later.`;
  }
  
  body += `\n\nTalk soon 🌱`;
  
  return {
    subject: opts.reason === 'refund' ? 'Refund processed' : 'Check-ins paused',
    body,
  };
}

/**
 * Check if email body looks like a first-time message (vs a check-in)
 */
export function looksLikeFirstMessage(emailBody: string): boolean {
  const lower = emailBody.toLowerCase().trim();
  
  // Greeting patterns
  if (/^(hi|hey|hello|yo|sup)/i.test(lower)) return true;
  
  // Questions about the service
  if (lower.includes('how does this work') || lower.includes('what can you do')) return true;
  if (lower.includes('sign up') || lower.includes('get started')) return true;
  
  // Empty or very short
  if (lower.length < 10) return true;
  
  return false;
}
