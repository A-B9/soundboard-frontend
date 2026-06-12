import { useEffect, useState } from 'react';

/**
 * Returns a copy of `value` that only updates after the source has stopped
 * changing for `delayMs`. Each change re-arms the timer (the effect cleanup
 * cancels the previous one), so fast typing produces a single trailing
 * update instead of one per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
