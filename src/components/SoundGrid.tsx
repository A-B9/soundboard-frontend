import type { GetSoundResponse } from '../api/types';
import SoundTile from './SoundTile';
import './SoundGrid.css';

interface SoundGridProps {
  sounds: GetSoundResponse[];
}

function SoundGrid({ sounds }: SoundGridProps) {
  return (
    <div className="sound-grid">
      {sounds.map((sound) => (
        <SoundTile key={sound.id} sound={sound} />
      ))}
    </div>
  );
}

export default SoundGrid;
