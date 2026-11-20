import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedup, isNearDuplicate, significantWords } from '../../src/lib/cognitive/dedup';

test('exact repeats are still removed (case and spacing ignored)', () => {
  const out = dedup({ recommendations: ['Publish the case study', 'Call the client'] }, [
    { recommendations: ['  publish the case study '] },
  ]);
  assert.deepEqual(out.recommendations, ['Call the client']);
});

test('reworded repeats are removed', () => {
  const history = [{ recommendations: ['Publish the Wugweb case study this week'] }];
  const out = dedup({ recommendations: ['Publish Wugweb case studies this week', 'Update your public profile photo'] }, history);
  assert.deepEqual(out.recommendations, ['Update your public profile photo']);
});

test('the same idea twice in one output keeps the first only', () => {
  const out = dedup({ recommendations: ['Review the held packets', 'Review held packets', 'Write a post'] }, []);
  assert.deepEqual(out.recommendations, ['Review the held packets', 'Write a post']);
});

test('different recommendations with a shared word are kept', () => {
  assert.equal(isNearDuplicate('Publish the case study', 'Archive the case study notes and tags'), false);
  assert.equal(isNearDuplicate('Call the client', 'Email the client a summary'), false);
});

test('a short earlier recommendation does not swallow longer, distinct ones', () => {
  assert.equal(isNearDuplicate('Publish case study', 'Publish the case study on LinkedIn with new screenshots and a client quote'), false);
  const out = dedup(
    { recommendations: ['Publish the case study on LinkedIn with new screenshots and a client quote', 'Publish case study on the website homepage and update navigation links'] },
    [{ recommendations: ['Publish case study'] }],
  );
  assert.equal(out.recommendations.length, 2);
  // Overlap is symmetric.
  assert.equal(isNearDuplicate('Review held packets', 'Review the held packets again and file each one'), isNearDuplicate('Review the held packets again and file each one', 'Review held packets'));
});

test('true near-duplicates are still dropped (one extra word)', () => {
  assert.equal(isNearDuplicate('Publish the Wugweb case study this week', 'Publish Wugweb case studies this week soon'), true);
});

test('very short sentences only match when identical', () => {
  assert.equal(isNearDuplicate('Rest', 'Rest well'), false);
  assert.equal(isNearDuplicate('Rest', 'rest'), true);
});

test('does not mutate input and tolerates missing or odd history', () => {
  const output = { recommendations: ['A thing to do'], confidence: 0.7 };
  const out = dedup(output, undefined as any);
  assert.deepEqual(out.recommendations, ['A thing to do']);
  assert.equal(out.confidence, 0.7);
  assert.notStrictEqual(out, output);
  assert.deepEqual(dedup({ recommendations: ['x y'] }, [{}, { recommendations: null }, { recommendations: [5] }]).recommendations, ['x y']);
  assert.deepEqual(dedup({}, []).recommendations, []);
});

test('significantWords folds plurals and drops stop words', () => {
  assert.deepEqual([...significantWords('The case studies and the notes')].sort(), ['case', 'note', 'study'].sort());
});
