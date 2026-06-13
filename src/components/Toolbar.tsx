import { SOUND_CATEGORIES, SORT_OPTIONS } from '../api/types';
import type { SortBy, SoundCategory } from '../api/types';
import './Toolbar.css';

const SORT_LABELS: Record<SortBy, string> = {
  createdAt: 'Created',
  recentUpdate: 'Updated',
  name: 'Name',
  category: 'Category',
};

interface ToolbarProps {
  keyword: string;
  category: SoundCategory | '';
  tag: string;
  sortBy: SortBy;
  ascending: boolean;
  /** True while a search keyword is active: filter/sort controls are disabled
      because the search endpoint ignores them. */
  searchMode: boolean;
  /** True in Board Mode: every control (including search) is disabled. */
  locked: boolean;
  onKeywordChange: (keyword: string) => void;
  onCategoryChange: (category: SoundCategory | '') => void;
  onTagChange: (tag: string) => void;
  onSortByChange: (sortBy: SortBy) => void;
  onAscendingToggle: () => void;
}

function Toolbar({
  keyword,
  category,
  tag,
  sortBy,
  ascending,
  searchMode,
  locked,
  onKeywordChange,
  onCategoryChange,
  onTagChange,
  onSortByChange,
  onAscendingToggle,
}: ToolbarProps) {
  // Filter/sort controls are off during search OR board lock; search itself is
  // only off during board lock.
  const filtersDisabled = searchMode || locked;
  return (
    <div className="toolbar">
      <input
        type="search"
        className="toolbar-search"
        placeholder="Search sounds…"
        value={keyword}
        maxLength={100}
        disabled={locked}
        onChange={(e) => onKeywordChange(e.target.value)}
      />
      <select
        aria-label="Filter by category"
        value={category}
        disabled={filtersDisabled}
        onChange={(e) => onCategoryChange(e.target.value as SoundCategory | '')}
      >
        <option value="">All categories</option>
        {SOUND_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        type="text"
        className="toolbar-tag"
        placeholder="Filter by tag…"
        aria-label="Filter by tag"
        value={tag}
        disabled={filtersDisabled}
        onChange={(e) => onTagChange(e.target.value)}
      />
      <select
        aria-label="Sort by"
        value={sortBy}
        disabled={filtersDisabled}
        onChange={(e) => onSortByChange(e.target.value as SortBy)}
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s} value={s}>
            Sort: {SORT_LABELS[s]}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="toolbar-direction"
        disabled={filtersDisabled}
        onClick={onAscendingToggle}
        title={ascending ? 'Ascending — click for descending' : 'Descending — click for ascending'}
      >
        {ascending ? '↑ Asc' : '↓ Desc'}
      </button>
    </div>
  );
}

export default Toolbar;
