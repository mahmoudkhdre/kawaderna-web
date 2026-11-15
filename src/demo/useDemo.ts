import { useState, useSyncExternalStore } from 'react';
import { createDemoController } from './controller';
import type { DemoStorage } from './snapshot';
import type { DemoEntry } from './ui-contract';

/** T011b: call once at the app boundary. Hydration is read-only, including StrictMode initialization.
 * Pass entry.manager/hr to the corresponding page's binding prop. Claude's shell consumes
 * DemoLoginProps, DemoShellProps, DemoToastProps; it must never instantiate another owner. */
export const useDemo = (storage?: DemoStorage | null): DemoEntry => {
  const [controller] = useState(() => createDemoController(storage));
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
};
