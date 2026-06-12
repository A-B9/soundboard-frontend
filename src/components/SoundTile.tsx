import type { GetSoundResponse } from '../api/types';
import './SoundTile.css';

interface SoundTileProps {
  sound: GetSoundResponse;
}

function SoundTile({ sound }: SoundTileProps) {
  return (
    <button type="button" className="sound-tile">
      <span className="sound-tile-name">{sound.name}</span>
      {sound.description && (
        <span className="sound-tile-description">{sound.description}</span>
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
