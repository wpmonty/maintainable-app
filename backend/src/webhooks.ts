// ── Payment webhook handlers (stubbed for now) ──

import type { Request, Response } from 'express';
import { generateActivationEmail, generateDeactivationEmail } from './welcome.js';

/**
 * Webhook payload from ecommerce provider (structure TBD)
 */
export interface PaymentWebhookPayload {
  event: 'payment.success' | 'payment.failed' | 'payment.refunded';
  userId?: string;
  userEmail: string;
  amount?: number;
  creditsGranted?: number;
  transactionId?: string;
  timestamp: string;
}

/**
 * POST /webhook/payment
 * Handles payment success, failure, and refunds
 */
export async function handlePaymentWebhook(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Verify webhook signature/auth
    // For now, trust the payload
    
    const payload = req.body as PaymentWebhookPayload;
    
    console.log(`[webhook] Received ${payload.event} for ${payload.userEmail}`);
    
    // Route to appropriate handler
    switch (payload.event) {
      case 'payment.success':
        await handlePaymentSuccess(payload);
        break;
      case 'payment.failed':
        await handlePaymentFailure(payload);
        break;
      case 'payment.refunded':
        await handlePaymentRefund(payload);
        break;
      default:
        console.warn(`[webhook] Unknown event type: ${(payload as any).event}`);
    }
    
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] Error processing payment webhook:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(payload: PaymentWebhookPayload): Promise<void> {
  const { userEmail, creditsGranted = 30, transactionId } = payload;
  
  console.log(`[webhook] Payment success: ${userEmail} +${creditsGranted} credits (tx: ${transactionId})`);
  
  // TODO: Update database
  // - Find or create user by email
  // - Add credits to their account
  // - Set tier to 'paid'
  // - Record payment in payments table
  
  // For now, just log the activation email
  const activationEmail = generateActivationEmail({
    userEmail,
    creditsGranted,
  });
  
  console.log(`[webhook] Would send activation email to ${userEmail}:`);
  console.log(`  Subject: ${activationEmail.subject}`);
  console.log(`  Body preview: ${activationEmail.body.slice(0, 100)}...`);
  
  // TODO: Actually send the email via SMTP
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(payload: PaymentWebhookPayload): Promise<void> {
  const { userEmail } = payload;
  
  console.log(`[webhook] Payment failed: ${userEmail}`);
  
  // TODO: Update database
  // - Mark user as inactive (credits_remaining = 0)
  // - Do NOT delete user data
  
  // Send deactivation email
  const deactivationEmail = generateDeactivationEmail({
    userEmail,
    reason: 'payment_failed',
  });
  
  console.log(`[webhook] Would send deactivation email to ${userEmail}:`);
  console.log(`  Subject: ${deactivationEmail.subject}`);
  
  // TODO: Actually send the email via SMTP
}

/**
 * Handle payment refund
 */
async function handlePaymentRefund(payload: PaymentWebhookPayload): Promise<void> {
  const { userEmail, transactionId } = payload;
  
  console.log(`[webhook] Payment refunded: ${userEmail} (tx: ${transactionId})`);
  
  // TODO: Update database
  // - Deduct credits (or set to 0 if insufficient)
  // - Mark user as inactive if credits <= 0
  // - Record refund in payments table
  
  // Send refund notification email
  const refundEmail = generateDeactivationEmail({
    userEmail,
    reason: 'refund',
  });
  
  console.log(`[webhook] Would send refund email to ${userEmail}:`);
  console.log(`  Subject: ${refundEmail.subject}`);
  
  // TODO: Actually send the email via SMTP
}

/**
 * Helper to set up webhook routes in Express
 */
export function registerWebhookRoutes(app: any): void {
  // POST /webhook/payment - main payment webhook
  app.post('/webhook/payment', handlePaymentWebhook);
  
  // Health check
  app.get('/webhook/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'maintainable-webhooks' });
  });
  
  console.log('[webhooks] Payment webhook routes registered');
  console.log('  POST /webhook/payment - handle payment events');
  console.log('  GET  /webhook/health  - health check');
}
