import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { listSounds, patchSound, searchSounds } from '../api/sounds';
import type { SoundPatch } from '../api/sounds';
import type {
  GetSoundResponse,
  PagedResponse,
  SortBy,
  SoundCategory,
} from '../api/types';
import { useAuth } from '../auth/AuthContext';
import Pagination from '../components/Pagination';
import SoundGrid from '../components/SoundGrid';
import Toolbar from '../components/Toolbar';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useHotkeys } from '../hooks/useHotkeys';
import './SoundsPage.css';

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 300;

// The two modes return different shapes: browse is the paged wrapper,
// search is a plain array (see IMPLEMENTATION_GUIDE.md §4/§7).
type Results =
  | { mode: 'browse'; pageData: PagedResponse<GetSoundResponse> }
  | { mode: 'search'; sounds: GetSoundResponse[] };

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

  // SoundsPage is the single owner of all query state; Toolbar and (later)
  // Pagination are dumb controls that report changes back up via callbacks.
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<SoundCategory | ''>('');
  const [tag, setTag] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(0);

  // Debounced copies drive the actual requests so fast typing fires one
  // request, not one per keystroke.
  const debouncedKeyword = useDebouncedValue(keyword, DEBOUNCE_MS);
  const debouncedTag = useDebouncedValue(tag, DEBOUNCE_MS);

  const searchMode = debouncedKeyword.trim() !== '';

  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Board Mode: lock the UI and trigger sounds by keyboard hotkeys.
  const [boardMode, setBoardMode] = useState(false);
  const { hotkeys, setHotkey, clearHotkey, soundIdForKey } = useHotkeys();

  // Only while Board Mode is on, a global key press plays its assigned sound.
  useEffect(() => {
    if (!boardMode) return;
    function handleKeyDown(event: KeyboardEvent) {
      // Leave browser/OS shortcuts alone.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const soundId = soundIdForKey(event.key);
      if (soundId) {
        event.preventDefault();
        handleTileClick(soundId);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [boardMode, soundIdForKey, handleTileClick]);

  useEffect(() => {
    let cancelled = false;
    const request: Promise<Results> = searchMode
      ? searchSounds(debouncedKeyword.trim()).then((sounds) => ({
          mode: 'search' as const,
          sounds,
        }))
      : listSounds({
          page,
          size: PAGE_SIZE,
          sortBy,
          ascending,
          category,
          tag: debouncedTag.trim(),
        }).then((pageData) => ({ mode: 'browse' as const, pageData }));

    request
      .then((next) => {
        if (!cancelled) {
          setResults(next);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Something went wrong.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    searchMode,
    debouncedKeyword,
    debouncedTag,
    category,
    sortBy,
    ascending,
    page,
  ]);

  // Filter/sort changes restart browsing from the first page. Doing it in the
  // event handlers (not an effect) keeps the state change atomic with its cause.
  function changeCategory(next: SoundCategory | '') {
    setCategory(next);
    setPage(0);
  }
  function changeTag(next: string) {
    setTag(next);
    setPage(0);
  }
  function changeSortBy(next: SortBy) {
    setSortBy(next);
    setPage(0);
  }
  function toggleAscending() {
    setAscending((prev) => !prev);
    setPage(0);
  }
  function changeKeyword(next: string) {
    setKeyword(next);
    setPage(0); // leaving search mode should land back on the first page
  }

  // Persist a category/tag edit, then patch the matching sound in local state
  // so the tile updates immediately. We apply the change we sent (not the
  // PATCH response), and only after the server confirms success.
  async function handleEditSound(id: string, patch: SoundPatch) {
    try {
      await patchSound(id, patch);
      setEditError(null);
      setResults((prev) => {
        if (prev === null) return prev;
        const update = (s: GetSoundResponse) =>
          s.id === id ? { ...s, ...patch } : s;
        return prev.mode === 'browse'
          ? {
              mode: 'browse',
              pageData: {
                ...prev.pageData,
                content: prev.pageData.content.map(update),
              },
            }
          : { mode: 'search', sounds: prev.sounds.map(update) };
      });
    } catch (err) {
      setEditError(
        err instanceof ApiError ? err.message : 'Could not update the sound.',
      );
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const sounds: GetSoundResponse[] | null =
    results === null
      ? null
      : results.mode === 'browse'
        ? results.pageData.content
        : results.sounds;
  const loading = results === null && error === null;

  return (
    <div className="sounds-page">
      <header className="sounds-header">
        <h1>Soundboard</h1>
        <div className="sounds-header-user">
          <button
            type="button"
            className={`board-toggle${boardMode ? ' is-on' : ''}`}
            aria-pressed={boardMode}
            onClick={() => setBoardMode((on) => !on)}
          >
            BOARD
          </button>
          <span>{username}</span>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="sounds-main">
        <Toolbar
          keyword={keyword}
          category={category}
          tag={tag}
          sortBy={sortBy}
          ascending={ascending}
          searchMode={searchMode}
          onKeywordChange={changeKeyword}
          onCategoryChange={changeCategory}
          onTagChange={changeTag}
          onSortByChange={changeSortBy}
          onAscendingToggle={toggleAscending}
          locked={boardMode}
        />
        {loading && <p className="sounds-status">Loading sounds…</p>}
        {!loading && error && (
          <p className="sounds-status sounds-status-error" role="alert">
            {error}
          </p>
        )}
        {playbackError && (
          <p className="sounds-status sounds-status-error" role="alert">
            {playbackError}
          </p>
        )}
        {editError && (
          <p className="sounds-status sounds-status-error" role="alert">
            {editError}
          </p>
        )}
        {!loading && !error && sounds && sounds.length === 0 && (
          <p className="sounds-status">
            {searchMode
              ? 'No sounds match your search.'
              : 'No sounds found.'}
          </p>
        )}
        {!loading && !error && sounds && sounds.length > 0 && (
          <SoundGrid
            sounds={sounds}
            activeSoundId={activeSoundId}
            isPaused={isPaused}
            loadingSoundId={loadingSoundId}
            boardMode={boardMode}
            hotkeys={hotkeys}
            onTileClick={handleTileClick}
            onEditSound={handleEditSound}
            onSetHotkey={setHotkey}
            onClearHotkey={clearHotkey}
          />
        )}
        {!loading &&
          !error &&
          !boardMode &&
          results?.mode === 'browse' &&
          results.pageData.totalPages > 1 && (
            <Pagination
              page={results.pageData.page}
              totalPages={results.pageData.totalPages}
              first={results.pageData.first}
              last={results.pageData.last}
              onPageChange={setPage}
            />
          )}
      </main>
    </div>
  );
}

export default SoundsPage;
