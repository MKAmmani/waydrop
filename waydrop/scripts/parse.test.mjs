import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseErrand } from '../src/lib/parseErrand.ts';

test('full sentence', () => assert.deepEqual(parseErrand('Bring my calculator from New Hall to the Main Library for 500'), { item: 'Calculator', from: 'New Hall', to: 'Main Library', amount: 500 }));
test('reverse order and naira sign', () => assert.deepEqual(parseErrand('pls take my file to Coke Village from New Hall ₦700'), { item: 'File', from: 'New Hall', to: 'Coke Village', amount: 700 }));
test('only a source means deliver to me', () => assert.deepEqual(parseErrand('get my charger from Coke Village'), { item: 'Charger', from: 'Coke Village', to: 'here', amount: null }));
test('1.5k amounts', () => assert.equal(parseErrand('bring my bag from New Hall to Kabuga gate 1.5k').amount, 1500));
