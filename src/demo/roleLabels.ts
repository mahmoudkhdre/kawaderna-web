import { DEMO_ACCOUNTS } from './session';

const ROLE_LABEL = { manager: 'المدير', hr: 'الموارد البشرية', employee: 'الموظف' } as const;

/**
 * DF-02: a visible, human label for an internal actor id (for example MGR-2001 or HR-1).
 * Identity is confirmed only for the fictional demo accounts; any other id stays hidden behind
 * a neutral label instead of leaking an internal identifier into the UI. Audit data keeps the raw id.
 */
export const actorLabel = (actorId: string): string => {
  const account = DEMO_ACCOUNTS.find(item => item.actorId === actorId);
  if (!account) return 'مستخدم النظام';
  const name = account.displayIdentity.split(' — ')[0];
  return `${ROLE_LABEL[account.persona]} (${name})`;
};
