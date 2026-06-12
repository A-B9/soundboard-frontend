import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { getAudioBlob } from '../api/sounds';

export type TileState = 'idle' | 'loading' | 'playing' | 'paused';

interface UseAudioPlayerResult {
  /** Sound currently loaded into the shared <audio> element, if any. */
  activeSoundId: string | null;
  /** True when the active sound is paused (rather than playing). */
  isPaused: boolean;
  /** Sound whose audio bytes are still being fetched, if any. */
  loadingSoundId: string | null;
  playbackError: string | null;
  handleTileClick: (soundId: string) => void;
}

/**
 * Owns the single shared <audio> element (one sound plays at a time).
 *
 * Playback works via blob URLs because the download endpoint requires the
 * Authorization header, which <audio src="http://..."> cannot send: we fetch
 * the bytes with the token, wrap them in an object URL, hand that to the
 * audio element, and revoke the URL when the sound ends or is switched.
 * Fetched blobs are cached in memory per sound id so replays skip the network.
 */
export function useAudioPlayer(): UseAudioPlayerResult {
  // The shared element lives in a ref, not state: it's mutable (we assign
  // .src, call .play()) and changing it never needs to trigger a re-render.
  // Created lazily so we don't construct a throwaway Audio on every render.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const getAudio = useCallback((): HTMLAudioElement => {
    if (audioRef.current === null) {
      audioRef.current = new Audio();
    }
    return audioRef.current;
  }, []);

  const objectUrlRef = useRef<string | null>(null);
  const blobCache = useRef(new Map<string, Blob>());
  // Latest sound the user asked for; lets a slow blob fetch detect that it
  // lost the race to a later click and silently drop its result.
  const requestedIdRef = useRef<string | null>(null);

  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [loadingSoundId, setLoadingSoundId] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    const audio = getAudio();
    const handleEnded = () => {
      releaseObjectUrl();
      setActiveSoundId(null);
      setIsPaused(false);
    };
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      releaseObjectUrl();
    };
  }, [getAudio, releaseObjectUrl]);

  /** Load (from cache or network) and start the given sound from the top. */
  async function playSound(soundId: string): Promise<void> {
    const audio = getAudio();
    requestedIdRef.current = soundId;
    setPlaybackError(null);
    audio.pause();

    let blob = blobCache.current.get(soundId);
    if (!blob) {
      setLoadingSoundId(soundId);
      try {
        blob = await getAudioBlob(soundId);
        blobCache.current.set(soundId, blob);
      } catch (err) {
        if (requestedIdRef.current === soundId) {
          setLoadingSoundId(null);
          setActiveSoundId(null);
          setPlaybackError(
            err instanceof ApiError ? err.message : 'Could not load audio.',
          );
        }
        return;
      }
      if (requestedIdRef.current !== soundId) return;
      setLoadingSoundId(null);
    }

    releaseObjectUrl();
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    audio.src = url;
    setActiveSoundId(soundId);
    setIsPaused(false);
    audio.play().catch(() => setPlaybackError('Could not play audio.'));
  }

  /** Pause the active sound, keeping its position. */
  function pause(): void {
    getAudio().pause();
    setIsPaused(true);
  }

  /** Resume the active sound from where it was paused. */
  function resume(): void {
    getAudio()
      .play()
      .catch(() => setPlaybackError('Could not play audio.'));
    setIsPaused(false);
  }

  /**
   * Decide what a click on a tile does. The states to consider:
   *  - nothing is active            → start the clicked sound
   *  - clicked sound is playing     → pause it
   *  - clicked sound is paused      → resume it
   *  - a DIFFERENT sound is active  → switch to the clicked sound
   *
   * Available: activeSoundId, isPaused (state above) and the
   * playSound / pause / resume primitives.
   *
   * TODO(human): replace this placeholder (which always restarts the clicked
   * sound from the top) with the real decision logic.
   */
  function handleTileClick(soundId: string): void {
    // These two references only silence the unused-variable compiler checks
    // until your implementation calls pause()/resume() — delete them then.
    void pause;
    void resume;
    void playSound(soundId);
  }

  return {
    activeSoundId,
    isPaused,
    loadingSoundId,
    playbackError,
    handleTileClick,
  };
}
