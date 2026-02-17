// ── Onboarding flow integration ──

import { parseIntents } from './parser.js';
import { generateWelcomeEmail, looksLikeFirstMessage } from './welcome.js';

export interface OnboardingResult {
  isNewUser: boolean;
  shouldSendWelcome: boolean;
  welcomeEmail?: { subject: string; body: string };
  parsedIntents?: any;
}

/**
 * Determine if a new user should receive welcome email vs regular processing
 */
export async function handleNewUserEmail(
  userEmail: string,
  emailBody: string,
  isNewUser: boolean
): Promise<OnboardingResult> {
  // If not a new user, skip onboarding
  if (!isNewUser) {
    return { isNewUser: false, shouldSendWelcome: false };
  }

  // New user detected
  console.log(`[onboarding] New user: ${userEmail}`);

  // Check if email looks like a first-time greeting/question
  if (looksLikeFirstMessage(emailBody)) {
    console.log('[onboarding] Email looks like greeting → sending welcome');
    return {
      isNewUser: true,
      shouldSendWelcome: true,
      welcomeEmail: generateWelcomeEmail({ userEmail }),
    };
  }

  // Email looks like a check-in attempt
  // Try to parse it and see if we can extract habits
  const { result } = await parseIntents(emailBody);
  const hasCheckinIntent = result.intents.some(i => i.type === 'checkin');
  const hasAddHabitIntent = result.intents.some(i => i.type === 'add_habit');

  if (hasCheckinIntent || hasAddHabitIntent) {
    console.log('[onboarding] New user with check-in → processing + welcome');
    // Process the check-in normally, then add welcome message to response
    return {
      isNewUser: true,
      shouldSendWelcome: false, // Don't send separate welcome, fold into response
      parsedIntents: result,
    };
  }

  // Unclear intent from new user → send welcome
  console.log('[onboarding] Unclear first message → sending welcome');
  return {
    isNewUser: true,
    shouldSendWelcome: true,
    welcomeEmail: generateWelcomeEmail({ userEmail }),
  };
}

/**
 * Augment response for new user's first successful check-in
 */
export function augmentFirstCheckinResponse(baseResponse: string): string {
  return `Welcome to maintainable! 🎉

${baseResponse}

I'll remember everything you share with me. Just email whenever you're ready — daily, every other day, whatever works for you.`;
}
