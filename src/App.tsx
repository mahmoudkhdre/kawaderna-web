import { ManagerInboxPage } from './pages/ManagerInbox/ManagerInboxPage'
import { HRFinalDecisionPage } from './pages/HRFinalDecision/HRFinalDecisionPage'
import { EmployeeLeavePage } from './pages/EmployeeLeave/EmployeeLeavePage'
import { useDemo } from './demo/useDemo'
import { DemoLogin, DemoResetConfirmation, DemoShell } from './demo/ui'
import { useEffect, useRef } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import type { DemoEntry } from './demo/ui-contract'
import { LandingPage } from './features/landing'
import { tokens } from './lib/tokens'

const returnStyle = { color: tokens.colors.primary.base, background: tokens.colors.background.primary }

function LeaveDemo({ demo }: { demo: DemoEntry }) {
  // Signing in or out replaces the whole screen, so keyboard and screen-reader users would
  // otherwise be left on <body>. Restoring a session on load must not take focus.
  const signedInAs = demo.session?.loginId ?? null
  const previousSignedIn = useRef(signedInAs)
  useEffect(() => {
    if (previousSignedIn.current === signedInAs) return
    previousSignedIn.current = signedInAs
    const target = signedInAs
      ? document.querySelector<HTMLElement>('[data-demo-shell] main h1') ?? document.querySelector<HTMLElement>('[data-demo-shell] main')
      : document.querySelector<HTMLElement>('#kd-login-title')
    if (!target) return
    target.tabIndex = -1
    target.focus({ preventScroll: true })
  }, [signedInAs])

  if (!demo.session) return <div className="demo-route"><Link className="demo-return" style={returnStyle} to="/">العودة إلى العرض التعريفي</Link><DemoLogin
    onLogin={demo.login}
    recoveryNotice={demo.recoveryNotice}
    storageNotice={demo.storageNotice}
    onDismissRecovery={demo.dismissRecovery}
  /></div>

  return <div className="demo-route demo-route--shell">
    <Link className="demo-return" style={returnStyle} to="/">العودة إلى العرض التعريفي</Link>
    <DemoShell session={demo.session} navigation={demo.navigation}
      onLogout={demo.logout} onRequestReset={demo.requestReset}
      onNotifyUnavailable={demo.notifyUnavailable} toast={demo.toast} storageNotice={demo.storageNotice}>
      {demo.manager && <ManagerInboxPage binding={demo.manager} />}
      {demo.hr && <HRFinalDecisionPage binding={demo.hr} />}
      {demo.employee && <EmployeeLeavePage binding={demo.employee} />}
    </DemoShell>
    <DemoResetConfirmation open={demo.resetRequested} onConfirm={demo.confirmReset} onCancel={demo.cancelReset} />
  </div>
}

function IntegratedExperience() {
  // Keep the in-memory owner mounted across routes, including when storage is unavailable.
  const demo = useDemo()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    // Client-side route changes need a fresh viewport and an accessible reading start.
    window.scrollTo(0, 0)
    const main = document.querySelector<HTMLElement>('main')
    if (main) {
      main.tabIndex = -1
      main.focus({ preventScroll: true })
    }
    // The Landing scrolls smoothly; an animation still running from it (e.g. focus moving to a CTA)
    // would land after the reset above. Hold the top briefly, and stop as soon as the visitor acts.
    const hold = () => { if (window.scrollY !== 0) window.scrollTo(0, 0) }
    const inputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    const release = () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', hold)
      inputs.forEach(type => window.removeEventListener(type, release))
    }
    const timer = window.setTimeout(release, 800)
    window.addEventListener('scroll', hold)
    inputs.forEach(type => window.addEventListener(type, release, { passive: true }))
    return release
  }, [pathname])
  return <Routes>
    <Route path="/" element={<LandingPage demoHref="/demo" onStartDemo={() => navigate('/demo')} contactHref={import.meta.env.VITE_BUYER_CONTACT_HREF || undefined} />} />
    <Route path="/demo" element={<LeaveDemo demo={demo} />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

function App() {
  return <BrowserRouter><IntegratedExperience /></BrowserRouter>
}

export default App
