import type { GetSoundResponse } from '../api/types';
import type { TileState } from '../hooks/useAudioPlayer';
import SoundTile from './SoundTile';
import './SoundGrid.css';

interface SoundGridProps {
  sounds: GetSoundResponse[];
  activeSoundId: string | null;
  isPaused: boolean;
  loadingSoundId: string | null;
  onTileClick: (soundId: string) => void;
}

function tileState(
  sound: GetSoundResponse,
  { activeSoundId, isPaused, loadingSoundId }: SoundGridProps,
): TileState {
  if (sound.id === loadingSoundId) return 'loading';
  if (sound.id === activeSoundId) return isPaused ? 'paused' : 'playing';
  return 'idle';
}

function SoundGrid(props: SoundGridProps) {
  const { sounds, onTileClick } = props;
  return (
    <div className="sound-grid">
      {sounds.map((sound) => (
        <SoundTile
          key={sound.id}
          sound={sound}
          state={tileState(sound, props)}
          onClick={onTileClick}
        />
      ))}
    </div>
  );
}

export default SoundGrid;
