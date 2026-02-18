// ── Intent types returned by the parser ──

export interface CheckinEntry {
  habit: string;
  status: 'full' | 'partial' | 'skip';
  value?: number;
  unit?: string;
  note?: string;
}

export interface CheckinIntent {
  type: 'checkin';
  date?: string;  // relative: 'today', 'yesterday', or YYYY-MM-DD. default: today
  entries: CheckinEntry[];
}

export interface AddHabitEntry {
  name: string;
  unit?: string | null;
  goal?: number | null;
}

export interface AddHabitIntent {
  type: 'add_habit';
  habits: AddHabitEntry[];
}

export interface RemoveHabitIntent {
  type: 'remove_habit';
  habits: string[];
}

export interface UpdateHabitIntent {
  type: 'update_habit';
  habit: string;
  unit?: string;
  goal?: number;
}

export interface QueryIntent {
  type: 'query';
  scope?: 'today' | 'week' | 'month' | 'all';
  question: string;
}

export interface GreetingIntent {
  type: 'greeting';
}

export interface HelpIntent {
  type: 'help';
}

export interface SettingsIntent {
  type: 'settings';
  changes: Record<string, unknown>;
}

export interface CorrectionIntent {
  type: 'correction';
  claim: string;  // What the user says is wrong, e.g. "I didn't drink water"
}

export interface AffirmIntent {
  type: 'affirm';
}

export interface DeclineIntent {
  type: 'decline';
}

export type Intent =
  | CheckinIntent
  | AddHabitIntent
  | RemoveHabitIntent
  | UpdateHabitIntent
  | QueryIntent
  | GreetingIntent
  | HelpIntent
  | SettingsIntent
  | CorrectionIntent
  | AffirmIntent
  | DeclineIntent;

export interface ParseResult {
  intents: Intent[];
}

// ── Execution results ──

export interface ExecutionResult {
  action: string;
  success: boolean;
  detail: string;
}

export interface PipelineResult {
  userId: string;
  isNewUser: boolean;
  parsedIntents: ParseResult;
  executionResults: ExecutionResult[];
  structuredContext: string;
  response: string;
  parseLatencyMs: number;
  responseLatencyMs: number;
}
