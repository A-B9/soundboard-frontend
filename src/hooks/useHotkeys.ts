import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'soundboard.hotkeys';

// Map of soundId -> assigned key. Persisted in localStorage (per-device); there
// is no backend field for hotkeys in v1.
type HotkeyMap = Record<string, string>;

/** Canonical form so 'R' and 'r' match: letters/digits lowercased. */
export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

function load(): HotkeyMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as HotkeyMap) : {};
  } catch {
    return {};
  }
}

interface UseHotkeysResult {
  hotkeys: HotkeyMap;
  setHotkey: (soundId: string, key: string) => void;
  clearHotkey: (soundId: string) => void;
  soundIdForKey: (key: string) => string | undefined;
}

export function useHotkeys(): UseHotkeysResult {
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hotkeys));
  }, [hotkeys]);

  const setHotkey = useCallback((soundId: string, key: string) => {
    const normalized = normalizeKey(key);
    setHotkeys((prev) => {
      const next: HotkeyMap = {};
      // Drop any other sound that currently owns this key, so a key maps to at
      // most one sound (the new assignment steals it).
      for (const [id, k] of Object.entries(prev)) {
        if (k !== normalized) next[id] = k;
      }
      next[soundId] = normalized;
      return next;
    });
  }, []);

  const clearHotkey = useCallback((soundId: string) => {
    setHotkeys((prev) => {
      if (!(soundId in prev)) return prev;
      const next = { ...prev };
      delete next[soundId];
      return next;
    });
  }, []);

  const soundIdForKey = useCallback(
    (key: string): string | undefined => {
      const normalized = normalizeKey(key);
      return Object.keys(hotkeys).find((id) => hotkeys[id] === normalized);
    },
    [hotkeys],
  );

  return { hotkeys, setHotkey, clearHotkey, soundIdForKey };
}
