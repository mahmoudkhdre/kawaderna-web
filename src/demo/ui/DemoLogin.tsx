import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Crown, Info, X } from 'lucide-react';
import type { DemoLoginProps } from '../ui-contract';
import { DEMO_COPY } from '../copy';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../session';
import { Persona } from '../../domain/leave/types';

/** Shown in journey order (Employee → Manager → HR); `DEMO_ACCOUNTS` keeps its own order for state and tests. */
const JOURNEY_ORDER = [Persona.EMPLOYEE, Persona.MANAGER, Persona.HR].map(persona => DEMO_ACCOUNTS.find(account => account.persona === persona)!);
import { LOGIN_TEXT } from './text';
import './demo-ui.css';

export const DemoLogin = ({ onLogin, recoveryNotice, storageNotice, onDismissRecovery }: DemoLoginProps) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = onLogin(loginId, password);
    if (!result.ok) {
      setPassword('');
      setFailed(true);
      passwordRef.current?.focus();
    }
  };
  const quickFill = (id: string) => { setLoginId(id); setPassword(DEMO_PASSWORD); setFailed(false); };

  return (
    <div className="kd kd-login" dir="rtl" data-demo-login="true">
      <div className="kd-login__col">
        {recoveryNotice && (
          <p className="kd-notice" role="status" data-recovery-notice="true">
            <Info size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
            <span className="kd-notice__text">{recoveryNotice}</span>
            <button type="button" className="kd-iconbtn" aria-label={DEMO_COPY.close} onClick={onDismissRecovery}><X size={16} aria-hidden="true" /></button>
          </p>
        )}
        {storageNotice && (
          <p className="kd-notice" role="status" data-storage-notice="true">
            <Info size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
            <span className="kd-notice__text">{storageNotice}</span>
          </p>
        )}
        <main className="kd-card" aria-labelledby="kd-login-title">
          <div className="kd-card__head">
            <span className="kd-logo" style={{ width: 64, height: 64 }} aria-hidden="true"><Crown size={48} /></span>
            <h1 id="kd-login-title" className="kd-card__title">{LOGIN_TEXT.title}</h1>
            <p className="kd-card__desc">{LOGIN_TEXT.product}</p>
          </div>
          <form className="kd-form" onSubmit={submit} noValidate>
            <p className="kd-notice" data-demo-disclosure="true">
              <Info size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
              <span className="kd-notice__text">{DEMO_COPY.disclosure}</span>
            </p>
            <div className="kd-field">
              <label className="kd-label" htmlFor="kd-login-id">{LOGIN_TEXT.userId}</label>
              <input id="kd-login-id" name="loginId" className="kd-input" type="text" dir="ltr" value={loginId}
                placeholder={LOGIN_TEXT.userIdPlaceholder} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                aria-invalid={failed} aria-describedby={failed ? 'kd-login-error' : undefined}
                onChange={e => { setLoginId(e.target.value); if (failed) setFailed(false); }} />
            </div>
            <div className="kd-field">
              <label className="kd-label" htmlFor="kd-login-password">{LOGIN_TEXT.password}</label>
              <input id="kd-login-password" name="password" ref={passwordRef} className="kd-input" type="password" dir="ltr" value={password}
                placeholder={LOGIN_TEXT.passwordPlaceholder} autoComplete="off"
                aria-invalid={failed} aria-describedby={failed ? 'kd-login-error' : undefined}
                onChange={e => { setPassword(e.target.value); if (failed) setFailed(false); }} />
            </div>
            {failed && <p id="kd-login-error" className="kd-error" role="alert">{DEMO_COPY.invalidLogin}</p>}
            <button type="submit" className="kd-btn kd-btn--primary">{LOGIN_TEXT.submit}</button>
          </form>
          <section className="kd-demo" aria-labelledby="kd-demo-title" data-demo-accounts="true">
            <h2 id="kd-demo-title" className="kd-demo__title">{LOGIN_TEXT.accounts}</h2>
            {JOURNEY_ORDER.map(account => (
              <div key={account.loginId} className="kd-demo__item" data-demo-account={account.loginId}>
                <div className="kd-demo__info">
                  <span className="kd-demo__name">{account.displayIdentity}</span>
                  <span className="kd-demo__cred">{LOGIN_TEXT.userId_label} <bdi className="kd-ltr">{account.loginId}</bdi></span>
                  <span className="kd-demo__cred">{LOGIN_TEXT.password_label} <bdi className="kd-ltr">{DEMO_PASSWORD}</bdi></span>
                </div>
                <button type="button" className="kd-btn kd-btn--secondary kd-btn--sm" data-quick-fill={account.loginId}
                  aria-label={`${LOGIN_TEXT.quickFill[account.persona]} — ${account.displayIdentity}`}
                  onClick={() => quickFill(account.loginId)}>
                  {LOGIN_TEXT.quickFill[account.persona]}
                </button>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
};
