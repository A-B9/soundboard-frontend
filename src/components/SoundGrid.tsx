import type { SoundPatch } from '../api/sounds';
import type { GetSoundResponse } from '../api/types';
import type { TileState } from '../hooks/useAudioPlayer';
import SoundTile from './SoundTile';
import './SoundGrid.css';

interface SoundGridProps {
  sounds: GetSoundResponse[];
  activeSoundId: string | null;
  isPaused: boolean;
  loadingSoundId: string | null;
  boardMode: boolean;
  hotkeys: Record<string, string>;
  onTileClick: (soundId: string) => void;
  onEditSound: (soundId: string, patch: SoundPatch) => void;
  onSetHotkey: (soundId: string, key: string) => void;
  onClearHotkey: (soundId: string) => void;
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
  const { sounds, boardMode, hotkeys, onTileClick, onEditSound, onSetHotkey, onClearHotkey } =
    props;
  return (
    <div className="sound-grid">
      {sounds.map((sound) => (
        <SoundTile
          key={sound.id}
          sound={sound}
          state={tileState(sound, props)}
          hotkey={hotkeys[sound.id]}
          boardMode={boardMode}
          onClick={onTileClick}
          onEdit={onEditSound}
          onSetHotkey={onSetHotkey}
          onClearHotkey={onClearHotkey}
        />
      ))}
    </div>
  );
}

export default SoundGrid;
