import { describe, expect, it } from 'vitest';
import { authenticateDemoPersona, DEMO_ACCOUNTS, DEMO_PASSWORD, restoreSession } from './session';

describe('T005 fictional identity', () => {
  it.each(DEMO_ACCOUNTS)('maps $loginId to its approved actor and display', account => {
    expect(authenticateDemoPersona(account.loginId, DEMO_PASSWORD)).toEqual({ ok: true, session: account });
    expect(restoreSession(account.persona, account.loginId)).toEqual(account);
    expect(authenticateDemoPersona(`  ${account.loginId}\t`, DEMO_PASSWORD)).toEqual({ ok: true, session: account });
  });
  it.each([
    ['MGR-2001', DEMO_PASSWORD], ['HR-1', DEMO_PASSWORD], ['EMP-1201', DEMO_PASSWORD], ['unknown', DEMO_PASSWORD],
    ['Manager-demo', DEMO_PASSWORD], ['HR-DEMO', DEMO_PASSWORD], ['', DEMO_PASSWORD],
    ['manager-demo', 'wrong'], ['hr-demo', 'demo2026!'], ['manager-demo', ` ${DEMO_PASSWORD}`],
  ])('rejects invalid credential pair %s', (id, password) => {
    expect(authenticateDemoPersona(id, password)).toEqual({ ok: false, error: 'invalid_credentials' });
  });
  it.each([
    ['manager', 'hr-demo'], ['hr', 'manager-demo'], ['hr', 'HR-1'], ['employee', 'manager-demo'],
    ['manager', 'unknown'], ['employee', 'hr-demo'], ['manager', ' manager-demo '], [null, null],
  ])('rejects invalid stored identity %s/%s', (persona, id) => expect(restoreSession(persona, id)).toBeNull());
});
