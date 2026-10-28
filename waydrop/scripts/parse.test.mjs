import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseErrand, parseBuy } from '../src/lib/parseErrand.ts';

test('full sentence', () => assert.deepEqual(parseErrand('Bring my calculator from New Hall to the Main Library for 500'), { item: 'Calculator', from: 'New Hall', to: 'Main Library', amount: 500 }));
test('reverse order and naira sign', () => assert.deepEqual(parseErrand('pls take my file to Coke Village from New Hall ₦700'), { item: 'File', from: 'New Hall', to: 'Coke Village', amount: 700 }));
test('only a source means deliver to me', () => assert.deepEqual(parseErrand('get my charger from Coke Village'), { item: 'Charger', from: 'Coke Village', to: 'here', amount: null }));
test('1.5k amounts', () => assert.equal(parseErrand('bring my bag from New Hall to Kabuga gate 1.5k').amount, 1500));

test('buy 6 bottles of water at stadium', () => {
  const p = parseBuy("Buy 6 bottles of water, anywhere is fine. I'm at the stadium, Block B stand");
  assert.equal(p.buy, true);
  assert.equal(p.any, true);
  assert.equal(p.items.length, 1);
  assert.equal(p.items[0].name, 'Bottled water, 75cl');
  assert.equal(p.items[0].qty, 6);
  assert.equal(p.items[0].est, 300);
});

test('buy charger and indomie from shoprite', () => {
  const p = parseBuy("Buy me a 65W phone charger and 2 packs of Indomie from Shoprite. I'm at Moremi Hall");
  assert.equal(p.buy, true);
  assert.equal(p.any, false);
  assert.equal(p.shop, 'Shoprite');
  assert.equal(p.items.length, 2);
  assert.equal(p.items[0].name, '65W phone charger');
  assert.equal(p.items[0].est, null);
  assert.equal(p.items[1].name, 'Indomie noodles');
  assert.equal(p.items[1].qty, 2);
  assert.equal(p.items[1].est, 250);
});
