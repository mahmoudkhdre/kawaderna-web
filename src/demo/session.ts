import { Persona } from '../domain/leave/types';

/** Public fictional samples, never production credentials. One identity map for login and restore. */
export const DEMO_ACCOUNTS = [
  { persona: Persona.MANAGER, loginId: 'manager-demo', actorId: 'MGR-2001', displayIdentity: 'فاطمة علي' },
  { persona: Persona.HR, loginId: 'hr-demo', actorId: 'HR-1', displayIdentity: 'هند الدوسري — أخصائية موارد بشرية' },
  { persona: Persona.EMPLOYEE, loginId: 'employee-demo', actorId: 'EMP-1201', displayIdentity: 'مريم صالح' },
] as const;
export const DEMO_PASSWORD = 'Demo2026!';
export type DemoSession = (typeof DEMO_ACCOUNTS)[number];
export type DemoPersona = DemoSession['persona'];
export type LoginResult = { ok: true; session: DemoSession } | { ok: false; error: 'invalid_credentials' };

/** Stored identities must match exactly; actor/display fields are always re-derived. */
export const restoreSession = (persona: unknown, loginId: unknown): DemoSession | null => {
  const account = DEMO_ACCOUNTS.find(item => item.persona === persona && item.loginId === loginId);
  return account ? { ...account } : null;
};

/** User ID is case-sensitive and trimmed; the password is matched verbatim. */
export const authenticateDemoPersona = (loginId: string, password: string): LoginResult => {
  const account = DEMO_ACCOUNTS.find(item => item.loginId === loginId.trim());
  return account && password === DEMO_PASSWORD
    ? { ok: true, session: { ...account } }
    : { ok: false, error: 'invalid_credentials' };
};
