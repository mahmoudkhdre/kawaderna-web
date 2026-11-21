import { z } from 'zod';
import { getSessionStorage } from '../snapshot';
import type { DemoStorage } from '../snapshot';
import type { GuideStored } from './types';

/** Separate from the demo snapshot key on purpose: Reset clears this one explicitly, nothing else shares it. */
export const GUIDE_STORAGE_KEY = 'kawaderna.demo.guide.v1';

export const DEFAULT_GUIDE: GuideStored = { v: 1, mode: null, requestId: null, collapsed: false };

const schema = z.strictObject({
  v: z.literal(1),
  mode: z.enum(['guided', 'free']).nullable(),
  requestId: z.string().regex(/^LV-2026-\d{1,6}$/).nullable(),
  collapsed: z.boolean(),
});

/** Any problem (no storage, throw, bad JSON, wrong shape, extra fields) falls back to "nothing chosen". */
export const loadGuide = (storage: DemoStorage | null = getSessionStorage()): GuideStored => {
  try {
    const raw = storage?.getItem(GUIDE_STORAGE_KEY);
    if (!raw) return DEFAULT_GUIDE;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_GUIDE;
  } catch {
    return DEFAULT_GUIDE;
  }
};

export const saveGuide = (state: GuideStored, storage: DemoStorage | null = getSessionStorage()): boolean => {
  try {
    if (!storage) return false;
    storage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};

export const clearGuideStorage = (storage: DemoStorage | null = getSessionStorage()): boolean => {
  try {
    if (!storage) return false;
    storage.removeItem(GUIDE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};
