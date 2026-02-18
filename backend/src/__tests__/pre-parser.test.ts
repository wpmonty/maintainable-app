import { test, describe } from 'node:test';
import assert from 'node:assert';
import { preParseIntent } from '../pre-parser.js';

describe('Pre-parser: Affirm', () => {
  test('yes', () => {
    const result = preParseIntent('yes');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('YES (uppercase)', () => {
    const result = preParseIntent('YES');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('Yes! (with punctuation)', () => {
    const result = preParseIntent('Yes!');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('yeah', () => {
    const result = preParseIntent('yeah');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('yep', () => {
    const result = preParseIntent('yep');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('yup', () => {
    const result = preParseIntent('yup');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('sure', () => {
    const result = preParseIntent('sure');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('ok', () => {
    const result = preParseIntent('ok');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('okay', () => {
    const result = preParseIntent('okay');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('Okay.', () => {
    const result = preParseIntent('Okay.');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('absolutely', () => {
    const result = preParseIntent('absolutely');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('let\'s do it', () => {
    const result = preParseIntent('let\'s do it');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('lets do it (without apostrophe)', () => {
    const result = preParseIntent('lets do it');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('sounds good', () => {
    const result = preParseIntent('sounds good');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('go ahead', () => {
    const result = preParseIntent('go ahead');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('go for it', () => {
    const result = preParseIntent('go for it');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('do it', () => {
    const result = preParseIntent('do it');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('please', () => {
    const result = preParseIntent('please');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });

  test('yes please', () => {
    const result = preParseIntent('yes please');
    assert.deepStrictEqual(result, { intents: [{ type: 'affirm' }] });
  });
});

describe('Pre-parser: Decline', () => {
  test('no', () => {
    const result = preParseIntent('no');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('NO (uppercase)', () => {
    const result = preParseIntent('NO');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('No! (with punctuation)', () => {
    const result = preParseIntent('No!');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('nah', () => {
    const result = preParseIntent('nah');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('nope', () => {
    const result = preParseIntent('nope');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('no thanks', () => {
    const result = preParseIntent('no thanks');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('no thank you', () => {
    const result = preParseIntent('no thank you');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('never mind', () => {
    const result = preParseIntent('never mind');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('nevermind', () => {
    const result = preParseIntent('nevermind');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('skip that', () => {
    const result = preParseIntent('skip that');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('don\'t', () => {
    const result = preParseIntent('don\'t');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('dont (without apostrophe)', () => {
    const result = preParseIntent('dont');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('not now', () => {
    const result = preParseIntent('not now');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('not right now', () => {
    const result = preParseIntent('not right now');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('maybe later', () => {
    const result = preParseIntent('maybe later');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });

  test('pass', () => {
    const result = preParseIntent('pass');
    assert.deepStrictEqual(result, { intents: [{ type: 'decline' }] });
  });
});

describe('Pre-parser: Greeting', () => {
  test('hey', () => {
    const result = preParseIntent('hey');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('Hi! (uppercase with punctuation)', () => {
    const result = preParseIntent('Hi!');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('hello', () => {
    const result = preParseIntent('hello');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('yo', () => {
    const result = preParseIntent('yo');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('sup', () => {
    const result = preParseIntent('sup');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('howdy', () => {
    const result = preParseIntent('howdy');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('good morning', () => {
    const result = preParseIntent('good morning');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('good evening', () => {
    const result = preParseIntent('good evening');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('gm', () => {
    const result = preParseIntent('gm');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('morning', () => {
    const result = preParseIntent('morning');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('skip', () => {
    const result = preParseIntent('skip');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('off day', () => {
    const result = preParseIntent('off day');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });

  test('day off', () => {
    const result = preParseIntent('day off');
    assert.deepStrictEqual(result, { intents: [{ type: 'greeting' }] });
  });
});

describe('Pre-parser: Help', () => {
  test('help', () => {
    const result = preParseIntent('help');
    assert.deepStrictEqual(result, { intents: [{ type: 'help' }] });
  });

  test('Help! (uppercase with punctuation)', () => {
    const result = preParseIntent('Help!');
    assert.deepStrictEqual(result, { intents: [{ type: 'help' }] });
  });

  test('what can you do', () => {
    const result = preParseIntent('what can you do');
    assert.deepStrictEqual(result, { intents: [{ type: 'help' }] });
  });

  test('how does this work', () => {
    const result = preParseIntent('how does this work');
    assert.deepStrictEqual(result, { intents: [{ type: 'help' }] });
  });

  test('what is this', () => {
    const result = preParseIntent('what is this');
    assert.deepStrictEqual(result, { intents: [{ type: 'help' }] });
  });

  test('commands', () => {
    const result = preParseIntent('commands');
    assert.deepStrictEqual(result, { intents: [{ type: 'help' }] });
  });

  test('options', () => {
    const result = preParseIntent('options');
    assert.deepStrictEqual(result, { intents: [{ type: 'help' }] });
  });

  test('features', () => {
    const result = preParseIntent('features');
    assert.deepStrictEqual(result, { intents: [{ type: 'help' }] });
  });

  test('? (question mark only)', () => {
    const result = preParseIntent('?');
    assert.deepStrictEqual(result, { intents: [{ type: 'help' }] });
  });

  test('how do i add a habit', () => {
    const result = preParseIntent('how do i add a habit');
    assert.deepStrictEqual(result, { intents: [{ type: 'help' }] });
  });

  test('how can i track water', () => {
    const result = preParseIntent('how can i track water');
    assert.deepStrictEqual(result, { intents: [{ type: 'help' }] });
  });
});

describe('Pre-parser: Null returns (pass to LLM)', () => {
  test('water 8 (check-in)', () => {
    const result = preParseIntent('water 8');
    assert.strictEqual(result, null);
  });

  test('had water today', () => {
    const result = preParseIntent('had water today');
    assert.strictEqual(result, null);
  });

  test('yes I had water (affirm-like but with context)', () => {
    const result = preParseIntent('yes I had water');
    assert.strictEqual(result, null);
  });

  test('no water today (negation check-in)', () => {
    const result = preParseIntent('no water today');
    assert.strictEqual(result, null);
  });

  test('no pullups or vitamins (multi negation)', () => {
    const result = preParseIntent('no pullups or vitamins');
    assert.strictEqual(result, null);
  });

  test('track water please', () => {
    const result = preParseIntent('track water please');
    assert.strictEqual(result, null);
  });

  test('add habit water', () => {
    const result = preParseIntent('add habit water');
    assert.strictEqual(result, null);
  });

  test('remove water', () => {
    const result = preParseIntent('remove water');
    assert.strictEqual(result, null);
  });

  test('how am I doing', () => {
    const result = preParseIntent('how am I doing');
    assert.strictEqual(result, null);
  });

  test('what\'s my progress', () => {
    const result = preParseIntent('what\'s my progress');
    assert.strictEqual(result, null);
  });

  test('water 8, pullups 10', () => {
    const result = preParseIntent('water 8, pullups 10');
    assert.strictEqual(result, null);
  });

  test('everything today', () => {
    const result = preParseIntent('everything today');
    assert.strictEqual(result, null);
  });

  test('all good except water', () => {
    const result = preParseIntent('all good except water');
    assert.strictEqual(result, null);
  });

  test('no water, good otherwise', () => {
    const result = preParseIntent('no water, good otherwise');
    assert.strictEqual(result, null);
  });

  test('feeling sick today', () => {
    const result = preParseIntent('feeling sick today');
    assert.strictEqual(result, null);
  });

  test('back hurts, skipped pullups', () => {
    const result = preParseIntent('back hurts, skipped pullups');
    assert.strictEqual(result, null);
  });

  test('had a rough day', () => {
    const result = preParseIntent('had a rough day');
    assert.strictEqual(result, null);
  });

  test('yes please add water (affirm with context)', () => {
    const result = preParseIntent('yes please add water');
    assert.strictEqual(result, null);
  });

  test('okay thanks (more than affirm)', () => {
    const result = preParseIntent('okay thanks');
    assert.strictEqual(result, null);
  });

  test('sure thing (more than affirm)', () => {
    const result = preParseIntent('sure thing');
    assert.strictEqual(result, null);
  });

  test('longer message with yes: yes and I also completed pullups', () => {
    const result = preParseIntent('yes and I also completed pullups');
    assert.strictEqual(result, null);
  });

  test('no thanks, I\'m good (decline with extra context)', () => {
    const result = preParseIntent('no thanks, I\'m good');
    assert.strictEqual(result, null);
  });

  test('hi there how are you', () => {
    const result = preParseIntent('hi there how are you');
    assert.strictEqual(result, null);
  });

  test('hello! water 8 today', () => {
    const result = preParseIntent('hello! water 8 today');
    assert.strictEqual(result, null);
  });
});

describe('Pre-parser: Edge cases', () => {
  test('empty string', () => {
    const result = preParseIntent('');
    assert.strictEqual(result, null);
  });

  test('whitespace only', () => {
    const result = preParseIntent('   ');
    assert.strictEqual(result, null);
  });

  test('single punctuation !', () => {
    const result = preParseIntent('!');
    assert.strictEqual(result, null);
  });

  test('emoji only 👍', () => {
    const result = preParseIntent('👍');
    assert.strictEqual(result, null);
  });

  test('mixed emoji and text: yes 👍', () => {
    const result = preParseIntent('yes 👍');
    // Still matches "yes" after normalization (emoji doesn't break it)
    // Actually, let's check: "yes 👍" normalizes to "yes 👍" (lowercased, trimmed)
    // The emoji stays, so it won't match "yes" exactly
    assert.strictEqual(result, null);
  });

  test('number only: 8', () => {
    const result = preParseIntent('8');
    assert.strictEqual(result, null);
  });

  test('special chars: @#$', () => {
    const result = preParseIntent('@#$');
    assert.strictEqual(result, null);
  });

  test('tab and newline', () => {
    const result = preParseIntent('\t\n');
    assert.strictEqual(result, null);
  });
});
