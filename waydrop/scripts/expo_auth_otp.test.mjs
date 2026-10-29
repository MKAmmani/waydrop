import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toE164, nationalDigits } from '../src/lib/phone.ts';

const API_BASE = 'http://127.0.0.1:8000/api';

test('1. Registration Flow with Master OTP: 08104174414', async () => {
  const rawPhone = '08104174414';
  const digits = nationalDigits(rawPhone);
  assert.equal(digits, '8104174414');
  const phoneE164 = toE164(digits);
  assert.equal(phoneE164, '+2348104174414');

  // Step 1: Request OTP
  const reqRes = await fetch(`${API_BASE}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ phone: phoneE164 }),
  });
  assert.equal(reqRes.status, 200, 'requestOtp should return 200');
  const reqData = await reqRes.json();
  assert.equal(reqData.expires_in, 300);

  // Step 2: Verify with Master OTP 800080
  const verifyRes = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ phone: phoneE164, code: '800080' }),
  });
  assert.equal(verifyRes.status, 200, 'verifyOtp with Master OTP should return 200');
  const verifyData = await verifyRes.json();
  assert.ok(verifyData.access_token, 'Should receive an access_token');
  assert.equal(verifyData.is_new_user, true, '08104174414 should be detected as new user');
  assert.equal(verifyData.me.phone, '+2348104174414');
});

test('2. Login Flow with Master OTP: 07082262502', async () => {
  const rawPhone = '07082262502';
  const digits = nationalDigits(rawPhone);
  assert.equal(digits, '7082262502');
  const phoneE164 = toE164(digits);
  assert.equal(phoneE164, '+2347082262502');

  // Step 1: Request OTP
  const reqRes = await fetch(`${API_BASE}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ phone: phoneE164 }),
  });
  assert.equal(reqRes.status, 200, 'requestOtp should return 200');
  const reqData = await reqRes.json();
  assert.equal(reqData.expires_in, 300);

  // Step 2: Verify with Master OTP 800080
  const verifyRes = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ phone: phoneE164, code: '800080' }),
  });
  assert.equal(verifyRes.status, 200, 'verifyOtp with Master OTP should return 200');
  const verifyData = await verifyRes.json();
  assert.ok(verifyData.access_token, 'Should receive an access_token');
  assert.equal(verifyData.is_new_user, false, '07082262502 should be detected as existing user');
  assert.equal(verifyData.me.first_name, 'Munir');
  assert.equal(verifyData.me.last_name, 'Ammani');
  assert.equal(verifyData.me.area_id, 'buk-new');
});

test('3. Invalid OTP Rejection', async () => {
  const phoneE164 = '+2348104174414';
  // Request fresh OTP first
  await fetch(`${API_BASE}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ phone: phoneE164 }),
  });

  const verifyRes = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ phone: phoneE164, code: '111111' }),
  });
  assert.equal(verifyRes.status, 422, 'Invalid OTP should return 422');
  const data = await verifyRes.json();
  assert.equal(data.error.code, 'INVALID_CODE');
});
