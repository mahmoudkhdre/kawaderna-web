import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../index.css';
import { LandingPage } from '../index';

// Preview only: the CTA follows the default `demoHref="/"`, i.e. the current demo entry point.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LandingPage />
  </StrictMode>,
);
