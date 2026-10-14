// Run: npm test  (Node 22.6+ strips the TypeScript types for us)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nationalDigits, formatNational, isValidNational, toE164 } from '../src/lib/phone.ts';

test('accepts every way people type a Nigerian number', () => {
  for (const raw of ['08031234567', '8031234567', '+2348031234567', '234 803 123 4567', '0803-123-4567'])
    assert.equal(nationalDigits(raw), '8031234567', raw);
});
test('formats as 803 123 4567', () => assert.equal(formatNational('8031234567'), '803 123 4567'));
test('valid mobile prefixes', () => {
  for (const ok of ['7031234567', '8031234567', '8131234567', '9031234567', '9131234567']) assert.ok(isValidNational(ok), ok);
  for (const bad of ['6031234567', '803123456', '1234567890']) assert.ok(!isValidNational(bad), bad);
});
test('E.164 for the API', () => assert.equal(toE164('8031234567'), '+2348031234567'));
