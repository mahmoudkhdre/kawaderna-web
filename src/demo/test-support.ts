import type { DemoStorage } from './snapshot';

export const memoryStorage = (): DemoStorage & { values: Map<string, string>; writes: () => number } => {
  const values = new Map<string, string>();
  let writes = 0;
  return {
    values, writes: () => writes,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { writes++; values.set(key, value); },
    removeItem: key => { writes++; values.delete(key); },
  };
};
