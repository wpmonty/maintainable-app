import Database from 'better-sqlite3';
import { getOrCreateUser, getUserHabits } from './db.js';
import { parseIntents } from './parser.js';
import { executeIntents } from './executor.js';
import { buildStructuredContext } from './context-builder.js';
import { generateResponse } from './response-gen.js';
import { handleNewUserEmail, augmentFirstCheckinResponse } from './onboarding.js';
import type { ParsedEmail } from './email-client.js';

export interface PipelineOptions {
  db: Database.Database;
  email: ParsedEmail;
}

export interface PipelineOutput {
  userId: string;
  isNewUser: boolean;
  shouldReply: boolean;
  replySubject: string;
  replyBody: string;
}

/**
 * Main pipeline: email → parse → execute → build context → generate response
 */
/**
 * Strip quoted reply text from email body.
 * Removes lines starting with > and "On ... wrote:" headers.
 */
function stripQuotedText(body: string): string {
  const lines = body.split('\n');
  const cleaned: string[] = [];
  for (const line of lines) {
    // Stop at "On <date> <email> wrote:" pattern
    if (/^On .+ wrote:$/i.test(line.trim())) break;
    // Stop at lines starting with >
    if (line.trim().startsWith('>')) break;
    // Stop at "------" dividers
    if (/^-{3,}/.test(line.trim())) break;
    cleaned.push(line);
  }
  return cleaned.join('\n').trim();
}

export async function processPipelineEmail(opts: PipelineOptions): Promise<PipelineOutput> {
  const { db, email } = opts;
  const { from, subject, body: rawBody, messageId } = email;
  
  // Strip quoted reply text
  const body = stripQuotedText(rawBody);

  // Combine subject + body intelligently:
  // - First email (no Re:/Fwd:): subject may contain the intent, include it
  // - Thread replies: subject is just threading metadata, use body only
  // - Empty body fallback: always use subject
  const isReply = /^(Re|Fwd):/i.test(subject || '');
  const input = (!isReply && body.length < 10)
    ? [subject, body].filter(Boolean).join('. ').trim()
    : (body || subject || '').trim();

  console.log(`\n[pipeline] Processing email from ${from}`);
  console.log(`[pipeline] Subject: ${subject}`);
  console.log(`[pipeline] Body: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`);
  console.log(`[pipeline] Combined input: ${input.substring(0, 120)}${input.length > 120 ? '...' : ''}`);

  // Look up or create user
  const { id: userId, isNew } = getOrCreateUser(db, from);
  console.log(`[pipeline] User ID: ${userId} (new: ${isNew})`);

  // Get today's date for check-ins
  const today = new Date().toISOString().split('T')[0];

  // Handle new user onboarding
  if (isNew) {
    const onboarding = await handleNewUserEmail(from, input, isNew);
    
    if (onboarding.shouldSendWelcome && onboarding.welcomeEmail) {
      // Send welcome email, don't process as check-in
      console.log('[pipeline] Sending welcome email to new user');
      
      // Log the incoming email
      db.prepare(
        'INSERT INTO emails (user_id, direction, subject, body) VALUES (?, ?, ?, ?)'
      ).run(userId, 'incoming', subject, body);
      
      // Log the outgoing welcome
      db.prepare(
        'INSERT INTO emails (user_id, direction, subject, body) VALUES (?, ?, ?, ?)'
      ).run(userId, 'outgoing', onboarding.welcomeEmail.subject, onboarding.welcomeEmail.body);
      
      return {
        userId,
        isNewUser: true,
        shouldReply: true,
        replySubject: onboarding.welcomeEmail.subject,
        replyBody: onboarding.welcomeEmail.body,
      };
    }
    
    // New user with check-in → process normally and augment response
  }

  // Get user's active habits for parser context
  const userHabits = getUserHabits(db, userId).map(h => h.name);

  // Parse intents
  console.log('[pipeline] Parsing intents...');
  const { result: parseResult, latencyMs: parseLatency } = await parseIntents(input, {
    userHabits,
  });
  console.log(`[pipeline] Parsed ${parseResult.intents.length} intents (${parseLatency}ms)`);
  console.log('[pipeline] Intents:', JSON.stringify(parseResult.intents, null, 2));

  // Execute intents
  console.log('[pipeline] Executing intents...');
  const executionResults = executeIntents(db, userId, parseResult.intents, today);
  console.log('[pipeline] Execution results:', executionResults);

  // Build structured context
  console.log('[pipeline] Building context...');
  const structuredContext = buildStructuredContext(db, userId, today, executionResults, input);

  // Generate response
  console.log('[pipeline] Generating response...');
  const { response: rawResponse, latencyMs: responseLatency } = await generateResponse(structuredContext);
  console.log(`[pipeline] Generated response (${responseLatency}ms)`);

  // Augment response for new user's first check-in
  let finalResponse = rawResponse;
  if (isNew && parseResult.intents.some(i => i.type === 'checkin')) {
    finalResponse = augmentFirstCheckinResponse(rawResponse);
  }

  // Log incoming email
  db.prepare(
    'INSERT INTO emails (user_id, direction, subject, body, parsed_intents) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, 'incoming', subject, body, JSON.stringify(parseResult.intents));

  // Log outgoing response
  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
  db.prepare(
    'INSERT INTO emails (user_id, direction, subject, body) VALUES (?, ?, ?, ?)'
  ).run(userId, 'outgoing', replySubject, finalResponse);

  console.log('[pipeline] Pipeline complete\n');

  return {
    userId,
    isNewUser: isNew,
    shouldReply: true,
    replySubject,
    replyBody: finalResponse,
  };
}
