/**
 * Call 2: Response generation via mistral-nemo.
 * Receives structured context (real data from DB) + original message.
 */

const RESPONSE_SYSTEM_PROMPT = `You are a friendly habit tracking assistant. Respond to the user based on the structured context below.

Rules:
- Reference specific numbers and trends from the data (never guess or make up stats)
- Acknowledge ALL actions that just happened (check-in recorded, habits added/removed, etc.)
- Answer any questions using the provided data
- Keep it under 150 words
- Be warm but not saccharine — like a friend who actually cares
- If they had a bad day, be gentle. If they hit a milestone, celebrate.
- If you notice recurring patterns in their original message (mentions of soda, junk food, sleep issues, etc.) that aren't tracked habits, you can gently mention it — but don't nag.
- If a habit wasn't reported today but others were, you can ask about it casually — don't assume they skipped.
- Don't use emoji excessively. One or two max.
- Sign off casually, no formal signature.`;

export interface ResponseOptions {
  model?: string;
  baseUrl?: string;
}

const DEFAULTS = {
  model: 'mistral-nemo',
  baseUrl: 'http://localhost:11434',
};

export async function generateResponse(
  structuredContext: string,
  opts?: ResponseOptions
): Promise<{ response: string; latencyMs: number }> {
  const model = opts?.model ?? DEFAULTS.model;
  const baseUrl = opts?.baseUrl ?? DEFAULTS.baseUrl;

  const start = Date.now();

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: RESPONSE_SYSTEM_PROMPT },
        { role: 'user', content: structuredContext },
      ],
      stream: false,
      options: { temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { message: { content: string } };
  const latencyMs = Date.now() - start;

  return {
    response: data.message.content.trim(),
    latencyMs,
  };
}
