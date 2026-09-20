// Run with: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCookie, decodeConsent, encodeConsent, readCookie, type ConsentRecord } from '../src/consent/consentCodec.ts';

const record: ConsentRecord = { v: 1, ts: 1_700_000_000_000, preferences: true, analytics: false };

test('round trips a valid record', () => {
  assert.deepEqual(decodeConsent(encodeConsent(record), 1), record);
});

test('treats missing, empty and garbage values as "no choice made"', () => {
  for (const bad of [null, undefined, '', 'not json', '%7B', 'null', '123', '%22str%22', '%5B%5D']) {
    assert.equal(decodeConsent(bad, 1), null, String(bad));
  }
});

test('rejects wrong versions, non-boolean choices and bad timestamps', () => {
  const enc = (o: object) => encodeURIComponent(JSON.stringify(o));
  assert.equal(decodeConsent(enc({ ...record, v: 2 }), 1), null);
  assert.equal(decodeConsent(enc({ ...record, analytics: 'yes' }), 1), null);
  assert.equal(decodeConsent(enc({ ...record, preferences: 1 }), 1), null);
  assert.equal(decodeConsent(enc({ ...record, ts: 'now' }), 1), null);
  assert.equal(decodeConsent(enc({ v: 1, preferences: true }), 1), null);
});

test('ignores unexpected extra fields instead of trusting them', () => {
  const tampered = encodeURIComponent(JSON.stringify({ ...record, admin: true, essential: false }));
  assert.deepEqual(decodeConsent(tampered, 1), record);
});

test('readCookie finds the right cookie among several', () => {
  assert.equal(readCookie('a=1; bs_consent=xyz; b=2', 'bs_consent'), 'xyz');
  assert.equal(readCookie('a=1; b=2', 'bs_consent'), null);
  assert.equal(readCookie('bs_consent_other=1', 'bs_consent'), null);
});

test('cookie is first-party, SameSite=Lax, expiring, and Secure on https only', () => {
  const secure = buildCookie('bs_consent', record, { secure: true, maxAgeSeconds: 100 });
  const plain = buildCookie('bs_consent', record, { secure: false, maxAgeSeconds: 100 });
  for (const cookie of [secure, plain]) {
    assert.match(cookie, /Path=\//);
    assert.match(cookie, /Max-Age=100/);
    assert.match(cookie, /SameSite=Lax/);
  }
  assert.match(secure, /; Secure$/);
  assert.doesNotMatch(plain, /Secure/);
  assert.doesNotMatch(secure, /Domain=/);
});
