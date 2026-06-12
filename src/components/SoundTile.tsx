import type { GetSoundResponse } from '../api/types';
import type { TileState } from '../hooks/useAudioPlayer';
import './SoundTile.css';

interface SoundTileProps {
  sound: GetSoundResponse;
  state: TileState;
  onClick: (soundId: string) => void;
}

const STATE_BADGES: Record<Exclude<TileState, 'idle'>, string> = {
  loading: 'Loading…',
  playing: '▶ Playing',
  paused: '⏸ Paused',
};

function SoundTile({ sound, state, onClick }: SoundTileProps) {
  return (
    <button
      type="button"
      className={`sound-tile sound-tile-${state}`}
      onClick={() => onClick(sound.id)}
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
  );
}

export default SoundTile;
