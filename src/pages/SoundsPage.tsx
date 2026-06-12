import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { listSounds } from '../api/sounds';
import type { GetSoundResponse, PagedResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import SoundGrid from '../components/SoundGrid';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import './SoundsPage.css';

function SoundsPage() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const {
    activeSoundId,
    isPaused,
    loadingSoundId,
    playbackError,
    handleTileClick,
  } = useAudioPlayer();

  const [pageData, setPageData] =
    useState<PagedResponse<GetSoundResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Strict Mode runs this effect twice in dev; the cancelled flag makes the
    // unmounted first run drop its response instead of racing the second.
    let cancelled = false;
    listSounds()
      .then((page) => {
        if (!cancelled) setPageData(page);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Something went wrong.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="sounds-page">
      <header className="sounds-header">
        <h1>Soundboard</h1>
        <div className="sounds-header-user">
          <span>{username}</span>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="sounds-main">
        {loading && <p className="sounds-status">Loading sounds…</p>}
        {!loading && error && (
          <p className="sounds-status sounds-status-error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && pageData && pageData.content.length === 0 && (
          <p className="sounds-status">You have no sounds yet.</p>
        )}
        {playbackError && (
          <p className="sounds-status sounds-status-error" role="alert">
            {playbackError}
          </p>
        )}
        {!loading && !error && pageData && pageData.content.length > 0 && (
          <SoundGrid
            sounds={pageData.content}
            activeSoundId={activeSoundId}
            isPaused={isPaused}
            loadingSoundId={loadingSoundId}
            onTileClick={handleTileClick}
          />
        )}
      </main>
    </div>
  );
}

export default SoundsPage;
