// TypeScript mirrors of the backend DTOs. The backend is the source of truth;
// if a controller response changes shape, update these first.

export type SoundCategory =
  | 'BATTLE'
  | 'TRAVEL'
  | 'TAVERN'
  | 'CITY'
  | 'TENSE'
  | 'EPIC';

export const SOUND_CATEGORIES: SoundCategory[] = [
  'BATTLE',
  'TRAVEL',
  'TAVERN',
  'CITY',
  'TENSE',
  'EPIC',
];

export interface GetSoundResponse {
  id: string; // UUID
  name: string;
  description: string;
  ownedBy: string;
  category: SoundCategory | null;
  tags: string[];
  createdAt: string; // ISO-8601 instant
  recentUpdate: string | null;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface LoginResponse {
  username: string;
  token: string;
  message: string;
}

export type SortBy = 'createdAt' | 'recentUpdate' | 'name' | 'category';

export const SORT_OPTIONS: SortBy[] = [
  'createdAt',
  'recentUpdate',
  'name',
  'category',
];
