import assert from 'node:assert/strict';
import { handle } from '../modules/questions/routes';

async function testDemo() {
  console.log('Testing GET /api/questions/demo...');

  // 1. Test fetching demo questions without authentication
  const reqAll = new Request('http://localhost:3000/api/questions/demo', { method: 'GET' });
  const resAll = await handle('demo', reqAll);
  assert.equal(resAll.status, 200, `Expected 200, got ${resAll.status}`);

  const bodyAll = await resAll.json();
  const questionsAll = bodyAll.data || bodyAll;
  console.log(`✅ Loaded ${questionsAll.length} demo questions successfully from database!`);
  assert.ok(Array.isArray(questionsAll), 'Response should be an array');
  assert.ok(questionsAll.length <= 15, 'Should not return more than 15 questions');

  if (questionsAll.length > 0) {
    const q = questionsAll[0];
    console.log('Sample question fields:', {
      id: q.id,
      stem: q.stem?.slice(0, 40) + '...',
      optionsCount: q.options?.length,
      correct: q.correct,
      hasExplanation: !!q.explanation,
      subject: q.subject,
      year: q.year,
      status: q.status,
    });
    assert.ok(q.id, 'Question must have id');
    assert.ok(q.stem, 'Question must have stem');
    assert.ok(Array.isArray(q.options), 'Options must be decoded as an array');
    assert.equal(typeof q.correct, 'number', 'Correct must be a number');
    assert.equal(q.status, 'published', 'Only published questions should be returned');
  }

  // 2. Test with year filter
  const reqYear4 = new Request('http://localhost:3000/api/questions/demo?year=4', { method: 'GET' });
  const resYear4 = await handle('demo', reqYear4);
  assert.equal(resYear4.status, 200);
  const questionsYear4 = (await resYear4.json()).data || (await resYear4.json());
  console.log(`✅ Loaded ${questionsYear4.length} demo questions for year 4!`);

  console.log('🎉 All Demo BCQ tests passed successfully!');
}

testDemo().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
