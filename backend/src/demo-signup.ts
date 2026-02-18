// ── Demo script for signup flow ──

import { handleNewUserEmail, augmentFirstCheckinResponse } from './onboarding.js';
import { generateWelcomeEmail, generateActivationEmail, generateDeactivationEmail } from './welcome.js';
import type { PaymentWebhookPayload } from './webhooks.js';

console.log('━'.repeat(70));
console.log('  MAINTAINABLE.APP SIGNUP FLOW DEMO');
console.log('━'.repeat(70));

// ── Scenario 1: New user sends greeting ──
console.log('\n📧 Scenario 1: New user sends "Hey there"');
console.log('─'.repeat(70));

const result1 = await handleNewUserEmail(
  'alice@example.com',
  'Hey there',
  true // isNewUser
);

if (result1.shouldSendWelcome && result1.welcomeEmail) {
  console.log('✅ Welcome email generated:');
  console.log(`   Subject: ${result1.welcomeEmail.subject}`);
  console.log(`   Body:\n${result1.welcomeEmail.body.split('\n').map(l => `     ${l}`).join('\n')}`);
}

// ── Scenario 2: New user sends check-in immediately ──
console.log('\n\n📧 Scenario 2: New user sends "water 8 glasses, ran 20 min"');
console.log('─'.repeat(70));

const result2 = await handleNewUserEmail(
  'bob@example.com',
  'water 8 glasses, ran 20 min',
  true
);

console.log(`   isNewUser: ${result2.isNewUser}`);
console.log(`   shouldSendWelcome: ${result2.shouldSendWelcome}`);
if (result2.parsedIntents) {
  console.log(`   Parsed intents: ${result2.parsedIntents.intents.map((i: any) => i.type).join(', ')}`);
  console.log('\n✅ Would process check-in + augment response:');
  const baseResponse = 'Great start! Water at 8 glasses and 20 minutes of running — solid first day.';
  const augmented = augmentFirstCheckinResponse(baseResponse);
  console.log(`\n${augmented.split('\n').map(l => `     ${l}`).join('\n')}`);
}

// ── Scenario 3: Existing user ──
console.log('\n\n📧 Scenario 3: Existing user sends check-in');
console.log('─'.repeat(70));

const result3 = await handleNewUserEmail(
  'charlie@example.com',
  'water 6, pullups 10',
  false // not a new user
);

console.log(`   isNewUser: ${result3.isNewUser}`);
console.log(`   shouldSendWelcome: ${result3.shouldSendWelcome}`);
console.log('   → Normal processing (no welcome flow)');

// ── Scenario 4: Payment webhook - success ──
console.log('\n\n💳 Scenario 4: Payment webhook - success');
console.log('─'.repeat(70));

const paymentSuccess: PaymentWebhookPayload = {
  event: 'payment.success',
  userEmail: 'alice@example.com',
  amount: 3.00,
  creditsGranted: 30,
  transactionId: 'tx_abc123',
  timestamp: new Date().toISOString(),
} as const;

console.log(`   Event: ${paymentSuccess.event}`);
console.log(`   User: ${paymentSuccess.userEmail}`);
console.log(`   Credits: ${paymentSuccess.creditsGranted}`);

const activationEmail = generateActivationEmail({
  userEmail: paymentSuccess.userEmail,
  creditsGranted: paymentSuccess.creditsGranted ?? 0,
});

console.log('\n✅ Activation email generated:');
console.log(`   Subject: ${activationEmail.subject}`);
console.log(`   Body:\n${activationEmail.body.split('\n').map(l => `     ${l}`).join('\n')}`);

// ── Scenario 5: Payment webhook - failed ──
console.log('\n\n💳 Scenario 5: Payment webhook - failed');
console.log('─'.repeat(70));

const paymentFailed: PaymentWebhookPayload = {
  event: 'payment.failed',
  userEmail: 'bob@example.com',
  timestamp: new Date().toISOString(),
};

console.log(`   Event: ${paymentFailed.event}`);
console.log(`   User: ${paymentFailed.userEmail}`);

const deactivationEmail = generateDeactivationEmail({
  userEmail: paymentFailed.userEmail,
  reason: 'payment_failed',
});

console.log('\n✅ Deactivation email generated:');
console.log(`   Subject: ${deactivationEmail.subject}`);
console.log(`   Body:\n${deactivationEmail.body.split('\n').map(l => `     ${l}`).join('\n')}`);

// ── Scenario 6: Payment webhook - refund ──
console.log('\n\n💳 Scenario 6: Payment webhook - refund');
console.log('─'.repeat(70));

const paymentRefund: PaymentWebhookPayload = {
  event: 'payment.refunded',
  userEmail: 'charlie@example.com',
  transactionId: 'tx_xyz789',
  timestamp: new Date().toISOString(),
};

console.log(`   Event: ${paymentRefund.event}`);
console.log(`   User: ${paymentRefund.userEmail}`);

const refundEmail = generateDeactivationEmail({
  userEmail: paymentRefund.userEmail,
  reason: 'refund',
});

console.log('\n✅ Refund email generated:');
console.log(`   Subject: ${refundEmail.subject}`);
console.log(`   Body:\n${refundEmail.body.split('\n').map((l: string) => `     ${l}`).join('\n')}`);

// ── Scenario 7: Out of credits ──
// console.log('\n\n🚫 Scenario 7: User out of credits');
// console.log('─'.repeat(70));

// NOTE: generateOutOfCreditsResponse was removed, commenting out this scenario
// const outOfCredits = generateOutOfCreditsResponse('alice@example.com');

// console.log('✅ Out of credits email generated:');
// console.log(`   Subject: ${outOfCredits.subject}`);
// console.log(`   Body:\n${outOfCredits.body.split('\n').map((l: string) => `     ${l}`).join('\n')}`);

console.log('\n' + '━'.repeat(70));
console.log('  DEMO COMPLETE');
console.log('━'.repeat(70));
console.log('\nAll signup flow components are stubbed and ready for integration.');
console.log('Next steps:');
console.log('  1. Wire onboarding.ts into the main email handler');
console.log('  2. Wire webhooks.ts into Express app');
console.log('  3. Implement actual SMTP sending for generated emails');
console.log('  4. Implement database persistence for user/payment records\n');
