import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { SoundPatch } from '../api/sounds';
import { SOUND_CATEGORIES } from '../api/types';
import type { GetSoundResponse, SoundCategory } from '../api/types';
import type { TileState } from '../hooks/useAudioPlayer';
import './SoundTile.css';

interface SoundTileProps {
  sound: GetSoundResponse;
  state: TileState;
  /** Key assigned to this sound, or undefined. */
  hotkey: string | undefined;
  /** Board Mode locks clicks/editing; only hotkey playback works. */
  boardMode: boolean;
  onClick: (soundId: string) => void;
  onEdit: (soundId: string, patch: SoundPatch) => void;
  onSetHotkey: (soundId: string, key: string) => void;
  onClearHotkey: (soundId: string) => void;
}

const STATE_BADGES: Record<Exclude<TileState, 'idle'>, string> = {
  loading: 'Loading…',
  playing: '▶ Playing',
  paused: '⏸ Paused',
};

/** Friendly label for a stored key value. */
function keyLabel(key: string): string {
  if (key === ' ') return 'Space';
  return key.length === 1 ? key.toUpperCase() : key;
}

/**
 * A colour derived from the sound id — looks random across tiles but is stable
 * for a given sound, so it doesn't reshuffle on every re-render (a plain
 * Math.random() would change the colour each time React repaints the tile).
 * The text colour flips between dark and light based on the background's
 * perceived brightness so the name stays readable on any colour.
 */
function tileColours(id: string): { background: string; color: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const r = (hash >> 16) & 0xff;
  const g = (hash >> 8) & 0xff;
  const b = hash & 0xff;
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
  return {
    background: `rgb(${r}, ${g}, ${b})`,
    color: brightness > 140 ? '#1f2328' : '#ffffff',
  };
}

function SoundTile({
  sound,
  state,
  hotkey,
  boardMode,
  onClick,
  onEdit,
  onSetHotkey,
  onClearHotkey,
}: SoundTileProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [listening, setListening] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const colours = tileColours(sound.id);

  // Close the menu when clicking anywhere outside this tile.
  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  // While "listening", capture the next non-modifier key as this tile's hotkey.
  useEffect(() => {
    if (!listening) return;
    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      if (event.key === 'Escape') {
        setListening(false);
        return;
      }
      // Ignore standalone modifier presses; wait for a real key.
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      onSetHotkey(sound.id, event.key);
      setListening(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [listening, onSetHotkey, sound.id]);

  function handleCategoryChange(value: string) {
    onEdit(sound.id, { category: value === '' ? null : (value as SoundCategory) });
  }

  function handleRemoveTag(tag: string) {
    onEdit(sound.id, { tags: sound.tags.filter((t) => t !== tag) });
  }

  function handleAddTag(event: FormEvent) {
    event.preventDefault();
    const tag = newTag.trim();
    if (tag === '' || sound.tags.includes(tag)) {
      setNewTag('');
      return;
    }
    onEdit(sound.id, { tags: [...sound.tags, tag] });
    setNewTag('');
  }

  return (
    <article
      ref={rootRef}
      className={`sound-tile sound-tile-${state}${boardMode ? ' sound-tile-locked' : ''}`}
      style={colours}
    >
      <button
        type="button"
        className="sound-tile-play"
        onClick={() => onClick(sound.id)}
        disabled={boardMode}
        aria-pressed={state === 'playing'}
      >
        <span className="sound-tile-name">{sound.name}</span>
        {sound.description && (
          <span className="sound-tile-description">{sound.description}</span>
        )}
        {state !== 'idle' && (
          <span className="sound-tile-state">{STATE_BADGES[state]}</span>
        )}
        <span className="sound-tile-meta">
          {hotkey && (
            <span className="sound-tile-hotkey">⌨ {keyLabel(hotkey)}</span>
          )}
          {sound.category && (
            <span className="sound-tile-category">{sound.category}</span>
          )}
          {sound.tags.map((tag) => (
            <span key={tag} className="sound-tile-tag">
              {tag}
            </span>
          ))}
        </span>
      </button>

      {!boardMode && (
        <button
          type="button"
          className="sound-tile-menu-button"
          aria-label="Edit sound"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ⋮
        </button>
      )}

      {menuOpen && !boardMode && (
        <div className="sound-tile-menu" role="menu">
          <label className="sound-tile-menu-field">
            <span>Category</span>
            <select
              value={sound.category ?? ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">None</option>
              {SOUND_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="sound-tile-menu-field">
            <span>Tags</span>
            {sound.tags.length > 0 ? (
              <ul className="sound-tile-menu-tags">
                {sound.tags.map((tag) => (
                  <li key={tag}>
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove tag ${tag}`}
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sound-tile-menu-empty">No tags yet.</p>
            )}
            <form className="sound-tile-menu-add" onSubmit={handleAddTag}>
              <input
                type="text"
                placeholder="Add a tag…"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
              />
              <button type="submit">Add</button>
            </form>
          </div>

          <div className="sound-tile-menu-field">
            <span>Hotkey</span>
            <div className="sound-tile-menu-hotkey">
              {listening ? (
                <button
                  type="button"
                  className="sound-tile-hotkey-listening"
                  onClick={() => setListening(false)}
                >
                  Press a key… (Esc to cancel)
                </button>
              ) : (
                <button type="button" onClick={() => setListening(true)}>
                  {hotkey ? `Change (${keyLabel(hotkey)})` : 'Set hotkey'}
                </button>
              )}
              {hotkey && !listening && (
                <button
                  type="button"
                  aria-label="Clear hotkey"
                  className="sound-tile-hotkey-clear"
                  onClick={() => onClearHotkey(sound.id)}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default SoundTile;
